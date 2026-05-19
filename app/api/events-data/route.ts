// API-side data fetch for the /events page. See /api/now-data for why this exists.

import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/session";
import { store, LAMBDA_ID } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ redirect: "/login" }, { status: 401 });

  const user = store.users.get(userId);
  if (!user) return NextResponse.json({ redirect: "/login" }, { status: 401 });
  if (!user.profile_complete) {
    return NextResponse.json({ redirect: "/onboarding/chat" }, { status: 409 });
  }

  const myClusters = [...store.clusters.values()].filter((c) =>
    c.member_ids.includes(userId),
  );
  const myClusterIds = new Set(myClusters.map((c) => c.id));
  const myEvents = [...store.events.values()].filter((e) =>
    myClusterIds.has(e.cluster_id),
  );

  console.log(
    `[events-data] lambda=${LAMBDA_ID} storeClusters=${store.clusters.size} storeEvents=${store.events.size} forUser=${userId} myEvents=${myEvents.length}`,
  );

  const activeClusterCount = myClusters.filter((c) => c.status !== "dissolved").length;
  const toConfirm = myEvents.filter((e) => e.status === "proposed");
  const upcoming = myEvents.filter((e) => e.status === "fired");
  const past = myEvents.filter((e) => e.status === "completed");

  return NextResponse.json({
    userId,
    interests: user.interests,
    activeClusterCount,
    toConfirm,
    upcoming,
    past,
  });
}
