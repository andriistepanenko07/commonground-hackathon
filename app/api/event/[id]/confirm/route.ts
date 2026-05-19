import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/session";
import { store } from "@/lib/store";

const QUORUM = 3;

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { id } = await ctx.params;
  const event = store.events.get(id);
  if (!event) return NextResponse.json({ error: "Event not found." }, { status: 404 });
  if (event.status !== "proposed") {
    return NextResponse.json({ error: "Event is no longer open." }, { status: 409 });
  }

  const body = await req.json().catch(() => ({}));
  const datetime = typeof body.datetime === "string" ? body.datetime : null;
  if (!datetime) return NextResponse.json({ error: "datetime required" }, { status: 400 });

  // Move the user to this time option — they can only be confirmed on one time at a time.
  for (const t of event.time_options) {
    t.confirmations = t.confirmations.filter((id) => id !== userId);
  }
  const target = event.time_options.find((t) => t.datetime === datetime);
  if (!target) return NextResponse.json({ error: "Time option not found." }, { status: 404 });
  target.confirmations.push(userId);

  // Quorum check.
  if (target.confirmations.length >= QUORUM) {
    event.time_options = [target]; // drop the others
    event.status = "fired";
  }
  // Also lift the declined flag if they're confirming.
  event.declined = event.declined.filter((id) => id !== userId);

  store.events.set(id, event);
  return NextResponse.json({ ok: true, event });
}
