# Product Requirements Document — Common Ground

**Status:** Hackathon Minimum Viable Product (MVP) draft
**Pitch length:** 2 minutes (solution-first, no problem-framing)
**Build budget:** 1 day, Claude Code

> **Note on agent prompts.** This document defines what each agent does, its inputs, outputs, and product behaviour. The detailed agent instructions (system prompts, prompt templates, tool schemas) are out of scope for this PRD and will be authored directly with Claude Code during the build.

---

## 1. Problem

Newcomers to Dutch cities face structural loneliness in their first months. Traditional municipal outreach (flyers, community centres, helplines) reaches a self-selected minority. We replace one-off outreach with a system that keeps producing real meetings.

## 2. Solution (one paragraph)

An opt-in web app, offered by the municipality at the moment a newcomer registers in the city. Four AI agents work in orchestration: one builds the user's profile through a short interview, one clusters them with 4–6 others who share interests, one proposes a meetup (either an existing event in town or a self-organised one at a venue the cluster will like), and one closes the loop after the meetup. Existing Dutch residents can join the same flow to meet new people or help newcomers integrate.

## 3. Users

- **Primary:** Adults newly registered at a Dutch municipality — international students, skilled migrants/expats, European Union (EU) labor migrants.
- **Secondary:** Existing residents of Dutch cities. Same signup flow; profile carries a self-declared `status` of `newcomer` / `local-meet` / `local-help`.
- **Out of scope for v1:** refugees/status holders (separate inburgering track), minors.

## 4. Core loop

```
Agent 1 (Profile) → Agent 2 (Cluster) → Agent 3 (Meetup) → Event happens → Agent 4 (Follow-up) → user re-enters pool
```

Clusters are **one-shot**: each cluster exists to produce one meetup, then dissolves.

## 5. The four agents

### Agent 1 — Profile (live in MVP)
- **Trigger:** user finishes signup, opens the app for the first time.
- **Input:** empty `User` record.
- **Output:** completed `User` record (see section 6).
- **Approach:** **adaptive, state-driven conversational interview** via the Anthropic Application Programming Interface (API). Not a fixed script. Each turn, the agent inspects (a) which `User` fields are still missing and (b) what the user just said, then chooses either an **opening move** (a broad question that opens a still-empty field) or a **follow-up move** (a targeted question that drills into something the user just mentioned). The interview ends as soon as the completion criteria are met.
- **Conversation shape:** opens with a one-line AI self-identification + warm opener. One question per turn. Mirrors a phrase from the user's previous answer roughly every other turn so it feels heard. Typically 5–8 turns; soft-capped at 10.
- **Identifies itself as an Artificial Intelligence (AI) agent in the opening message.**
- **Does not ask** about emotional state, loneliness, nationality, country of origin, or exact age. Never asks more than one question per turn. Never re-asks something already answered.
- **Done when:** at least 5 interest tags, an availability window, a neighbourhood, and a `status` are set (plus `display_name`, `life_stage`, `what_brought_you_here`, `languages_spoken`). If the 10-turn soft cap is reached first, the record is marked complete with whatever is filled and the user tops it up on the profile-summary screen.

### Agent 2 — Cluster (live in MVP, basic matching)
- **Trigger:** user taps "Find me a new group" on the Now tab.
- **Input:** the pool of eligible users (see Pool definition below).
- **Output:** a `Cluster` record with 4–6 `member_ids` and a `shared_interests` tag list.
- **Approach (MVP):** tag-overlap baseline. Compute Jaccard overlap of interest tags between the seed user and each candidate in the same city with overlapping availability. Greedy-pick the top 4–5 candidates. No embeddings, no Large Language Model (LLM) call. Real adjacency matching ("football near padel") is a Future improvement.
- **Pool definition:** a user is in the pool if (a) their `profile_complete = true`, (b) they are not currently in an active cluster, and (c) they have tapped "Find me a new group" since their last cluster.
- **Status-agnostic:** `newcomer` and `local` users are mixed freely; status is metadata, not a clustering input.

