// Demo-only: fast sign-in as the pre-seeded demo user so the pitch flow can skip the chat
// when the live API is unavailable or speed matters. CLAUDE.md §16, §17.

import { NextResponse } from "next/server";
import {
  getUserById,
  setUser,
  allClusters,
  allEvents,
  deleteCluster,
  deleteEvent,
} from "@/lib/store";
import { setSession } from "@/lib/session";

const DEMO_USER_ID = "u-r-pw-01"; // Maya — see seed-data.md

export async function POST() {
  const user = await getUserById(DEMO_USER_ID);
  if (!user) return NextResponse.json({ error: "Demo user not seeded." }, { status: 500 });
  // Reset any active-cluster flag so the demo always starts cleanly.
  user.in_active_cluster = false;
  await setUser(user);
  // Dissolve any prior cluster they were part of so we get a fresh path through Now → forming → active.
  const [clusters, events] = await Promise.all([allClusters(), allEvents()]);
  for (const c of clusters) {
    if (c.member_ids.includes(user.id)) {
      for (const mid of c.member_ids) {
        const m = await getUserById(mid);
        if (m) {
          m.in_active_cluster = false;
          await setUser(m);
        }
      }
      await deleteCluster(c.id);
      // Drop any events tied to the dissolved cluster too.
      for (const ev of events) {
        if (ev.cluster_id === c.id) await deleteEvent(ev.id);
      }
    }
  }
  await setSession(user.id);
  return NextResponse.json({ ok: true, redirect: "/now" });
}
