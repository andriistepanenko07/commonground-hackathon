import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/session";
import { store } from "@/lib/store";
import { findCluster } from "@/lib/agent2";
import { propose, proposalToEvent } from "@/lib/agent3";

const MAX_ACTIVE_CLUSTERS_PER_USER = 3;

export async function POST(req: Request) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const seedUser = store.users.get(userId);
  if (!seedUser) return NextResponse.json({ error: "User not found." }, { status: 404 });
  if (!seedUser.profile_complete) {
    return NextResponse.json({ error: "Profile not complete yet." }, { status: 400 });
  }

  // Body is optional — the original Now-tab button posts with no body.
  const body = await req.json().catch(() => ({}));
  const preferredTags: string[] = Array.isArray(body?.preferred_tags)
    ? body.preferred_tags.filter((t: unknown): t is string => typeof t === "string")
    : [];

  // Multi-cluster: derive the user's active clusters from the store (in_active_cluster boolean
  // is no longer authoritative — see lib/types.ts comment).
  const myActiveClusters = [...store.clusters.values()].filter(
    (c) => c.member_ids.includes(userId) && c.status !== "dissolved",
  );

  if (myActiveClusters.length >= MAX_ACTIVE_CLUSTERS_PER_USER) {
    return NextResponse.json({
      ok: false,
      cluster: null,
      error: `You're already in ${MAX_ACTIVE_CLUSTERS_PER_USER} groups — finish a meetup first.`,
    });
  }

  // Don't re-match anyone the user is already grouped with.
  const excludeUserIds = [...new Set(myActiveClusters.flatMap((c) => c.member_ids))];

  const candidates = [...store.users.values()];
  const cluster = findCluster(seedUser, candidates, {
    preferredTags,
    excludeUserIds,
  });
  if (!cluster) {
    return NextResponse.json({
      ok: false,
      cluster: null,
      error: "No new matches in your city right now — try different preferences or check back soon.",
    });
  }

  store.clusters.set(cluster.id, cluster);
  // We intentionally don't flip in_active_cluster — it's legacy. Active-cluster membership is
  // derived from store.clusters now.

  // Immediately run Agent 3 so the user lands in Now → forming → active in one step.
  const members = cluster.member_ids
    .map((id) => store.users.get(id))
    .filter((u): u is NonNullable<typeof u> => !!u);

  // Dedup: don't propose an activity that's already on the user's plate from another cluster.
  const excludeActivityTitles = new Set(
    [...store.events.values()]
      .filter(
        (e) =>
          e.status !== "cancelled" &&
          myActiveClusters.some((c) => c.id === e.cluster_id),
      )
      .map((e) => e.activity),
  );

  const proposal = await propose(
    {
      cluster,
      members,
      cityEvents: store.cityEvents,
      venues: store.venues,
    },
    { excludeActivityTitles },
  );
  let event = null;
  if (proposal) {
    event = proposalToEvent(proposal, cluster.id);
    store.events.set(event.id, event);
    cluster.status = "active";
    store.clusters.set(cluster.id, cluster);
  }

  return NextResponse.json({ ok: true, cluster, event });
}
