# CLAUDE.md — Common Ground

> Read this file end-to-end before writing a single line of code. It is the operating contract for this build, plus the full descriptive context you need to make sensible micro-decisions without round-tripping for every detail.
>
> The Product Requirements Document (PRD) at `CommonGround-PRD.md` is canonical. This file mirrors enough of it for self-contained Claude Code sessions, but if the two ever conflict, **the PRD wins** — flag the conflict and stop.

---

## 1. What we are building

**Common Ground** is an opt-in web app, offered by Dutch municipalities at the moment a newcomer registers in the city. Four Artificial Intelligence (AI) agents work in orchestration:

1. One builds the user's profile through a short conversational interview.
2. One clusters them with 4–6 others who share interests.
3. One proposes a meetup — either an existing event in town or a self-organised one at a venue the cluster will like.
4. One closes the loop after the meetup.

Existing Dutch residents can join the same flow either to meet new people themselves or to help newcomers integrate. The app replaces one-off municipal outreach (flyers, community centres, helplines) with a system that **keeps producing real meetings**.

### The problem we are solving (context only — not in the pitch)

Newcomers to Dutch cities face structural loneliness in their first months. Traditional municipal outreach reaches a self-selected minority — the people who most need connection rarely show up to "loneliness initiatives." A coalition of three Dutch municipalities (Rotterdam, Amsterdam, The Hague) wants something that enables real human connection at scale, without feeling like surveillance, without "diagnosing" residents as lonely, and inside General Data Protection Regulation (GDPR) and European Union Artificial Intelligence Act (EU AI Act) constraints.

**The 2-minute pitch does not spend time on this problem framing.** It is here only so you understand the design choices.

---

## 2. Users

- **Primary:** Adults newly registered at a Dutch municipality — international students, skilled migrants and expats, European Union (EU) labor migrants.
- **Secondary:** Existing residents of Dutch cities. Same signup flow; profile carries a self-declared `status` of `newcomer`, `local-meet`, or `local-help`.
- **Out of scope for v1:** Refugees and status holders (they have a separate inburgering track), minors.

Clustering is **status-agnostic**: newcomers and locals are mixed freely. Status is metadata, not a clustering input.

---

## 3. Acquisition

- The municipality offers the app at the registration desk via a Quick Response (QR) code in the welcome packet, and via a welcome email a few days after registration.
- The app is **fully opt-in**. No automatic enrollment, no link to the Burgerservicenummer (BSN) in v1.
- Existing residents discover the app through municipal channels and word of mouth.

---

## 4. The core loop

```
Agent 1 (Profile) → Agent 2 (Cluster) → Agent 3 (Meetup) → Event happens → Agent 4 (Follow-up) → user re-enters pool
```

**Clusters are one-shot.** Each cluster exists to produce one meetup, then dissolves. To re-enter the pool, a user must tap "Find me a new group" on the Now tab.

---

## 5. The four agents

### Agent 1 — Profile (live in Minimum Viable Product (MVP))

- **Trigger:** User finishes signup, opens the app for the first time.
- **Input:** Empty `User` record.
- **Output:** Completed `User` record.
- **Approach:** **Adaptive, state-driven conversational interview** against the Anthropic Application Programming Interface (API). The agent does not follow a fixed script. On every turn it:
  1. Inspects the current partial `User` record to see which fields are still missing or thin.
  2. Inspects the user's most recent answer for hooks worth pulling on (a hobby mentioned in passing, an ambiguity, an interesting detail).
  3. Chooses **one** of two move types:
     - **Opening move** — a broad, warm question that opens a still-empty field (e.g. *"What brought you to Rotterdam?"*, *"How do you like to spend a free Saturday?"*).
     - **Follow-up move** — a targeted question that drills into something the user just said (e.g. user mentions "running" → *"Do you prefer running alone or with company? And early morning or evening?"*; user mentions a child → *"Got it — does that shape when you'd actually be free to meet people?"*).
  4. Decides whether the conversation is done (see completion criteria below). If yes, it stops asking and ends with a warm wrap-up line.