### Agent 3 — Meetup proposer (live in MVP, hybrid mode)
- **Trigger:** a `Cluster` reaches `status = active`.
- **Input:** the `Cluster` record + the city's `CityEvent` seed list + the city's `Venue` seed list.
- **Output:** one `Event` record with activity, place, and one or more proposed time options.
- **Approach:** **aggregator-first, generator fallback.**
  1. Scan the `CityEvent` list for a real upcoming event matching the cluster's `shared_interests` and members' availability. If one fits → propose it ("Tango night at De Markt, Friday 20:00").
  2. If nothing fits → fall back to **generator mode**: pick a venue from the `Venue` list and propose a self-organised meetup ("Pizza together at Sugo, Saturday 19:00").
- **One proposal per cluster.**
- **Public venues only**, no reservations, no liability.
- **Reschedule mechanic:** parallel time options on the event card, capped at 3 total times per event. Any user can add a counter-proposal time. Each user can confirm one time, decline all, or add a third time. First time to reach 3 confirmations locks the event.

### Agent 4 — Follow-up (mocked in MVP)
- **Trigger (post-MVP):** event status flips to `completed`.
- **Input:** the `Event` record + attendee list.
- **Output:** a single post-event prompt — *"Met someone you'd like to stay in touch with? Add them as a contact."* User picks who to keep, the app exchanges handles between the two users.
- **MVP behaviour:** UI screen only, no live LLM call, no scheduling. Demo shows it as the final step of the flow with a caption.

## 6. Shared data model

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

## 7. Screen flow

The web app has two modes.

### Onboarding wizard (linear, no navigation)
1. **Landing / entry** — reached via Quick Response (QR) code or email link. Two-line explanation, "Start" button.
2. **Signup** — email + password. No verification, no reset.
3. **Agent 1 chat** — chat interface. Progress indicator is a completion bar driven by filled fields (e.g. "Profile 3 / 8 filled"), not a turn counter, since the interview is adaptive.
4. **Profile summary** — review and edit all extracted fields.
5. **"Looking for your group"** — short loading screen, Agent 2 runs.

### Main app (after wizard completes — three bottom-nav tabs)
- **Now** — current cluster state. Three possible states:
  - Between clusters: empty state with "Ready for a new group?" button → triggers Agent 2.
  - In a forming cluster: cluster members + shared theme + "Agent 3 is preparing a proposal."
  - In an active cluster with a proposal: link to the Events tab.
- **Events** — three sections:
  - **To confirm** — proposals with parallel time options, confirm / decline / add-another-time actions.
  - **Upcoming** — fired events with meeting point and time.
  - **Past** — completed events with the Agent 4 follow-up prompt.
- **Profile** — editable profile data, logout, account deletion.

General layout: single column, mobile-first responsive widths. Every agent screen carries a transparency notice: *"You're talking to an AI agent."*

## 8. Event card interaction (the load-bearing screen)

The Events → "To confirm" card supports:
- View the proposed activity, place, and meeting point.
- Up to 3 parallel time options, each showing a confirmation count and the current user's choice state.
- Three actions per user:
  - **I'm in** for a specific time.
  - **Can't make it** (decline all times, removes from cluster for this event).
  - **Suggest another time** (adds a new time option, capped at 3 total per event).
- **Quorum:** first time option to reach 3 confirmations locks the event. All other time options drop. Event moves to Upcoming.
- **Failure:** if no time option reaches 3 confirmations within 48 hours (or before the earliest proposed time, whichever comes first), the event is cancelled, the cluster dissolves, members return to the pool — but users must tap "Find me a new group" again to re-enter.

## 9. Acquisition

- The municipality offers the app at the registration desk (QR code with the welcome packet) and via a welcome email a few days after registration.
- App is fully opt-in. No automatic enrollment.
- Existing residents discover via municipal channels and word of mouth.

## 10. Privacy and compliance

- Opt-in only — no enrollment by the municipality.
- No Burgerservicenummer (BSN) link in v1. The app never receives identity data from the government.
- **Basic authentication** in v1: email + password, no verification, no reset. Email is used for identity only — no outbound mail.
- **No loneliness scoring.** The app does not classify users as lonely.
- **No nationality, country-of-origin, or exact-age collection.**
- General Data Protection Regulation (GDPR): profile data is editable, deletable (account deletion in Profile tab), and exportable on request.
- EU Artificial Intelligence Act (AI Act): system is positioned as limited-risk (recommender). Transparency notice shown at the start of each agent interaction.
- The University of California Los Angeles 3-item loneliness scale (UCLA-3) used for impact measurement is self-reported, anonymous, and aggregated — never tied to a profile.

