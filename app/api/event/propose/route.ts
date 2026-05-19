import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/session";
import { store } from "@/lib/store";
import { propose, proposalToEvent } from "@/lib/agent3";

export async function POST(req: Request) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const explicitClusterId = typeof body.cluster_id === "string" ? body.cluster_id : null;

  // Find the cluster either by explicit id or by the user's current active membership.
  const cluster = explicitClusterId
    ? store.clusters.get(explicitClusterId)
    : [...store.clusters.values()].find((c) => c.member_ids.includes(userId) && c.status !== "dissolved");

  if (!cluster) return NextResponse.json({ error: "No cluster to propose for." }, { status: 404 });

  // Don't re-propose if there's already a live event for this cluster.
  const existing = [...store.events.values()].find((e) => e.cluster_id === cluster.id && e.status !== "cancelled");
  if (existing) return NextResponse.json({ ok: true, event: existing, cluster });

  const members = cluster.member_ids
    .map((id) => store.users.get(id))
    .filter((u): u is NonNullable<typeof u> => !!u);

  const proposal = await propose({
    cluster,
    members,
    cityEvents: store.cityEvents,
    venues: store.venues,
  });
  if (!proposal) {
    return NextResponse.json({ error: "Could not produce a proposal." }, { status: 500 });
  }

  const event = proposalToEvent(proposal, cluster.id);
  store.events.set(event.id, event);
  cluster.status = "active";
  store.clusters.set(cluster.id, cluster);

  return NextResponse.json({ ok: true, event, cluster, fallback: proposal.fallback });
}
