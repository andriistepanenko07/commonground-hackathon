// Demo-only: auto-confirm two other cluster members on the current user's chosen time so the
// quorum fires from a single browser. Lets the pitch demo show event-lock without juggling sessions.

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

  // Make sure the caller is in this time's confirmations first.
  for (const t of event.time_options) t.confirmations = t.confirmations.filter((u) => u !== userId);
  target.confirmations.push(userId);

  // Pick up to (QUORUM - 1) other cluster members who haven't declined, add them to this time.
  const others = cluster.member_ids
    .filter((mid) => mid !== userId && !event.declined.includes(mid) && !target.confirmations.includes(mid))
    .slice(0, QUORUM - 1);
  for (const mid of others) target.confirmations.push(mid);

  if (target.confirmations.length >= QUORUM) {
    event.time_options = [target];
    event.status = "fired";
  }
  await setEvent(event);
  return NextResponse.json({ ok: true, event });
}
