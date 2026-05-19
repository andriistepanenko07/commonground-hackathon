import { NextResponse } from "next/server";
import { clearSession, getSessionUserId } from "@/lib/session";
import { store, updateUser } from "@/lib/store";
import type { AvailabilitySlot, DayPart, LifeStage, Status, WhatBroughtYouHere, City } from "@/lib/types";

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const user = store.users.get(userId);
  if (!user) {
    // Stale session — cookie points at a user no longer in the in-memory store after a
    // dev-server restart. Clear the cookie now so the next request is a clean 401 rather
    // than another 404 chasing the same ghost.
    await clearSession();
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }
  return NextResponse.json({ user });
}

const DAY_PARTS: DayPart[] = [
  "weekday-morning",
  "weekday-day",
  "weekday-evening",
  "weekend-morning",
  "weekend-day",
  "weekend-evening",
];

const STATUSES: Status[] = ["newcomer", "local-meet", "local-help"];
const LIFE_STAGES: LifeStage[] = ["student", "early-career", "mid-career", "established", "retired"];
const REASONS: WhatBroughtYouHere[] = ["study", "work", "family", "partner", "other"];
const CITIES: City[] = ["Rotterdam", "Amsterdam", "The Hague"];

function asEnum<T extends string>(allowed: T[], v: unknown, fallback: T): T {
  return typeof v === "string" && (allowed as readonly string[]).includes(v) ? (v as T) : fallback;
}

function asStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === "string" && x.trim().length > 0).map((s) => s.trim());
}

function asAvailability(v: unknown): AvailabilitySlot[] {
  if (!Array.isArray(v)) return [];
  const slots: AvailabilitySlot[] = [];
  for (const item of v) {
    if (typeof item === "string" && (DAY_PARTS as readonly string[]).includes(item)) {
      slots.push({ day_part: item as DayPart });
    } else if (item && typeof item === "object" && "day_part" in item) {
      const dp = (item as { day_part: unknown }).day_part;
      if (typeof dp === "string" && (DAY_PARTS as readonly string[]).includes(dp)) {
        slots.push({ day_part: dp as DayPart });
      }
    }
  }
  return slots;
}

export async function PATCH(req: Request) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const user = store.users.get(userId);
  if (!user) return NextResponse.json({ error: "User not found." }, { status: 404 });

  const body = await req.json().catch(() => ({}));

  const next = updateUser(userId, {
    display_name: typeof body.display_name === "string" ? body.display_name.trim() : user.display_name,
    status: asEnum(STATUSES, body.status, user.status),
    life_stage: asEnum(LIFE_STAGES, body.life_stage, user.life_stage),
    what_brought_you_here: asEnum(REASONS, body.what_brought_you_here, user.what_brought_you_here),
    city: asEnum(CITIES, body.city, user.city),
    neighbourhood: typeof body.neighbourhood === "string" ? body.neighbourhood.trim() : user.neighbourhood,
    languages_spoken: asStringArray(body.languages_spoken),
    languages_to_practice: asStringArray(body.languages_to_practice),
    interests: asStringArray(body.interests),
    availability: asAvailability(body.availability),
    profile_complete: !!body.profile_complete || user.profile_complete,
  });

  return NextResponse.json({ user: next });
}