- **Conversation shape:**
  - Opens with a one-line self-identification as an AI agent + one warm opener.
  - Mixes broad and targeted questions; never asks two unrelated things in one turn.
  - Mirrors a phrase from the user's previous answer in roughly every other turn so it feels heard, not robotic.
  - Typically 5–8 turns. Soft cap at **10 turns** — at the cap, the agent stops and lets the user edit anything missing on the profile-summary screen.
- **Field extraction:** After every user reply, the agent updates the partial `User` record (extracting `display_name`, `life_stage`, `what_brought_you_here`, `languages_spoken`, `languages_to_practice`, `interests` (tags), `availability` slots, `neighbourhood`, `status`). Extraction can happen across many turns — a single field does not have to come from a single turn.
- **Hard rules:**
  - Identifies itself as an AI agent in the opening message.
  - Never asks about emotional state, loneliness, nationality, country of origin, or exact age.
  - Never asks more than one question per turn.
  - Never re-asks something the user already answered, unless clarifying.
- **Done when:** At least **5 interest tags**, at least **one availability window**, a **neighbourhood**, and a **`status`** are set (plus `display_name`, `life_stage`, `what_brought_you_here`, `languages_spoken`). Set `profile_complete = true`. If the soft cap of 10 turns is hit before completion, mark the record complete with whatever is filled, and rely on the profile-summary screen for the user to top it up.
- **Implementation note:** Run the agent as a single Claude conversation with a system prompt that contains (a) the target `User` schema, (b) the move-selection rules above, (c) the hard rules, and (d) an instruction to emit, alongside each assistant message, a structured `profile_patch` (JavaScript Object Notation (JSON)) with any fields extracted from the most recent user turn. The server merges patches into the partial `User` record between turns.

### Agent 2 — Cluster (live in MVP, basic matching)

- **Trigger:** User taps "Find me a new group" on the Now tab. Also fires automatically at the end of onboarding.
- **Input:** The pool of eligible users (see Pool definition below).
- **Output:** A `Cluster` record with 4–6 `member_ids` and a `shared_interests` tag list.
- **Approach (MVP):** Tag-overlap baseline. Compute Jaccard overlap of `interests` between the seed user and each candidate in the same city with overlapping availability. Greedy-pick the top 4–5 candidates. **No embeddings, no Large Language Model (LLM) call.** Real adjacency matching ("football" near "padel") is a future improvement, explicitly out of scope.
- **Pool definition:** A user is in the pool if (a) `profile_complete = true`, (b) they are not currently in an active cluster, and (c) they have tapped "Find me a new group" since their last cluster.

### Agent 3 — Meetup proposer (live in MVP, hybrid mode)

- **Trigger:** A `Cluster` reaches `status = active`.
- **Input:** The `Cluster` record + the city's `CityEvent` seed list + the city's `Venue` seed list.
- **Output:** One `Event` record with activity, place, and one or more proposed time options.
- **Approach: aggregator-first, generator fallback.**
  1. Scan the `CityEvent` list for a real upcoming event matching the cluster's `shared_interests` and members' availability. If one fits, propose it (e.g. *"Tango night at De Markt, Friday 20:00"*).
  2. If nothing fits, fall back to **generator mode**: pick a venue from the `Venue` list whose `good_for` tags overlap with `shared_interests`, and propose a self-organised meetup (e.g. *"Pizza together at Sugo, Saturday 19:00"*).
- **One proposal per cluster.** Public venues only. No reservations, no liability.
- **Reschedule mechanic:** Parallel time options on the event card, capped at **3 total times per event**. Any user can add a counter-proposal time. Each user can confirm one time, decline all, or add a third time. **First time to reach 3 confirmations locks the event.**

### Agent 4 — Follow-up (mocked in MVP)

