// Upstash Redis client. Single source of truth for dynamic data across serverless instances.
// Without this, `lib/store.ts` would hold state in `globalThis` which doesn't survive
// Vercel's per-instance memory boundaries — the original cause of /now rendering empty
// after a cluster was created. See plans/the-things-is-we-structured-pixel.md.

import { Redis } from "@upstash/redis";
import seedUsers from "@/seed/users.json";
import type { User } from "./types";

export const redis = Redis.fromEnv();

const SEED_SENTINEL = "cg:seeded";
const USERS_HASH = "cg:users";

// Race-safe one-time seed. First instance to win the SET NX writes the seed users into
// the cg:users hash; all other instances see the sentinel and skip. Each instance memoises
// the resolved promise so subsequent calls are free.
let seedPromise: Promise<void> | null = null;

export function ensureSeeded(): Promise<void> {
  if (seedPromise) return seedPromise;
  seedPromise = (async () => {
    const won = await redis.set(SEED_SENTINEL, "1", { nx: true });
    if (won !== "OK") return;
    const entries: Record<string, string> = {};
    for (const u of seedUsers as User[]) {
      entries[u.id] = JSON.stringify(u);
    }
    if (Object.keys(entries).length > 0) {
      await redis.hset(USERS_HASH, entries);
    }
  })();
  return seedPromise;
}
