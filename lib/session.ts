// Fake session: a single cookie holding the current user's id.
// No verification, no expiry, no JWT — per CLAUDE.md §14.

import { cookies } from "next/headers";

const COOKIE_NAME = "cg_session";

export async function setSession(userId: string): Promise<void> {
  const c = await cookies();
  c.set(COOKIE_NAME, userId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function clearSession(): Promise<void> {
  const c = await cookies();
  c.delete(COOKIE_NAME);
}

export async function getSessionUserId(): Promise<string | null> {
  const c = await cookies();
  return c.get(COOKIE_NAME)?.value ?? null;
}
