// Agent 3 — Meetup proposer.
// Aggregator-first (scan CityEvents seed list) → generator fallback (pick a Venue + ask Claude
// for one warm sentence). CLAUDE.md §5 Agent 3.

import { getClient, MODEL, isLlmAvailable } from "./llm";
import { datetimeToDayPart, clusterCovers, bestDayPartsForCluster, nextDatetimeFor } from "./availability";
import { templateActivity } from "./fallbacks/agent3";
import type { Cluster, CityEvent, Venue, User, Event } from "./types";

export interface ProposalInputs {
  cluster: Cluster;
  members: User[];
  cityEvents: CityEvent[];
  venues: Venue[];
}

export interface Proposal {
  mode: "aggregated" | "generated";
  activity: string;
  place: { name: string; city: Cluster["city"]; neighbourhood: string; meeting_point: string };
  datetime: string;
  source_note?: string;
  fallback: boolean;
}

// Aggregator path: pick the upcoming city event with the most tag-overlap to the cluster's
// shared interests, breaking ties by soonest date. Skip anything in excludeTitles (used to
// dedup against events already proposed to the user's other active clusters).
export function aggregatorPick(
  c: Cluster,
  members: User[],
  events: CityEvent[],
  excludeTitles?: Set<string>,
): CityEvent | null {
  const now = Date.now();
  const sharedSet = new Set(c.shared_interests);
  const scored = events
    .filter((e) => e.city === c.city)
    .filter((e) => new Date(e.datetime).getTime() > now)
    .filter((e) => !excludeTitles?.has(e.title))
    .filter((e) => clusterCovers(members, datetimeToDayPart(e.datetime)))
    .map((e) => ({ event: e, overlap: e.tags.filter((t) => sharedSet.has(t)).length }))
    .filter((x) => x.overlap > 0)
    .sort((a, b) => {
      if (b.overlap !== a.overlap) return b.overlap - a.overlap;
      return new Date(a.event.datetime).getTime() - new Date(b.event.datetime).getTime();
    });
  return scored[0]?.event ?? null;
}

// For an aggregated event, try to find a venue from our seed list that the event takes place at.
// Pass 1: title contains a venue's full name.
// Pass 2: source attribution contains a venue's name (e.g. source "Bimhuis programme" → Bimhuis).
// Pass 3: title contains a venue's neighbourhood.
export function matchVenueToEvent(event: CityEvent, venues: Venue[]): Venue | null {
  const title = event.title.toLowerCase();
  const source = event.source.toLowerCase();
  for (const v of venues) {
    if (v.city !== event.city) continue;
    if (title.includes(v.name.toLowerCase())) return v;
  }
  for (const v of venues) {
    if (v.city !== event.city) continue;
    const vName = v.name.toLowerCase();
    // Substring match either way — source may be a shorter attribution than the venue name.
    if (source.includes(vName) || vName.includes(source)) return v;
  }
  for (const v of venues) {
    if (v.city !== event.city) continue;
    if (v.neighbourhood && title.includes(v.neighbourhood.toLowerCase())) return v;
  }
  return null;
}

// Pull the meaningful place out of an event title.
//   "X at Y"   → "Y"          ("Vegan dinner workshop at Kookstudio")
//   "X in Y"   → "Y"          ("Pavilion lights walk in Het Park")
//   "X: Y"     → "Y"          ("Jazz at Bimhuis: Reijseger Trio")
//   first cap. → that word    ("Maashaven sunset photo walk" → "Maashaven")
export function extractPlaceFromTitle(title: string): string | null {
  const prep = title.match(/(?:\s+at\s+|\s+in\s+|\s+by\s+)([A-Z].*)$/);
  if (prep) return prep[1].trim();
  const sep = title.match(/[:\-—]\s*([A-Z].*)$/);
  if (sep) return sep[1].trim();
  const first = title.match(/^([A-Z][A-Za-z\-]+)/);
  if (first) return first[1];
  return null;
}

