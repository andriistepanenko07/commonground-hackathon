// Demo-only: fast sign-in as the pre-seeded demo user so the pitch flow can skip the chat
// when the live API is unavailable or speed matters. CLAUDE.md §16, §17.

import { NextResponse } from "next/server";
import { store } from "@/lib/store";
import { setSession } from "@/lib/session";

const DEMO_USER_ID = "u-r-pw-01"; // Maya — see seed-data.md

export async function POST() {
  const user = store.users.get(DEMO_USER_ID);
  if (!user) return NextResponse.json({ error: "Demo user not seeded." }, { status: 500 });
  // Reset any active-cluster flag so the demo always starts cleanly.
  user.in_active_cluster = false;
  store.users.set(user.id, user);
  // Dissolve any prior cluster they were part of so we get a fresh path through Now → forming → active.
  for (const c of [...store.clusters.values()]) {
    if (c.member_ids.includes(user.id)) {
      for (const mid of c.member_ids) {
        const m = store.users.get(mid);
        if (m) {
          m.in_active_cluster = false;
          store.users.set(mid, m);
        }
      }
      store.clusters.delete(c.id);
      // Drop any events tied to the dissolved cluster too.
      for (const [eid, ev] of store.events) {
        if (ev.cluster_id === c.id) store.events.delete(eid);
      }
    }
  }
  await setSession(user.id);
  return NextResponse.json({ ok: true, redirect: "/now" });
}
