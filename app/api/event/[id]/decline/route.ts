import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/session";
import { getEvent, setEvent } from "@/lib/store";

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { id } = await ctx.params;
  const event = await getEvent(id);
  if (!event) return NextResponse.json({ error: "Event not found." }, { status: 404 });

  // Remove from all confirmations.
  for (const t of event.time_options) {
    t.confirmations = t.confirmations.filter((u) => u !== userId);
  }
  if (!event.declined.includes(userId)) event.declined.push(userId);

  await setEvent(event);
  return NextResponse.json({ ok: true, event });
}
