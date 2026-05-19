// API-side data fetch for the /now page. Lives here (not in the page server component)
// because Vercel splits page-render and API-route handlers into different Lambdas with
// separate globalThis — so a cluster created by /api/cluster/find is only visible from
// another API route. The /now page is a client component that fetches this endpoint.

import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/session";
import { store, LAMBDA_ID } from "@/lib/store";
import { toSafeMember } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ redirect: "/login" }, { status: 401 });

  const user = store.users.get(userId);
  if (!user) return NextResponse.json({ redirect: "/login" }, { status: 401 });
  if (!user.profile_complete) {
    return NextResponse.json({ redirect: "/onboarding/chat" }, { status: 409 });
  }

  const clusters = [...store.clusters.values()].filter(
    (c) => c.member_ids.includes(userId) && c.status !== "dissolved",
  );

  console.log(
    `[now-data] lambda=${LAMBDA_ID} storeClusters=${store.clusters.size} forUser=${userId} myClusters=${clusters.length}`,
  );

  const groups = clusters.map((cluster) => {
    const memberUsers = cluster.member_ids
      .map((id) => store.users.get(id))
      .filter((u): u is NonNullable<typeof u> => !!u);
    const members = memberUsers.map(toSafeMember);
    const event = [...store.events.values()].find(
      (e) => e.cluster_id === cluster.id && e.status !== "cancelled",
    );
    return { cluster, members, hasEvent: !!event };
  });

  return NextResponse.json({
    user: { city: user.city, display_name: user.display_name },
    groups,
  });
}
