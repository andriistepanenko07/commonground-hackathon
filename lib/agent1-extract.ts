// Extraction-only mode for Agent 1. Used by the seed pipeline: feed in a fictional user-side
// transcript and emit a fully-populated PartialUser, with no question generation.
// Same schema and rules as the live interview — different system prompt because we're not
// running a conversation, just parsing one that already happened.

import type { ToolUseBlock } from "@anthropic-ai/sdk/resources/messages";
import { getClient, MODEL, isLlmAvailable } from "./llm";
import type { PartialUser } from "./types";

const EXTRACTION_SYSTEM = `You extract structured profile data from a Common Ground onboarding conversation.

You will be given a series of USER messages — the answers a person gave during a short interview with another AI agent. The questions are not shown; infer them from the answers.

Your job: emit ONE complete PartialUser record by calling the tool "extract_profile". Do not write any other text.

# Schema

- display_name: chosen handle / first name. If multiple appear, pick the most-used or the explicit "call me X".
- status: "newcomer" (just arrived for study/work/family/partner) | "local-meet" (already lives here, wants to meet new people) | "local-help" (already lives here, wants to help newcomers integrate).
- life_stage: "student" | "early-career" | "mid-career" | "established" | "retired".
- what_brought_you_here: "study" | "work" | "family" | "partner" | "other". For locals, "other".
- city: "Rotterdam" | "Amsterdam" | "The Hague".
- neighbourhood: free text, whatever name the user uses.
- languages_spoken: array of language names in English (e.g. ["English", "Dutch", "Polish"]).
- languages_to_practice: optional. Only set if explicitly mentioned as something they want to practice.
- interests: array of short lowercase tag-like phrases extracted from rich answers. At least 5. Examples: "running", "tango", "vegan cooking", "board games", "live music", "photography", "long walks".
- availability: array of slots, each {day_part: ...}. day_part is one of "weekday-morning", "weekday-day", "weekday-evening", "weekend-morning", "weekend-day", "weekend-evening". Pick everything that genuinely fits.

# Rules

- Output the FULL extracted record, not a delta.
- If a field is genuinely unstated, omit it from the output rather than guessing.
- Lowercase all interest tags. Use short nouns or noun phrases (no full sentences).
- Never infer nationality, country of origin, or exact age — these are not fields and must not be guessed at.`;

const EXTRACT_TOOL = {
  name: "extract_profile",
  description: "Emit the structured profile fields extracted from the user's interview answers.",
  input_schema: {
    type: "object" as const,
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
    required: [],
  },
};

export async function extractProfile(userTurns: string[]): Promise<PartialUser> {
  if (!isLlmAvailable()) {
    throw new Error("ANTHROPIC_API_KEY required for seed extraction; live call has no fallback.");
  }

  const transcript = userTurns
    .map((t, i) => `Turn ${i + 1}: ${t}`)
    .join("\n\n");

  const response = await getClient().messages.create({
    model: MODEL,
    max_tokens: 1024,
    system: EXTRACTION_SYSTEM,
    tools: [EXTRACT_TOOL],
    tool_choice: { type: "tool", name: "extract_profile" },
    messages: [{ role: "user", content: transcript }],
  });

  const toolUse = response.content.find((b): b is ToolUseBlock => b.type === "tool_use");
  if (!toolUse) throw new Error("Extraction returned no tool call");
  return toolUse.input as PartialUser;
}
