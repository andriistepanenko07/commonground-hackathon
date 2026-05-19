// Seed pipeline: read fictional interview transcripts, run them through Agent 1's
// extraction prompt, and write the resulting seed/users.json.
//
// Usage (from project root, after putting ANTHROPIC_API_KEY in .env.local):
//   npm run seed:extract
//
// Idempotent: re-running overwrites seed/users.json. ~30 extraction calls per run (~$0.50).

import "dotenv/config";
import { config as loadEnv } from "dotenv";
import path from "node:path";
import fs from "node:fs/promises";
import { extractProfile } from "../lib/agent1-extract";
import type { PartialUser, User, City } from "../lib/types";

loadEnv({ path: path.join(process.cwd(), ".env.local") });

interface Transcript {
  id: string;
  city: City;
  cluster_hint: string;
  replies: string[];
}

async function main() {
  const transcriptsPath = path.join(process.cwd(), "seed", "transcripts.json");
  const usersOutPath = path.join(process.cwd(), "seed", "users.json");

  const raw = await fs.readFile(transcriptsPath, "utf8");
  const transcripts: Transcript[] = JSON.parse(raw);

  const users: User[] = [];
  for (let i = 0; i < transcripts.length; i++) {
    const t = transcripts[i];
    process.stdout.write(`[${i + 1}/${transcripts.length}] ${t.id} (${t.city}, ${t.cluster_hint}) … `);
    try {
      const extracted = await extractProfile(t.replies);
      const user = finalizeUser(t, extracted);
      users.push(user);
      console.log(`ok — ${user.display_name}, ${user.interests.length} interests`);
    } catch (err) {
      console.log(`FAIL: ${(err as Error).message}`);
    }
  }

  await fs.writeFile(usersOutPath, JSON.stringify(users, null, 2));
  console.log(`\nWrote ${users.length} users to ${usersOutPath}`);
}

function finalizeUser(t: Transcript, extracted: PartialUser): User {
  // Fill defaults so the resulting record is a complete User. The extractor may legitimately
  // omit anything it couldn't infer; we backfill from the transcript's hint metadata.
  return {
    id: t.id,
    display_name: extracted.display_name ?? t.id,
    email: `${t.id}@common-ground.local`,
    status: extracted.status ?? "newcomer",
    life_stage: extracted.life_stage ?? "early-career",
    what_brought_you_here: extracted.what_brought_you_here ?? "other",
    city: extracted.city ?? t.city,
    neighbourhood: extracted.neighbourhood ?? "",
    languages_spoken: extracted.languages_spoken ?? ["English"],
    languages_to_practice: extracted.languages_to_practice,
    interests: extracted.interests ?? [],
    availability: extracted.availability ?? [],
    profile_complete: true,
    in_active_cluster: false,
  };
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
