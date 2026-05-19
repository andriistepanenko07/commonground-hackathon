import { NextResponse } from "next/server";
import { createNewUser, findUserByEmail } from "@/lib/store";
import { setSession } from "@/lib/session";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password required." }, { status: 400 });
  }
  if (findUserByEmail(email)) {
    return NextResponse.json({ error: "That email is already in use — try logging in." }, { status: 409 });
  }

  const user = createNewUser(email, password);
  await setSession(user.id);
  return NextResponse.json({ ok: true, redirect: "/onboarding/chat" });
}
