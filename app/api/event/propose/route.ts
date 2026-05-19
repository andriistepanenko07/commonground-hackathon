import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/session";
import {
  getCluster,
  allClusters,
  allUsers,
  allEvents,
  setEvent,
  setCluster,
  venues,
  cityEvents,
} from "@/lib/store";
import { propose, proposalToEvent } from "@/lib/agent3";

export async function POST(req: Request) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const explicitClusterId = typeof body.cluster_id === "string" ? body.cluster_id : null;

  // Find the cluster either by explicit id or by the user's current active membership.
  let cluster;
  if (explicitClusterId) {
    cluster = await getCluster(explicitClusterId);
  } else {
    const all = await allClusters();
    cluster = all.find((c) => c.member_ids.includes(userId) && c.status !== "dissolved");
  }

  if (!cluster) return NextResponse.json({ error: "No cluster to propose for." }, { status: 404 });

  // Don't re-propose if there's already a live event for this cluster.
  const eventsAll = await allEvents();
  const existing = eventsAll.find((e) => e.cluster_id === cluster.id && e.status !== "cancelled");
  if (existing) return NextResponse.json({ ok: true, event: existing, cluster });

  const usersAll = await allUsers();
  const userIndex = new Map(usersAll.map((u) => [u.id, u]));
  const members = cluster.member_ids
    .map((id) => userIndex.get(id))
    .filter((u): u is NonNullable<typeof u> => !!u);

  const proposal = await propose({
    cluster,
    members,
    cityEvents,
    venues,
  });
  if (!proposal) {
    return NextResponse.json({ error: "Could not produce a proposal." }, { status: 500 });
  }

  const event = proposalToEvent(proposal, cluster.id);
  await setEvent(event);
  cluster.status = "active";
  await setCluster(cluster);

  return NextResponse.json({ ok: true, event, cluster, fallback: proposal.fallback });
}