- **Trigger (post-MVP):** Event status flips to `completed`.
- **Input:** The `Event` record + attendee list.
- **Output:** A single post-event prompt — *"Met someone you'd like to stay in touch with? Add them as a contact."* The user picks who to keep; the app exchanges handles between the two users.
- **MVP behaviour:** UI screen only, no live LLM call, no scheduling logic. The demo shows it as the final step of the flow with a caption.

---

## 6. Data model

Implement exactly as defined below. Do not add fields. Do not rename. Agent prompts and seed data are written against this shape.

```
User {
  id
  display_name           chosen handle, not legal name
  email                  used for auth only, never sent to
  status                 "newcomer" | "local-meet" | "local-help"
  life_stage             "student" | "early-career" | "mid-career" | "established" | "retired"
  what_brought_you_here  "study" | "work" | "family" | "partner" | "other"
  city                   "Rotterdam" | "Amsterdam" | "The Hague"
  neighbourhood          free text
  arrival_date           date, newcomers only
  languages_spoken       [string]
  languages_to_practice  [string], optional
  interests              [tag]
  availability           [{day_part: "weekday-evening" | "weekend-day" | ...}]
  profile_complete       boolean
  in_active_cluster      boolean
}

Cluster {
  id
  city
  member_ids             [user_id]   (4–6)
  shared_interests       [tag]
  status                 "forming" | "active" | "dissolved"
  created_at
}

Event {
  id
  cluster_id
  mode                   "aggregated" | "generated"
  activity               string
  place                  {name, city, neighbourhood, meeting_point}
  time_options           [{datetime, confirmations: [user_id]}]    max 3
  declined               [user_id]
  status                 "proposed" | "fired" | "cancelled" | "completed"
}

Venue {
  id
  city
  neighbourhood
  name
  meeting_point          e.g. "Markthal main entrance"
  good_for               [tag]
}

CityEvent {                                                       seed data only in MVP
  id
  city
  title
  datetime
  tags                   [tag]
  source                 free text, e.g. "Rotterdam cultural calendar"
}

Contact {                                                         created by Agent 4 prompt
  id
  from_user_id
  to_user_id
  via_event_id
}
```

**Key invariants:**
- A user enters the matching pool only when `profile_complete = true` AND `in_active_cluster = false` AND they have tapped "Find me a new group" since their last cluster.
- A `Cluster` has 4–6 `member_ids`. Status flows: `forming` → `active` → `dissolved`.
- An `Event` has at most 3 `time_options`. First option to reach 3 confirmations locks the event and drops the others.
- Clusters are **one-shot**. Dissolve after the event fires or fails.

---

## 7. Screen flow

The web app has two modes: a linear onboarding wizard, then the main 3-tab app.

### Onboarding wizard (linear, no navigation)

1. **Landing / entry** — reached via QR code or email link. Two-line explanation, "Start" button.
2. **Signup** — email + password. No verification, no reset.
3. **Agent 1 chat** — chat interface. Progress indicator is a **completion bar driven by filled fields** (e.g. "Profile 3 / 8 filled"), not a turn counter — the interview is adaptive, so total turn count is not known in advance.
4. **Profile summary** — review and edit all extracted fields.
5. **"Looking for your group"** — short loading screen; Agent 2 runs.

### Main app (3 bottom-nav tabs)

- **Now** — current cluster state. Three possible states:
  - *Between clusters:* empty state with "Ready for a new group?" button → triggers Agent 2.
  - *In a forming cluster:* cluster members + shared theme + "Agent 3 is preparing a proposal."
  - *In an active cluster with a proposal:* link to the Events tab.
- **Events** — three sections:
  - *To confirm* — proposals with parallel time options, with confirm / decline / add-another-time actions.
  - *Upcoming* — fired events with meeting point and time.
  - *Past* — completed events with the Agent 4 follow-up prompt.
- **Profile** — editable profile data, logout, account deletion.