## 11. Success metrics

1. **Activation** — % of installed users who attend at least 1 meetup within 30 days of install.
2. **Repeat connection** — % of users who attend ≥2 meetups across separate clusters with at least one overlapping co-attendee.
3. **Loneliness delta** — UCLA-3 score at install vs. 90 days, aggregated.

## 12. MVP scope (1-day build)

- Responsive web app, accessible via QR code at the registration desk and a follow-up email link. Stack decided by Claude Code.
- Basic auth (email + password).
- Agent 1 runs live against the Anthropic API.
- Seeded database per pilot city:
  - ~30 fake user profiles spread across the 3 pilot cities.
  - ~20 curated public venues per city (generated by Claude at seed time, quick human pass).
  - ~10 plausible local events per city (generated by Claude at seed time, quick human pass).
- Agents 2 and 3 run live against the seeded data.
- Agent 4 is a mocked UI screen for the demo (no live logic).

## 13. Out of scope for MVP

The build does not include:

- Email verification, password reset, social login.
- Email or Short Message Service (SMS) sending. In-app states only.
- Push notifications.
- Payments or paid tiers.
- Multi-language User Interface (UI). UI and Agent 1 are English only.
- Settings or preferences panel beyond Profile.
- Admin panel, moderation tools, reporting.
- Real geolocation. City and neighbourhood are user-declared.
- Real-time messaging or chat between users.
- Calendar integration.
- Scheduled re-clustering (re-clustering is user-triggered only).

## 14. Demo resilience

The pitch is the priority. If a live LLM call fails during the demo, the affected agent falls back to a pre-written illustrative response or a static screen. Each agent screen has a hard-coded happy-path message so the orchestration can be walked through end-to-end without any live API call if needed.

## 15. Orchestration narrative (the pitch line)

> *One agent builds your profile. One groups you with people who share what you like. One proposes a meetup — either something already happening in town, or a place the group will enjoy. One closes the loop afterwards. Together they replace one-off flyers with a system that keeps producing real meetings.*

## 16. Pitch demo flow (2 minutes)

1. Solution — what the app is.
2. Acquisition — how newcomers get to it (municipality offer, opt-in).
3. Orchestration — what the four agents do together.

No time spent on problem framing.

## 17. Future improvements

- **Real matching.** Embedding-based interest adjacency ("football" near "padel"), LLM-as-matcher with explainable cluster themes.
- **Scheduled re-clustering.** Daily batch instead of user-triggered.
- **Communication channel inside a cluster.** Beyond the event card: free-text group chat scoped to the cluster.
- **Persistent or time-boxed clusters** for users who want recurring groups instead of one-shot.
- **Agent 4 lives.** Self-report attendance check-in, real follow-up prompts, repeat-co-attendee tracking.
- **BSN-linked newcomer verification** with explicit consent flow.
- **Adapted onboarding** for EU labor migrants (alternative channels, language defaults).
- **Integration with the inburgering track** for refugees/status holders.
- **Multi-language Agent 1** (Ukrainian, Arabic, Polish, Romanian).
- **Aggregator depth.** Real connectors to Eventbrite, Meetup, municipal cultural calendars.
- **Elevated "anchor/host" role** for engaged locals.
- **Direct messaging** between users who exchanged contacts via Agent 4.
- **Multi-city expansion** beyond the 3 pilot cities.
- **Push notifications** for proposals and reminders.
- **Calendar integration.**
- **Full GDPR Subject Access Request (SAR) flow** including data export.

## 18. Locked decisions

- **Name:** Common Ground.
- **Platform:** web app. No native mobile, no progressive web app (PWA) shell.
- **Pilot cities:** Rotterdam, Amsterdam, The Hague.
- **Stack:** decided and built by Claude Code in one day.
- **Auth:** email + password, no verification, no reset.
- **Cluster lifecycle:** one-shot. Dissolve after event fires or fails.
- **Re-clustering:** user-triggered from the Now tab.
- **Matching pool:** users with `profile_complete = true`, not in an active cluster, who have tapped "Find me a new group."
- **Event coordination:** parallel time options capped at 3, first to 3 confirmations wins.
- **Agent prompts:** authored directly with Claude Code during the build, not in this PRD.
