import { NextResponse } from "next/server";
import {
  getUserById,
  deleteUser,
  deletePasswordByEmail,
  deleteOnboarding,
  allClusters,
  setCluster,
  setUser,
  allContacts,
  setContacts,
} from "@/lib/store";
import { clearSession, getSessionUserId } from "@/lib/session";

export async function POST() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const user = await getUserById(userId);
  await deleteUser(userId);
  if (user) await deletePasswordByEmail(user.email);
  await deleteOnboarding(userId);

  // Remove the user from any cluster they're in.
  const clusters = await allClusters();
  for (const c of clusters) {
    if (c.member_ids.includes(userId)) {
      c.member_ids = c.member_ids.filter((id) => id !== userId);
      if (c.member_ids.length < 3) {
        // Cluster is no longer viable — dissolve and free remaining members.
        for (const mid of c.member_ids) {
          const m = await getUserById(mid);
          if (m) {
            m.in_active_cluster = false;
            await setUser(m);
          }
        }
        c.status = "dissolved";
      }
      await setCluster(c);
    }
  }

  const contacts = await allContacts();
  const nextContacts = contacts.filter(
    (c) => c.from_user_id !== userId && c.to_user_id !== userId,
  );
  if (nextContacts.length !== contacts.length) await setContacts(nextContacts);

  await clearSession();
  return NextResponse.json({ ok: true, redirect: "/" });
}