**Layout rules:**
- Single column, mobile-first responsive widths.
- Every agent screen carries the transparency notice: *"You're talking to an AI agent."*

---

## 8. The event card — the load-bearing screen

The Events → "To confirm" card is the most demoed surface in the app. Build it carefully.

**It supports:**
- Viewing the proposed activity, place, and meeting point.
- Up to 3 parallel time options, each showing a confirmation count and the current user's choice state.
- Three actions per user:
  - **I'm in** for a specific time.
  - **Can't make it** (decline all times; removes the user from the cluster for this event).
  - **Suggest another time** (adds a new time option, capped at 3 total per event).

**Quorum logic:**
- The first time option to reach **3 confirmations** locks the event. All other time options drop. The event moves to the Upcoming section.

**Failure logic:**
- If no time option reaches 3 confirmations within 48 hours (or before the earliest proposed time, whichever comes first), the event is cancelled, the cluster dissolves, and members return to the pool — but users must tap "Find me a new group" again to re-enter.

---

## 9. Privacy and compliance

These are not nice-to-haves. They are part of the product positioning and the political viability of the pilot. Honour them in every build decision:

- **Opt-in only.** No enrollment by the municipality.
- **No BSN link in v1.** The app never receives identity data from the government.
- **Basic authentication in v1:** email + password, no verification, no reset. Email is used for identity only — no outbound mail.
- **No loneliness scoring.** The app does not classify users as lonely. Anywhere.
- **No nationality, country-of-origin, or exact-age collection.** Agent 1 will not ask about these.
- **GDPR:** Profile data is editable, deletable (account deletion in the Profile tab), and exportable on request.
- **EU AI Act:** The system is positioned as limited-risk (recommender). A transparency notice is shown at the start of each agent interaction.
- The University of California Los Angeles 3-item loneliness scale (UCLA-3) used for impact measurement is self-reported, anonymous, and aggregated — **never tied to a profile**.

---

## 10. Success metrics

We are building the demo, not the analytics. But you should understand what the product is trying to move:

1. **Activation** — percent of installed users who attend at least 1 meetup within 30 days of install.
2. **Repeat connection** — percent of users who attend ≥2 meetups across separate clusters with at least one overlapping co-attendee.
3. **Loneliness delta** — UCLA-3 score at install vs. 90 days, aggregated.

This is why the loop dissolves clusters after one meetup but keeps re-clustering people: we are optimising for repeat connection across clusters, not for one big sticky group chat.

---

## 11. Prime directive

**This is a 1-day hackathon build. The deliverable is a 2-minute solution-first pitch demo, not a production system.**

Every technical decision is evaluated against one question: **"Does this make the demo more convincing, or just more correct?"**

- Pitchable beats engineering-correct.
- Demo-resilient beats feature-complete.
- Visible beats clever.
- Hard-coded fallback beats live-but-fragile.

The known failure mode for this build is **overengineering**. If you find yourself adding auth flows, database migrations, error boundaries, or test suites beyond the absolute minimum, stop and re-read this section.

---

## 12. The pitch we are building toward

This is the orchestration narrative the demo must visibly support. Memorise it:

> *One agent builds your profile. One groups you with people who share what you like. One proposes a meetup — either something already happening in town, or a place the group will enjoy. One closes the loop afterwards. Together they replace one-off flyers with a system that keeps producing real meetings.*

The demo flow (2 minutes total):

1. **Solution** — what the app is.
2. **Acquisition** — QR code at the municipal registration desk, opt-in.
3. **Orchestration** — the four agents in sequence.

**No time is spent on problem framing.** The audience already knows loneliness is a problem.

---

## 13. Hard constraints

