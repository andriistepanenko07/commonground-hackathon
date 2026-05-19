import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/session";
import { allContacts, setContacts } from "@/lib/store";
import type { Contact } from "@/lib/types";

export async function POST(req: Request) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const toId = typeof body.to_user_id === "string" ? body.to_user_id : null;
  const eventId = typeof body.via_event_id === "string" ? body.via_event_id : null;
  if (!toId || !eventId) return NextResponse.json({ error: "to_user_id and via_event_id required" }, { status: 400 });

  const contacts = await allContacts();

  const already = contacts.find(
    (c) => c.from_user_id === userId && c.to_user_id === toId && c.via_event_id === eventId,
  );
  if (already) return NextResponse.json({ ok: true, contact: already });

  const isFirstPickByMeOnEvent = !contacts.some(
    (c) => c.from_user_id === userId && c.via_event_id === eventId,
  );

  const contact: Contact = {
    id: `ct-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    from_user_id: userId,
    to_user_id: toId,
    via_event_id: eventId,
  };
  const next = [...contacts, contact];

  // Demo: one seeded cluster-mate auto-picks the user back, so the reciprocal
  // "you both said yes" state is visible on stage. Fires only for the user's
  // first pick on this event, so a second pick lands in the realistic
  // "waiting on them" state.
  let reciprocal: Contact | null = null;
  if (isFirstPickByMeOnEvent) {
    const alreadyReciprocal = contacts.find(
      (c) => c.from_user_id === toId && c.to_user_id === userId && c.via_event_id === eventId,
    );
    if (!alreadyReciprocal) {
      reciprocal = {
        id: `ct-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}-r`,
        from_user_id: toId,
        to_user_id: userId,
        via_event_id: eventId,
      };
      next.push(reciprocal);
    }
  }

  await setContacts(next);
  return NextResponse.json({ ok: true, contact, reciprocal });
}
