// Diagnostic-only probe: returns the Lambda's view of the store + its LAMBDA_ID.
// If this endpoint lands on the same Lambda as /api/cluster/find, then moving the
// /now and /events page reads through new API routes will fix the cross-Lambda bug.
// Remove this file once the diagnosis is complete.

import { NextResponse } from "next/server";
import { store, LAMBDA_ID } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  console.log(
    `[now-data] lambda=${LAMBDA_ID} storeUsers=${store.users.size} storeClusters=${store.clusters.size} storeEvents=${store.events.size}`,
  );
  return NextResponse.json({
    lambda: LAMBDA_ID,
    storeUsers: store.users.size,
    storeClusters: store.clusters.size,
    storeEvents: store.events.size,
  });
}