| Constraint | Reason |
|---|---|
| Web app only, mobile-first responsive | Locked in PRD §18. No native, no Progressive Web App (PWA) shell. |
| English-only User Interface (UI) and Agent 1 | Out of scope per PRD §13. |
| Email + password auth, no verification, no reset | Locked in PRD §18. Treat this as a fake session, not real auth. |
| No outbound email, Short Message Service (SMS), or push notifications | In-app states only. |
| No real geolocation | City and neighbourhood are user-declared. |
| No real-time chat between users | Coordination happens only via the event card. |
| Seeded data only | ~30 fake users, ~60 venues, ~30 city events across 3 cities. |
| Agent 4 is a mocked UI screen | No live LLM call. UI only. |

---

## 14. Recommended stack (you decide, but stay inside these constraints)

PRD §18 leaves the stack to you. Pick something you can deploy in a day with no surprises. The following is a strong default — deviate only with a reason:

- **Framework:** Next.js (App Router) — single repo, server components plus API routes for agent calls.
- **Styling:** Tailwind CSS. No design system, no component library beyond `shadcn/ui` if it saves time.
- **Data layer:** SQLite via Prisma, **or** plain JavaScript Object Notation (JSON) files in `/seed`. Pick whichever is faster to demo. The data is all seeded — there is no real write traffic worth a database for.
- **Auth:** A cookie-based fake session. Email + password lives in a `users` table or JSON file. **Do not pull in NextAuth or Better Auth.** Two API routes (`/api/signup`, `/api/login`) and a cookie are enough.
- **LLM:** Anthropic Software Development Kit (SDK), `claude-sonnet-4-5` or `claude-opus-4-5`. Streaming for Agent 1's chat is nice but optional — non-streaming is fine if streaming costs an hour.
- **Deploy:** Vercel. One `git push` to demo.

**Non-negotiables regardless of stack:**
- Mobile-first responsive widths. The judges will view it on a phone-sized window.
- Every agent screen carries the transparency notice: *"You're talking to an AI agent."*
- The app must work end-to-end with the live Anthropic API down (see §16, Demo resilience).

---

## 15. Build order

Build in this order. Do not skip ahead. Each stage must demo on its own before moving on.

1. **Skeleton + nav.** Three-tab layout (Now / Events / Profile), routing, empty states. Mobile-first.
2. **Seed data.** Drop in the `seed-data.md` content as JSON or database (DB) seed. ~30 users, ~60 venues, ~30 city events across the three cities.
3. **Onboarding wizard.** Landing → signup → Agent 1 chat → profile summary → "Looking for your group" loading screen. Agent 1 is the only live LLM call in the wizard.
4. **Now tab.** Three states: between clusters / forming cluster / active cluster.
5. **Agent 2 (clustering).** Tag-overlap Jaccard match against the seeded user pool. No embeddings, no LLM. Pure logic.
6. **Agent 3 (meetup proposer).** Aggregator-first (scan `CityEvent` seed list), generator fallback (pick a `Venue`). One proposal per cluster.
7. **Events tab.** To confirm / Upcoming / Past sections. Event card with up to 3 parallel time options, confirm / decline / add-time actions, quorum logic (first time to 3 confirmations wins).
8. **Agent 4 screen.** Static mock — "Met someone you'd like to stay in touch with?" with selectable contacts. No live logic.
9. **Demo resilience pass.** Pre-write every agent's fallback response. Hard-code a happy-path message for each screen so the orchestration walks end-to-end with zero live API calls if needed.
10. **Polish only after 1–9 are done.** Animations, loading states, micro-copy — last hour only.

If you fall behind, cut from the end. **Never cut from steps 1–7.**

---

## 16. Demo resilience — non-negotiable

**Assume the Anthropic API will fail during the live demo. The build must survive that.**

For every live agent (1 and 3):
- Wrap the API call in a `try / fallback` pattern.
- Pre-write a **hand-crafted illustrative response** that fires on API failure. Store these in `/lib/fallbacks/` as plain TypeScript constants (or equivalent). They must be on-brand, natural, and indistinguishable from a live response in the demo.
- Every agent-driven screen must also have a **hard-coded happy-path message** that can be triggered by a query parameter or environment flag (e.g. `?demo=true`) so the entire orchestration walks end-to-end without any live API call if the conference Wi-Fi dies.