// Generator path: pick a venue whose good_for tags overlap shared interests; if multiple, prefer
// matches in the seed-user's neighbourhood, then any in the same city.
export function generatorPickVenue(c: Cluster, members: User[], venues: Venue[]): Venue | null {
  const sharedSet = new Set(c.shared_interests);
  const seed = members[0];
  const cityVenues = venues.filter((v) => v.city === c.city);
  const scored = cityVenues
    .map((v) => ({ v, score: v.good_for.filter((t) => sharedSet.has(t)).length }))
    .filter((x) => x.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      // tie-break: prefer seed user's neighbourhood
      const aHome = a.v.neighbourhood === seed?.neighbourhood ? 1 : 0;
      const bHome = b.v.neighbourhood === seed?.neighbourhood ? 1 : 0;
      return bHome - aHome;
    });
  return scored[0]?.v ?? null;
}

async function phraseGeneratedActivity(venue: Venue, sharedInterests: string[]): Promise<{ text: string; fallback: boolean }> {
  if (!isLlmAvailable()) {
    return { text: templateActivity(venue, sharedInterests), fallback: true };
  }
  try {
    const client = getClient();
    const interestList = sharedInterests.slice(0, 5).join(", ");
    const prompt = `You are Agent 3 in the Common Ground app. Write ONE warm, specific sentence (max 14 words) describing a small-group meetup at "${venue.name}" in ${venue.city} for a cluster who share these interests: ${interestList}. Do not include the date or time. Do not start with "Let's" or "Why not". Output the sentence only — no quotes, no preface.`;
    const res = await client.messages.create({
      model: MODEL,
      max_tokens: 60,
      messages: [{ role: "user", content: prompt }],
    });
    const block = res.content.find((b) => b.type === "text");
    const text = block && "text" in block ? block.text.trim().replace(/^["'“]|["'”]$/g, "") : "";
    if (!text) throw new Error("empty");
    return { text, fallback: false };
  } catch (err) {
    console.error("[agent3] phrasing failed, using template:", err);
    return { text: templateActivity(venue, sharedInterests), fallback: true };
  }
}

export async function propose(
  inputs: ProposalInputs,
  opts: { excludeActivityTitles?: Set<string> } = {},
): Promise<Proposal | null> {
  const { cluster, members, cityEvents, venues } = inputs;

  const agg = aggregatorPick(cluster, members, cityEvents, opts.excludeActivityTitles);
  if (agg) {
    const placeVenue = matchVenueToEvent(agg, venues);
    const placeName = placeVenue?.name ?? extractPlaceFromTitle(agg.title) ?? cluster.city;
    return {
      mode: "aggregated",
      activity: agg.title,
      place: {
        name: placeName,
        city: cluster.city,
        neighbourhood: placeVenue?.neighbourhood ?? "",
        meeting_point: placeVenue?.meeting_point ?? agg.source,
      },
      datetime: agg.datetime,
      source_note: agg.source,
      fallback: false,
    };
  }

  const venue = generatorPickVenue(cluster, members, venues);
  if (!venue) return null;

  const bestSlots = bestDayPartsForCluster(members);
  const dp = bestSlots[0] ?? "weekday-evening";
  const dt = nextDatetimeFor(dp);
  const { text, fallback } = await phraseGeneratedActivity(venue, cluster.shared_interests);

  return {
    mode: "generated",
    activity: text,
    place: { name: venue.name, city: venue.city, neighbourhood: venue.neighbourhood, meeting_point: venue.meeting_point },
    datetime: dt,
    fallback,
  };
}

// Turn a Proposal into a fresh Event record.
export function proposalToEvent(p: Proposal, clusterId: string): Event {
  return {
    id: `e-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    cluster_id: clusterId,
    mode: p.mode,
    activity: p.activity,
    place: p.place,
    time_options: [{ datetime: p.datetime, confirmations: [] }],
    declined: [],
    status: "proposed",
  };
}
