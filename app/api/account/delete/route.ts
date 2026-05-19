import { NextResponse } from "next/server";
import { store } from "@/lib/store";
import { clearSession, getSessionUserId } from "@/lib/session";

export async function POST() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  store.users.delete(userId);
  store.passwords.delete(userId);
  store.onboarding.delete(userId);
  // Remove the user from any cluster they're in.
  for (const c of [...store.clusters.values()]) {
    if (c.member_ids.includes(userId)) {
      c.member_ids = c.member_ids.filter((id) => id !== userId);
      if (c.member_ids.length < 3) {
        // Cluster is no longer viable — dissolve and free remaining members.
        for (const mid of c.member_ids) {
          const m = store.users.get(mid);
          if (m) {
            m.in_active_cluster = false;
            store.users.set(mid, m);
          }
        }
        c.status = "dissolved";
      }
      store.clusters.set(c.id, c);
    }
  }
  store.contacts = store.contacts.filter((c) => c.from_user_id !== userId && c.to_user_id !== userId);
  await clearSession();
  return NextResponse.json({ ok: true, redirect: "/" });
}
