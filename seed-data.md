# Common Ground — seed data

Canonical record of the fake cast and content the app demos against. Files live in `/seed`.

| File | Volume | Notes |
|---|---|---|
| `seed/transcripts.json` | 80 fictional interview transcripts | Hand-written. Input to Agent 1's extraction prompt. |
| `seed/users.json` | 80 derived `User` records | Hand-deterministic copies of the transcripts. Re-deriving from the LLM extractor is optional via `npm run seed:extract`. |
| `seed/venues.json` | 60 venues (20 / city) | Hand-written. Used by Agent 3's generator path. |
| `seed/city-events.json` | 30 real-shape events (10 / city) | Hand-written. Used by Agent 3's aggregator path. Dates fall 21 May – 7 Jun 2026. |

## Demo user

**Pre-seeded for the demo flow:** the user shown on stage signs in as **Maya** (`u-r-pw-01`) — Rotterdam, newcomer, master's student, photo-walks cluster. Demo path:

1. Sign in as Maya (or sign up fresh with the same email — same persona).
2. Tap *"Find me a new group"* on Now.
3. Agent 2 clusters Maya with 4–5 of the 12 other photo-walks users in Rotterdam. Different runs can pick a different mix (top-scoring tight set), so the demo doesn't always show the same five faces.
4. Agent 3's aggregator path hits `ce-r-01` (Maashaven sunset photo walk, Friday 22 May 19:30). Generator fallback would otherwise pick a venue like Het Park or Nederlands Fotomuseum.
5. Confirm a time → quorum locks at 3 → event moves to Upcoming.

**Confirm or change:** if you want to play yourself on stage instead of Maya, tell me and I'll add an `u-r-pw-00` transcript with your name and otherwise the same cluster signature.

## Interest clusters (intentional)

The 80 transcripts are designed around 6 micro-clusters, two per city. Each cluster shares 3–5 strong interest tags so Agent 2's Jaccard match finds a clean 4–5-person group every run. With 13–14 members per cluster, different demo runs pick different cluster compositions and the demo doesn't look rigged on closer inspection.

| City | Cluster | Anchor tags | Members | Count |
|---|---|---|---|---|
| Rotterdam | photo-walks | long walks, photography, slow coffee, film, books | `u-r-pw-01..13` | 13 |
| Rotterdam | cook-games | home cooking, board games, vegan, baking, wine | `u-r-cg-01..14` | 14 |
| Amsterdam | live-music | live music, jazz, cycling, beer, bars | `u-a-lm-01..13` | 13 |
| Amsterdam | outdoors | running, yoga, padel, hiking, outdoors | `u-a-od-01..14` | 14 |
| The Hague | quiet-curious | chess, books, language exchange, museums, theatre | `u-h-qc-01..13` | 13 |
| The Hague | dance | tango, salsa, dance, latin music, language exchange | `u-h-dn-01..13` | 13 |

## Status / life-stage spread

Across all 80: 56 newcomers, 12 local-meet, 12 local-help. Spread of life stages: 11 student, 42 early-career, 19 mid-career, 4 established, 4 retired. What-brought-you-here for newcomers: a mix of study, work (the biggest slice), family, and partner. Languages skew non-Dutch primary for newcomers and Dutch-primary for locals.

## Regenerating `seed/users.json`

```powershell
# put your key in .env.local first
npm run seed:extract
```

The script reads `seed/transcripts.json`, sends each transcript to Agent 1's extraction prompt, and writes the resulting 80-user roster to `seed/users.json`. Cost ≈ $1.00–$1.50 per full run. Idempotent — re-running just overwrites. Commit the resulting `users.json` so the app boots without an extraction step.

If a transcript extraction fails, the script logs `FAIL` and continues — re-run after fixing the issue. If the LLM omits a field, `run-extraction.ts` backfills sensible defaults (city from the transcript hint, etc.) before writing the user record.

## Editing transcripts

Each entry in `seed/transcripts.json` has:

```jsonc
{
  "id": "u-r-pw-01",         // stable user id; also the email local-part
  "city": "Rotterdam",       // backfill used if extraction omits city
  "cluster_hint": "photo-walks", // for human navigation only; not extracted
  "replies": ["...", "...", "...", "...", "..."] // 4–6 user-side answers
}
```

After editing, re-run `npm run seed:extract` and commit both files.

## Adding venues or city events

Both files are plain JSON arrays. Add new entries by hand, keep tags lowercase, and prefer short noun phrases. Venue `good_for` and city-event `tags` should overlap with the interest tags above so Agent 3 has plenty of matches.
