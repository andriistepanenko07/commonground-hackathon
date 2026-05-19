// Demo helper: marks a fired event as completed so the Agent 4 follow-up screen can show.
// In production this happens via a background timer once the event datetime has passed.
import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/session";
import { store } from "@/lib/store";

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const { id } = await ctx.params;
  const event = store.events.get(id);
  if (!event) return NextResponse.json({ error: "Event not found." }, { status: 404 });
  if (event.status === "completed") return NextResponse.json({ ok: true, event });
  event.status = "completed";
  store.events.set(id, event);
  return NextResponse.json({ ok: true, event });
}
