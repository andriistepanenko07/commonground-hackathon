// Agent 1 — Profile.
// Adaptive, state-driven conversational interview. NOT a fixed script.
// On every turn the model picks the next-most-useful question based on what's still missing
// in the partial profile and what the user just said. See CLAUDE.md §5 for full rules.

import type { MessageParam, ToolUseBlock } from "@anthropic-ai/sdk/resources/messages";
import { getClient, MODEL, isLlmAvailable } from "./llm";
import type { PartialUser } from "./types";
import { fallbackResponse } from "./fallbacks/agent1";

export interface TurnResult {
  assistant_text: string;
  profile_patch: PartialUser;
  done: boolean;
  fallback: boolean;
}

const SYSTEM_PROMPT = `You are Agent 1 of the Common Ground app — an AI agent run by Dutch municipalities to help newcomers and existing residents meet a small group of people who share what they like to do.

Your job is to run a short, warm conversation that builds enough of the user's profile that another agent can cluster them with 4–5 well-matched people in their city.

# Hard rules — never break these

1. In your FIRST assistant message, identify yourself as an AI agent in one sentence ("I'm an AI agent that…").
2. Ask EXACTLY ONE question per turn. Never two unrelated things in the same turn.
3. NEVER ask about: emotional state, loneliness, mental health, nationality, country of origin, ethnic background, exact age, immigration status, religion, income, political views, sexuality.
4. NEVER re-ask something the user has already answered, unless clarifying ambiguity.
5. NEVER classify or label the user. No "you sound lonely", no "you're an introvert", no diagnosis.
6. English only. Even if the user writes in another language, you answer in warm, simple English.
7. Keep messages SHORT — 1 to 3 short sentences. This is a phone-sized chat.

# What you are filling in (the User record)

You're building this profile across the conversation. Don't show it to the user. Extract into a "profile_patch" each turn:

- display_name: string. A chosen handle / first name; not a legal name. Ask early.
- status: "newcomer" | "local-meet" | "local-help".
    - "newcomer" → just moved to the city for study/work/family/partner.
    - "local-meet" → already lives in the city, wants to meet new people themselves.
    - "local-help" → already lives in the city, wants to help newcomers integrate.
- life_stage: "student" | "early-career" | "mid-career" | "established" | "retired".
- what_brought_you_here: "study" | "work" | "family" | "partner" | "other". For locals, "other" is fine.
- city: "Rotterdam" | "Amsterdam" | "The Hague". Confirm this once if it isn't obvious.
- neighbourhood: free text. Whatever name they use ("Noord", "Oude Westen", "Centrum").
- languages_spoken: array of language names in English (e.g. ["English", "Dutch", "Polish"]). Always include at least one.
- languages_to_practice: optional array. Only set if they say they want to practice a language.
- interests: array of short tag-like nouns/short phrases. AT LEAST 7. Use lowercase singular tags like "running", "tango", "live music", "vegan cooking", "board games", "film", "padel", "photography". Extract from rich answers — if they say "I love going for long walks and taking photos along the way," you set interests to include "long walks" and "photography".
- availability: array of slots. Each slot is one of: "weekday-morning", "weekday-day", "weekday-evening", "weekend-morning", "weekend-day", "weekend-evening". Pick the slots the user genuinely sounds free in. At least 2 distinct slots so the cluster has overlap to work with.

# How to pick the next question — adaptive moves

Each turn, look at:
  (a) which fields are still missing or thin, and
  (b) what the user just said.

Then choose ONE of two move types:

OPENING MOVE — a broad, warm question that opens a still-empty field.
  Examples: "What brought you to Rotterdam?", "How would you spend a perfect free Saturday?", "What part of the city do you call home for now?"

FOLLOW-UP MOVE — a targeted question that drills into something the user just mentioned.
  Examples: user says "I run a lot" → "Solo runs, or do you like company? And mornings or evenings?". User mentions a small child → "Got it — does that mostly shape when you're free?". User mentions tango → "Is it the dancing itself you'd want to share, or also the music side of it?".

Mix the two. Roughly every other turn, mirror a phrase from the user's previous message in your reply so they feel heard ("the photo walks sound great — …").

Before wrapping up, make at least 2 follow-up moves on things the user mentioned in passing — a hobby, a constraint, a place they named. The point is depth, not coverage. A rich answer about one hobby is worth more than a thin list of five.

Do NOT ask them to enumerate all their hobbies as a list. The whole point is that interests are extracted from natural answers, not collected as form fields.

# When to stop

You're DONE when ALL of these are true:
- display_name set
- status set
- life_stage set
- what_brought_you_here set
- city set
- neighbourhood set
- languages_spoken has at least 1 entry
- interests has AT LEAST 7 entries
- availability has at least 2 distinct slots

When done, your assistant_message should be a warm wrap-up (one short sentence) and you set done=true.

You should also stop and set done=true if you've already asked 15 questions in this conversation — the user can edit anything missing on the next screen. (Count your own assistant turns. The opener counts as turn 1.)

# Output format — every single turn

On every turn, call the tool "submit_turn" with:
- assistant_message: the next thing you say to the user
- profile_patch: an object containing ONLY the User fields you can confidently extract from this conversation so far (don't restate things that were already set in earlier patches unless you're correcting them; partial objects are merged on the server)
- done: boolean

If the user's latest message contains nothing new to extract, profile_patch can be an empty object {}.`;

