// API-side data fetch for the /events/[id]/followup page. See /api/now-data for context.

import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/session";
import { store, LAMBDA_ID } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ redirect: "/login" }, { status: 401 });

  const { id } = await ctx.params;
  const event = store.events.get(id);
  if (!event) return NextResponse.json({ error: "Event not found." }, { status: 404 });

  const cluster = store.clusters.get(event.cluster_id);
  if (!cluster || !cluster.member_ids.includes(userId)) {
    return NextResponse.json({ error: "Not a member of this cluster." }, { status: 404 });
  }

  const others = cluster.member_ids
    .filter((mid) => mid !== userId)
    .map((mid) => store.users.get(mid))
    .filter((u): u is NonNullable<typeof u> => !!u)
    .map((u) => ({ id: u.id, display_name: u.display_name }));

  const pickedIds = store.contacts
    .filter((c) => c.from_user_id === userId && c.via_event_id === id)
    .map((c) => c.to_user_id);
  const pickedBackIds = new Set(
    store.contacts
      .filter((c) => c.to_user_id === userId && c.via_event_id === id)
      .map((c) => c.from_user_id),
  );
  const mutualIds = pickedIds.filter((oid) => pickedBackIds.has(oid));

  console.log(
    `[followup-data] lambda=${LAMBDA_ID} eventId=${id} clusterMembers=${cluster.member_ids.length} contacts=${store.contacts.length}`,
  );

  return NextResponse.json({
    eventActivity: event.activity,
    others,
    pickedIds,
    mutualIds,
  });
}
