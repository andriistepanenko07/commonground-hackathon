// Hand-crafted Agent 1 fallbacks. Fire when the live Anthropic call fails or no key is set.
// These must read as on-brand and indistinguishable from a live response (CLAUDE.md §16).
//
// Two-step selection:
//   1. If a field is genuinely missing (we know which, from the partial), ask for it.
//   2. Otherwise, walk a scripted sequence by user-turn count so the chat doesn't loop on
//      a single question when extraction has failed silently.
//
// Real adaptive interview behaviour belongs to the live LLM path. The fully-offline demo
// walk uses the `?demo=true` happy-path injection (CLAUDE.md §16 / Step 11), not this file.

import type { PartialUser } from "../types";
import type { TurnResult } from "../agent1";
import { isComplete } from "../agent1";

const SCRIPTED: string[] = [
  // Opener (turn 0, no user reply yet).
  "Hi — I'm an AI agent from your municipality. I'll ask a few short questions so I can help you find a small group of people in your new city. To start, what should I call you here?",
  // Turn 1.
  "Nice to meet you. Which city are you in — Rotterdam, Amsterdam, or The Hague?",
  // Turn 2.
  "And what brought you there — study, work, family, partner, or something else?",
  // Turn 3.
  "Which part of the city are you living in for now? Whatever name you'd use yourself.",
  // Turn 4.
  "Tell me about a perfect free afternoon for you — what would you actually want to be doing?",
  // Turn 5.
  "Anything else you really enjoy — music, food, sport, the slow stuff like long walks?",
  // Turn 6.
  "When in the week do you usually have time for something social — weeknights, weekend days?",
  // Turn 7.
  "Which languages do you speak day-to-day? And is there one you'd like to practise more?",
];

export function fallbackResponse(partial: PartialUser, userTurnCount: number): TurnResult {
  if (isComplete(partial)) {
    return wrap(
      "Lovely, that's all I needed. Let me look for a small group of people who'd fit your week.",
      {},
      true,
    );
  }

  // If we know what's missing (live extraction worked at least once), target the gap directly.
  const filledFields = countFilled(partial);
  if (filledFields > 0) {
    const targeted = nextByGap(partial);
    if (targeted) return wrap(targeted, {});
  }

  // Otherwise walk the scripted sequence by user-turn count.
  if (userTurnCount >= SCRIPTED.length) {
    return wrap(
      "That's plenty for me to go on. I'll start looking for a small group that fits your week.",
      {},
      true,
    );
  }
  return wrap(SCRIPTED[userTurnCount], {});
}

function nextByGap(p: PartialUser): string | null {
  if (!p.display_name) return "Before I go on — what should I call you here?";
  if (!p.city) return `Which city are you in — Rotterdam, Amsterdam, or The Hague?`;
  if (!p.what_brought_you_here) return `What brought you to ${p.city}? Study, work, family, partner, or something else?`;
  if (!p.neighbourhood) return `Which part of ${p.city} are you in for now?`;
  if (!p.languages_spoken || p.languages_spoken.length === 0) return "Which languages do you speak day-to-day?";
  if ((p.interests?.length ?? 0) < 5) return "Tell me about a perfect free afternoon — what would you actually want to be doing?";
  if ((p.availability?.length ?? 0) === 0) return "When in the week do you usually have time for something social?";
  if (!p.life_stage) return "And roughly what stage of life are you in — studying, working, somewhere else?";
  return null;
}

function countFilled(p: PartialUser): number {
  let n = 0;
  if (p.display_name) n++;
  if (p.city) n++;
  if (p.what_brought_you_here) n++;
  if (p.neighbourhood) n++;
  if ((p.languages_spoken?.length ?? 0) > 0) n++;
  if ((p.interests?.length ?? 0) > 0) n++;
  if ((p.availability?.length ?? 0) > 0) n++;
  if (p.life_stage) n++;
  return n;
}

function wrap(message: string, patch: PartialUser, done = false): TurnResult {
  return { assistant_text: message, profile_patch: patch, done, fallback: true };
}