const SUBMIT_TURN_TOOL = {
  name: "submit_turn",
  description: "Emit the next assistant message and any new structured profile data extracted from the conversation.",
  input_schema: {
    type: "object" as const,
    properties: {
      assistant_message: {
        type: "string",
        description: "The warm, conversational message Agent 1 says to the user this turn. 1–3 short sentences. Ends with at most ONE question.",
      },
      profile_patch: {
        type: "object",
        description: "Partial User record with fields newly extractable from the latest user message. Empty object {} if nothing new.",
        properties: {
          display_name: { type: "string" },
          status: { type: "string", enum: ["newcomer", "local-meet", "local-help"] },
          life_stage: { type: "string", enum: ["student", "early-career", "mid-career", "established", "retired"] },
          what_brought_you_here: { type: "string", enum: ["study", "work", "family", "partner", "other"] },
          city: { type: "string", enum: ["Rotterdam", "Amsterdam", "The Hague"] },
          neighbourhood: { type: "string" },
          languages_spoken: { type: "array", items: { type: "string" } },
          languages_to_practice: { type: "array", items: { type: "string" } },
          interests: { type: "array", items: { type: "string" } },
          availability: {
            type: "array",
            items: {
              type: "object",
              properties: {
                day_part: {
                  type: "string",
                  enum: ["weekday-morning", "weekday-day", "weekday-evening", "weekend-morning", "weekend-day", "weekend-evening"],
                },
              },
              required: ["day_part"],
            },
          },
        },
      },
      done: {
        type: "boolean",
        description: "True if the completion criteria are met or the 15-turn soft cap was reached.",
      },
    },
    required: ["assistant_message", "profile_patch", "done"],
  },
};

export async function runTurn(
  history: MessageParam[],
  userMessage: string | null,
  partial: PartialUser,
): Promise<TurnResult> {
  const messages: MessageParam[] = [...history];
  if (userMessage !== null) {
    messages.push({ role: "user", content: userMessage });
  }
  const userTurnCount = messages.filter((m) => m.role === "user").length;

  // If we genuinely don't have a key, return the fallback path immediately — no point burning a tool call.
  if (!isLlmAvailable()) {
    return fallbackResponse(partial, userTurnCount);
  }

  try {
    const response = await getClient().messages.create({
      model: MODEL,
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      tools: [SUBMIT_TURN_TOOL],
      tool_choice: { type: "tool", name: "submit_turn" },
      messages,
    });

    const toolUse = response.content.find((b): b is ToolUseBlock => b.type === "tool_use");
    if (!toolUse) {
      return fallbackResponse(partial, userTurnCount);
    }
    const input = toolUse.input as {
      assistant_message: string;
      profile_patch: PartialUser;
      done: boolean;
    };

    return {
      assistant_text: input.assistant_message,
      profile_patch: input.profile_patch ?? {},
      done: !!input.done,
      fallback: false,
    };
  } catch (err) {
    console.error("[agent1] live call failed, using fallback:", err);
    return fallbackResponse(partial, userTurnCount);
  }
}

// Merge a profile_patch into the running partial. Arrays are unioned (deduped),
// scalars overwritten only when the patch provides a non-empty value.
export function mergePatch(current: PartialUser, patch: PartialUser): PartialUser {
  const next: PartialUser = { ...current };
  for (const [key, value] of Object.entries(patch) as [keyof PartialUser, PartialUser[keyof PartialUser]][]) {
    if (value === undefined || value === null) continue;
    if (Array.isArray(value)) {
      const existing = (next[key] as unknown[] | undefined) ?? [];
      const merged = [...existing];
      for (const v of value) {
        const isObj = v && typeof v === "object";
        const seen = merged.some((m) =>
          isObj ? JSON.stringify(m) === JSON.stringify(v) : m === v,
        );
        if (!seen) merged.push(v);
      }
      (next as Record<string, unknown>)[key] = merged;
    } else if (typeof value === "string" && value.trim() === "") {
      continue;
    } else {
      (next as Record<string, unknown>)[key] = value;
    }
  }
  return next;
}

// Check completion criteria for a partial profile.
export function isComplete(p: PartialUser): boolean {
  return (
    !!p.display_name &&
    !!p.status &&
    !!p.life_stage &&
    !!p.what_brought_you_here &&
    !!p.city &&
    !!p.neighbourhood &&
    (p.languages_spoken?.length ?? 0) >= 1 &&
    (p.interests?.length ?? 0) >= 7 &&
    (p.availability?.length ?? 0) >= 2
  );
}

// Count how many of the 8 tracked fields are filled — used to drive the progress bar.
export const TRACKED_FIELDS = 8;
export function filledFieldCount(p: PartialUser): number {
  let n = 0;
  if (p.display_name) n++;
  if (p.status) n++;
  if (p.life_stage) n++;
  if (p.what_brought_you_here) n++;
  if (p.neighbourhood) n++;
  if ((p.languages_spoken?.length ?? 0) >= 1) n++;
  if ((p.interests?.length ?? 0) >= 7) n++;
  if ((p.availability?.length ?? 0) >= 2) n++;
  return n;
}
