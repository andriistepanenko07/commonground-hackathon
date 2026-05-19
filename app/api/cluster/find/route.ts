import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/session";
import {
  getUserById,
  allUsers,
  allClusters,
  allEvents,
  setCluster,
  setEvent,
  venues,
  cityEvents,
} from "@/lib/store";
import { redis } from "@/lib/redis";
import { findCluster } from "@/lib/agent2";
import { propose, proposalToEvent } from "@/lib/agent3";

const MAX_ACTIVE_CLUSTERS_PER_USER = 3;

export async function POST(req: Request) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  // Race-protect: a double-click can otherwise create two clusters and burn through the cap.
  // 5-second TTL self-heals if the handler crashes.
  const lock = await redis.set(`cg:lock:cluster-find:${userId}`, "1", { nx: true, ex: 5 });
  if (!lock) {
    return NextResponse.json({
      ok: false,
      cluster: null,
      busy: true,
      error: "Hold on — we're still finding your group.",
    });
  }

  const seedUser = await getUserById(userId);
  if (!seedUser) return NextResponse.json({ error: "User not found." }, { status: 404 });
  if (!seedUser.profile_complete) {
    return NextResponse.json({ error: "Profile not complete yet." }, { status: 400 });
  }

  // Body is optional — the original Now-tab button posts with no body.
  const body = await req.json().catch(() => ({}));
  const preferredTags: string[] = Array.isArray(body?.preferred_tags)
    ? body.preferred_tags.filter((t: unknown): t is string => typeof t === "string")
    : [];

  // Batch hot-path reads. Three Redis round-trips total, run in parallel.
  const [clustersAll, usersAll, eventsAll] = await Promise.all([
    allClusters(),
    allUsers(),
    allEvents(),
  ]);

  // Multi-cluster: derive the user's active clusters from the store (in_active_cluster boolean
  // is no longer authoritative — see lib/types.ts comment).
  const myActiveClusters = clustersAll.filter(
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

  const cluster = findCluster(seedUser, usersAll, {
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

  await setCluster(cluster);

  // Immediately run Agent 3 so the user lands in Now → forming → active in one step.
  const userIndex = new Map(usersAll.map((u) => [u.id, u]));
  const members = cluster.member_ids
    .map((id) => userIndex.get(id))
    .filter((u): u is NonNullable<typeof u> => !!u);

  // Dedup: don't propose an activity that's already on the user's plate from another cluster.
  const excludeActivityTitles = new Set(
    eventsAll
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
      cityEvents,
      venues,
    },
    { excludeActivityTitles },
  );
  let event = null;
  if (proposal) {
    event = proposalToEvent(proposal, cluster.id);
    await setEvent(event);
    cluster.status = "active";
    await setCluster(cluster);
  }

  return NextResponse.json({ ok: true, cluster, event });
}