For every screen:
- No blank states. Every screen renders something meaningful with seed data alone.
- No error toasts visible to the audience. Errors log silently; the UI falls back.

**Test before the pitch:** open the laptop in airplane mode and walk the full demo. If anything breaks, the demo is not ready.

---

## 17. Seed data

The seed data will live in `seed-data.md` (and a derived `seed.json` or DB seed script). Until that file exists, ask before generating new fake users — we do not want a different cast of characters in every conversation.

Required volumes per PRD §12:
- ~30 fake user profiles spread across Rotterdam, Amsterdam, The Hague.
- ~20 curated public venues per city (~60 total).
- ~10 plausible local events per city (~30 total).

Seed users must be diverse across `status`, `life_stage`, `interests`, and `availability` so that:
- Agent 2 finds a clean cluster for the demo user every time.
- Agent 3 has both an aggregator hit and a generator fallback path available depending on which demo user you sign in as.

The demo user (the one shown on stage) is pre-seeded and named in `seed-data.md`. Do not generate a fresh demo user during the build.

---

## 18. Out of scope (do not build)

Per PRD §13:

- Email verification, password reset, social login.
- Outbound email, SMS, push notifications.
- Payments.
- Multi-language UI or multi-language Agent 1.
- Settings panel beyond Profile.
- Admin tools, moderation, reporting.
- Real geolocation.
- Real-time messaging.
- Calendar integration.
- Scheduled re-clustering (re-clustering is user-triggered only).
- Embedding-based or LLM-based matching for Agent 2.
- Real connectors to Eventbrite, Meetup, or municipal calendars.

If a feature is not in the PRD, **assume it is out of scope and ask before building it.**

---

## 19. Locked decisions (PRD §18 — do not change without an explicit prompt)

- **Name:** Common Ground.
- **Platform:** web app. No native, no PWA.
- **Pilot cities:** Rotterdam, Amsterdam, The Hague.
- **Auth:** email + password, no verification, no reset.
- **Cluster lifecycle:** one-shot. Dissolves after event fires or fails.
- **Re-clustering trigger:** user-tapped from the Now tab.
- **Matching pool definition:** `profile_complete = true`, not in an active cluster, tapped "Find me a new group."
- **Event coordination:** parallel time options capped at 3, first to 3 confirmations locks the event.

---

## 20. House style for code

- TypeScript everywhere. No plain JavaScript files.
- One file per component. Server components by default, client components only where interaction requires it.
- No premature abstraction. If you have one caller, inline it.
- No tests in this build. We are shipping a demo, not a library. (Yes, really.)
- No commits to `main` without the app running locally. Broken `main` kills the demo.

---

## 21. Communication style

The human you are building this with prefers:

- **Terse responses, no preamble.** Skip "Great question!" and "Here's how I'd approach this."
- **Direct disagreement** when they are wrong. No hedging.
- **"I don't know"** when you don't know. No guessing.
- **No beginner-level over-explanation** unless explicitly asked. They have technical context.
- **Full names on first use of abbreviations** (e.g. "Product Requirements Document (PRD)"), abbreviation after.

When in doubt about scope, **ask before building**. A 30-second clarification beats an hour of rework.

---

## 22. When in doubt — heuristics

1. **Does this make the 2-minute pitch more convincing?** If no, cut it.
2. **Can a judge see this on the demo screen?** If no, deprioritise it.
3. **Does this depend on the live Anthropic API not failing?** If yes, build the fallback first.
4. **Is this in the PRD?** If no, ask.
5. **Am I about to add a library?** If yes, justify it in one sentence first.
6. **Am I about to write a test?** Don't.

---

*End of CLAUDE.md. The PRD is the spec. This file is the operating contract for honouring it under hackathon constraints, plus enough product context to make good local calls.*
