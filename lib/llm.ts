// Thin Anthropic client. Server-only. Provider abstracted so a future swap touches just this file.
import Anthropic from "@anthropic-ai/sdk";

let client: Anthropic | null = null;

export function getClient(): Anthropic {
  if (client) return client;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY missing in environment");
  }
  client = new Anthropic({ apiKey });
  return client;
}

export const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-5";

export function isLlmAvailable(): boolean {
  // Manual kill-switch for UI / layout testing: set CG_DISABLE_LLM=true in .env.local to
  // force the fallback path on every agent call (zero API spend), even if the key is set.
  if (process.env.CG_DISABLE_LLM === "true") return false;
  return !!process.env.ANTHROPIC_API_KEY;
}
