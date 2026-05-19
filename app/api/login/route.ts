import { NextResponse } from "next/server";
import { findUserByEmail } from "@/lib/store";
import { setSession } from "@/lib/session";

// Fake auth: any password works for an existing email. Seed users get accepted with any password
// so the demo can sign in as Maya without us shipping passwords for them.
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const email = typeof body.email === "string" ? body.email.trim() : "";
  if (!email) {
    return NextResponse.json({ error: "Email required." }, { status: 400 });
  }
  const user = await findUserByEmail(email);
  if (!user) {
    return NextResponse.json({ error: "No account found with that email." }, { status: 404 });
  }
  await setSession(user.id);
  const redirect = user.profile_complete ? "/now" : "/onboarding/chat";
  return NextResponse.json({ ok: true, redirect });
}
