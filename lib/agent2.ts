// Agent 2 — Clustering.
// Pure function: Jaccard overlap on interests + availability overlap, greedy top-N.
// No LLM, no embeddings. CLAUDE.md §5 Agent 2.

import type { User, Cluster, AvailabilitySlot } from "./types";

export function jaccardOverlap(a: string[], b: string[]): number {
  if (a.length === 0 && b.length === 0) return 0;
  const setA = new Set(a);
  const setB = new Set(b);
  let intersection = 0;
  for (const x of setA) if (setB.has(x)) intersection++;
  const union = new Set([...setA, ...setB]).size;
  return union === 0 ? 0 : intersection / union;
}

export function availabilityOverlap(a: AvailabilitySlot[], b: AvailabilitySlot[]): boolean {
  if (a.length === 0 || b.length === 0) return false;
  const setA = new Set(a.map((s) => s.day_part));
  for (const slot of b) if (setA.has(slot.day_part)) return true;
  return false;
}

// Try to form a cluster around the seed user from the candidate pool.
// Returns a fresh Cluster record (status="forming") or null if no viable group exists.
//
// Multi-cluster is now allowed (CLAUDE.md §19 update): the in_active_cluster gate is gone.
// Callers pass excludeUserIds to keep the seed user from re-matching the same people
// they're already grouped with, so each new cluster brings fresh faces.
// preferredTags biases the score toward candidates who share specific tags the seed user picked.
export function findCluster(
  seedUser: User,
  candidates: User[],
  opts: { preferredTags?: string[]; excludeUserIds?: string[] } = {},
): Cluster | null {
  const exclude = new Set(opts.excludeUserIds ?? []);
  const preferred = new Set(opts.preferredTags ?? []);

  const eligible = candidates.filter(
    (c) =>
      c.id !== seedUser.id &&
      !exclude.has(c.id) &&
      c.city === seedUser.city &&
      c.profile_complete &&
      availabilityOverlap(c.availability, seedUser.availability),
  );

  const scored = eligible
    .map((c) => ({
      user: c,
      // Bonus of 0.5 per preferred tag the candidate has — strong nudge without flattening Jaccard.
      score:
        jaccardOverlap(c.interests, seedUser.interests) +
        0.5 * c.interests.filter((t) => preferred.has(t)).length,
    }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);

  // A cluster has 4–6 members. Need at least 3 candidates + the seed.
  if (scored.length < 3) return null;

  // Quality gate: only keep candidates whose score is at least half of the top score.
  // Prevents a weak peripheral match (e.g. one shared tag) from being pulled into a tight cluster.
  const topScore = scored[0].score;
  const tight = scored.filter((s) => s.score >= topScore * 0.5);
  // If the tight set has too few candidates, fall back to the top 3 by score so we still cluster.
  const pool = tight.length >= 3 ? tight : scored.slice(0, 3);

  const groupSize = Math.min(5, pool.length); // pick up to 5 others → cluster up to 6 total
  const chosen = pool.slice(0, groupSize);
  const members = [seedUser, ...chosen.map((c) => c.user)];

  const tagCounts = new Map<string, number>();
  for (const m of members) {
    for (const tag of m.interests) {
      tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
    }
  }
  // A tag is "shared" if it appears in ≥2 members. Sort by frequency, cap to keep the chip list short.
  const shared_interests = [...tagCounts.entries()]
    .filter(([, n]) => n >= 2)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([tag]) => tag)
    .slice(0, 6);

  return {
    id: `c-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    city: seedUser.city,
    member_ids: members.map((m) => m.id),
    shared_interests,
    status: "forming",
    created_at: new Date().toISOString(),
  };
}
