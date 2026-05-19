import { NextResponse } from "next/server";
import { runTurn, mergePatch, isComplete, filledFieldCount, TRACKED_FIELDS } from "@/lib/agent1";
import { getOnboarding, setOnboarding, updateUser } from "@/lib/store";
import { getSessionUserId } from "@/lib/session";

const WRAP_UP_LINE =
  "Thanks — that gives me a great picture of you. Tap below to review what I gathered.";

export async function POST(req: Request) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const rawMessage: unknown = body.message;
  const userMessage =
    typeof rawMessage === "string" && rawMessage.trim().length > 0 ? rawMessage.trim() : null;

  const state = getOnboarding(userId);

  const turn = await runTurn(state.history, userMessage, state.partial);
  const nextPartial = mergePatch(state.partial, turn.profile_patch);

  // Server is the source of truth for "interview is over": ignore the model's `done` claim
  // unless the actual extracted partial satisfies isComplete(), OR we've hit the soft cap
  // of 15 user turns.
  const nextHistory = [...state.history];
  if (userMessage) nextHistory.push({ role: "user", content: userMessage });
  const userTurnCount = nextHistory.filter((m) => m.role === "user").length;
  const done = isComplete(nextPartial) || userTurnCount >= 15;

  // If the user's last answer just pushed us over isComplete(), the model may have already
  // generated *another* question for the next turn (e.g., asking about languages_to_practice).
  // Showing that question alongside the "Review my profile" button strands the user — they
  // can't answer it. So when we flip done=true and the model's line ends with a question
  // mark, swap it for a canonical wrap-up.
  let assistantText = turn.assistant_text;
  if (done && /\?\s*$/.test(assistantText.trim())) {
    assistantText = WRAP_UP_LINE;
  }
  nextHistory.push({ role: "assistant", content: assistantText });

  setOnboarding(userId, { history: nextHistory, partial: nextPartial });

  // Mirror into the live user record so it's editable on the summary screen.
  updateUser(userId, {
    display_name: nextPartial.display_name ?? "",
    status: nextPartial.status ?? "newcomer",
    life_stage: nextPartial.life_stage ?? "early-career",
    what_brought_you_here: nextPartial.what_brought_you_here ?? "other",
    city: nextPartial.city ?? "Rotterdam",
    neighbourhood: nextPartial.neighbourhood ?? "",
    languages_spoken: nextPartial.languages_spoken ?? [],
    languages_to_practice: nextPartial.languages_to_practice,
    interests: nextPartial.interests ?? [],
    availability: nextPartial.availability ?? [],
  });

  return NextResponse.json({
    assistant_text: assistantText,
    profile_patch: turn.profile_patch,
    partial: nextPartial,
    filled: filledFieldCount(nextPartial),
    total: TRACKED_FIELDS,
    done,
    fallback: turn.fallback,
  });
}
