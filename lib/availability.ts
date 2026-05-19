// Map a datetime to one of the six DayParts the rest of the app talks in.
import type { DayPart, AvailabilitySlot, User } from "./types";

export function datetimeToDayPart(iso: string): DayPart {
  const d = new Date(iso);
  const day = d.getDay(); // 0 = Sunday, 6 = Saturday
  const hour = d.getHours();
  const weekend = day === 0 || day === 6;
  const tod: "morning" | "day" | "evening" =
    hour < 12 ? "morning" : hour < 17 ? "day" : "evening";
  return `${weekend ? "weekend" : "weekday"}-${tod}` as DayPart;
}

// True if a majority (>= 50%) of cluster members have this DayPart in their availability.
export function clusterCovers(members: User[], dp: DayPart): boolean {
  if (members.length === 0) return false;
  let count = 0;
  for (const m of members) {
    if (m.availability.some((s: AvailabilitySlot) => s.day_part === dp)) count++;
  }
  return count / members.length >= 0.5;
}

// Day-parts where at least half the cluster is free, in priority order (evenings first — most demo-friendly).
const DAYPART_PREFERENCE: DayPart[] = [
  "weekday-evening",
  "weekend-day",
  "weekend-evening",
  "weekend-morning",
  "weekday-day",
  "weekday-morning",
];

export function bestDayPartsForCluster(members: User[]): DayPart[] {
  return DAYPART_PREFERENCE.filter((dp) => clusterCovers(members, dp));
}

// Compose a sensible future datetime for a chosen DayPart (looking ~4 days ahead).
// Returns an ISO string in local Europe/Amsterdam-ish form.
export function nextDatetimeFor(dp: DayPart, daysAhead = 4): string {
  const now = new Date();
  const want = dp.startsWith("weekend");
  for (let i = daysAhead; i < daysAhead + 14; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() + i);
    const day = d.getDay();
    const isWeekend = day === 0 || day === 6;
    if (want && !isWeekend) continue;
    if (!want && isWeekend) continue;
    if (dp.endsWith("-morning")) d.setHours(10, 0, 0, 0);
    else if (dp.endsWith("-day")) d.setHours(14, 0, 0, 0);
    else d.setHours(19, 30, 0, 0);
    return d.toISOString();
  }
  // Fallback — just push forward one week from today, evening.
  const d = new Date(now);
  d.setDate(now.getDate() + 7);
  d.setHours(19, 30, 0, 0);
  return d.toISOString();
}
