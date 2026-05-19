// Demo-only: add a single other cluster member's confirmation to a chosen time.
// Lets you tick the count up step-by-step (1/3 → 2/3 → 3/3 fires) without juggling browsers.

import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/session";
import { getEvent, setEvent, getCluster } from "@/lib/store";

const QUORUM = 3;

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { id } = await ctx.params;
  const event = await getEvent(id);
  if (!event) return NextResponse.json({ error: "Event not found." }, { status: 404 });
  if (event.status !== "proposed") return NextResponse.json({ ok: true, event });

  const body = await req.json().catch(() => ({}));
  const datetime = typeof body.datetime === "string" ? body.datetime : null;
  if (!datetime) return NextResponse.json({ error: "datetime required" }, { status: 400 });

  const cluster = await getCluster(event.cluster_id);
  if (!cluster) return NextResponse.json({ error: "Cluster missing." }, { status: 404 });

  const target = event.time_options.find((t) => t.datetime === datetime);
  if (!target) return NextResponse.json({ error: "Time not found." }, { status: 404 });

  // Pick the first cluster member who isn't the caller, hasn't declined, and isn't already confirmed on this time.
  const next = cluster.member_ids.find(
    (mid) =>
      mid !== userId &&
      !event.declined.includes(mid) &&
      !target.confirmations.includes(mid),
  );
  if (!next) {
    return NextResponse.json({ ok: true, event, note: "No more eligible cluster members to confirm." });
  }
  target.confirmations.push(next);

  if (target.confirmations.length >= QUORUM) {
    event.time_options = [target];
    event.status = "fired";
  }
  await setEvent(event);
  return NextResponse.json({ ok: true, event });
}
