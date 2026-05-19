// CLI smoke test for Agent 1.
// Run from the project root:
//   npm install
//   # to test the fallback path (no live API call):
//   npx tsx scripts/agent1-smoke.ts
//   # to test live + extraction (requires ANTHROPIC_API_KEY in .env.local):
//   npx tsx scripts/agent1-smoke.ts --live

import "dotenv/config";
import { config as loadEnv } from "dotenv";
import path from "node:path";
import { runTurn, mergePatch, isComplete, filledFieldCount, TRACKED_FIELDS } from "../lib/agent1";
import { extractProfile } from "../lib/agent1-extract";
import { isLlmAvailable } from "../lib/llm";
import type { PartialUser } from "../lib/types";
import type { MessageParam } from "@anthropic-ai/sdk/resources/messages";

loadEnv({ path: path.join(process.cwd(), ".env.local") });

const wantLive = process.argv.includes("--live");

const SIMULATED_USER_REPLIES = [
  "Hey! I'm Maya. Just moved to Rotterdam two weeks ago for a master's in urban design.",
  "I'm in Oude Westen, sharing a place near the Witte de Withstraat.",
  "I love long walks through the city, taking photos along the way. Big into film photography. I also play guitar but more for myself.",
  "Weeknights work best for me, and Sunday afternoons. Weekdays during the day I have classes.",
  "I speak English and Spanish, and a little Dutch — I'd love to practice it more.",
];

async function runInterview() {
  console.log(`\n=== Agent 1 interview smoke test (${wantLive ? "LIVE" : "FALLBACK"}) ===\n`);

  const history: MessageParam[] = [];
  let partial: PartialUser = {};

  // Opening turn — no user message yet.
  const opener = await runTurn(history, null, partial);
  console.log("Agent:", opener.assistant_text);
  if (opener.fallback) console.log("  (fallback path)");
  history.push({ role: "assistant", content: opener.assistant_text });
  partial = mergePatch(partial, opener.profile_patch);

  for (let i = 0; i < 5; i++) {
    const userReply = SIMULATED_USER_REPLIES[i];
    console.log(`\nUser: ${userReply}`);
    const turn = await runTurn(history, userReply, partial);
    console.log("Agent:", turn.assistant_text);
    if (turn.fallback) console.log("  (fallback path)");
    if (Object.keys(turn.profile_patch).length > 0) {
      console.log("  patch:", JSON.stringify(turn.profile_patch));
    }
    history.push({ role: "user", content: userReply });
    history.push({ role: "assistant", content: turn.assistant_text });
    partial = mergePatch(partial, turn.profile_patch);
    if (turn.done) break;
  }

  console.log("\n--- Final partial profile ---");
  console.log(JSON.stringify(partial, null, 2));
  console.log(`\nFields filled: ${filledFieldCount(partial)} / ${TRACKED_FIELDS}`);
  console.log(`Complete? ${isComplete(partial) ? "yes" : "no"}`);
}

async function runExtraction() {
  if (!isLlmAvailable()) {
    console.log("\n(skipping extraction test — no ANTHROPIC_API_KEY set)");
    return;
  }
  console.log("\n=== Extraction-only test ===\n");
  const profile = await extractProfile(SIMULATED_USER_REPLIES);
  console.log("Extracted profile:");
  console.log(JSON.stringify(profile, null, 2));
  console.log(`\nFields filled: ${filledFieldCount(profile)} / ${TRACKED_FIELDS}`);
  console.log(`Complete? ${isComplete(profile) ? "yes" : "no"}`);
}

async function main() {
  if (wantLive && !isLlmAvailable()) {
    console.error("--live requested but ANTHROPIC_API_KEY is not set in .env.local.");
    process.exit(1);
  }
  await runInterview();
  if (wantLive) {
    await runExtraction();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
