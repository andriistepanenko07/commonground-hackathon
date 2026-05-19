import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/session";
import { getEvent, setEvent } from "@/lib/store";

const MAX_TIME_OPTIONS = 3;

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { id } = await ctx.params;
  const event = await getEvent(id);
  if (!event) return NextResponse.json({ error: "Event not found." }, { status: 404 });
  if (event.status !== "proposed") {
    return NextResponse.json({ error: "Event is no longer open." }, { status: 409 });
  }

  const body = await req.json().catch(() => ({}));
  const datetime = typeof body.datetime === "string" ? body.datetime : null;
  if (!datetime) return NextResponse.json({ error: "datetime required" }, { status: 400 });

  if (event.time_options.length >= MAX_TIME_OPTIONS) {
    return NextResponse.json({ error: "Three time options already proposed." }, { status: 409 });
  }
  if (event.time_options.some((t) => t.datetime === datetime)) {
    return NextResponse.json({ error: "That time is already on the list." }, { status: 409 });
  }

  event.time_options.push({ datetime, confirmations: [userId] });
  // Suggesting a new time also confirms the suggester for it; clear any old confirmation.
  for (const t of event.time_options.slice(0, -1)) {
    t.confirmations = t.confirmations.filter((u) => u !== userId);
  }
  event.declined = event.declined.filter((u) => u !== userId);

  await setEvent(event);
  return NextResponse.json({ ok: true, event });
}
