// Shared data model. Mirrors CLAUDE.md §6. Do not add fields without updating that doc.

export type City = "Rotterdam" | "Amsterdam" | "The Hague";

export type Status = "newcomer" | "local-meet" | "local-help";

export type LifeStage = "student" | "early-career" | "mid-career" | "established" | "retired";

export type WhatBroughtYouHere = "study" | "work" | "family" | "partner" | "other";

export type DayPart =
  | "weekday-morning"
  | "weekday-day"
  | "weekday-evening"
  | "weekend-morning"
  | "weekend-day"
  | "weekend-evening";

export interface AvailabilitySlot {
  day_part: DayPart;
}

export interface User {
  id: string;
  display_name: string;
  email: string;
  status: Status;
  life_stage: LifeStage;
  what_brought_you_here: WhatBroughtYouHere;
  city: City;
  neighbourhood: string;
  arrival_date?: string;
  languages_spoken: string[];
  languages_to_practice?: string[];
  interests: string[];
  availability: AvailabilitySlot[];
  profile_complete: boolean;
  // Legacy: was the single-cluster gate. Multi-cluster is now allowed; active-cluster
  // membership is derived from store.clusters. This field is no longer authoritative.
  in_active_cluster: boolean;
}

// Same as User but every field optional — the partial state Agent 1 accumulates turn by turn.
export type PartialUser = Partial<Omit<User, "id" | "email" | "profile_complete" | "in_active_cluster">>;

// The curated subset of a User that's safe to share with other cluster members.
// Deliberately excludes: email, status, life_stage, what_brought_you_here, arrival_date.
// See CLAUDE.md §9 (privacy posture) and §6 (display_name = "chosen handle, not legal name").
export type SafeMember = Pick<
  User,
  | "id"
  | "display_name"
  | "neighbourhood"
  | "languages_spoken"
  | "languages_to_practice"
  | "interests"
  | "availability"
>;

// Convert a full User to a SafeMember. Call this AS EARLY AS POSSIBLE in the render path
// (in the server component that owns the User) so the unsafe fields never travel down to
// child components — not even into Next.js's dev-mode RSC payload metadata.
export function toSafeMember(u: User): SafeMember {
  return {
    id: u.id,
    display_name: u.display_name,
    neighbourhood: u.neighbourhood,
    languages_spoken: u.languages_spoken,
    languages_to_practice: u.languages_to_practice,
    interests: u.interests,
    availability: u.availability,
  };
}

export interface Cluster {
  id: string;
  city: City;
  member_ids: string[];
  shared_interests: string[];
  status: "forming" | "active" | "dissolved";
  created_at: string;
}

export interface TimeOption {
  datetime: string;
  confirmations: string[];
}

export interface Place {
  name: string;
  city: City;
  neighbourhood: string;
  meeting_point: string;
}

export interface Event {
  id: string;
  cluster_id: string;
  mode: "aggregated" | "generated";
  activity: string;
  place: Place;
  time_options: TimeOption[];
  declined: string[];
  status: "proposed" | "fired" | "cancelled" | "completed";
}

export interface Venue {
  id: string;
  city: City;
  neighbourhood: string;
  name: string;
  meeting_point: string;
  good_for: string[];
}

export interface CityEvent {
  id: string;
  city: City;
  title: string;
  datetime: string;
  tags: string[];
  source: string;
}

export interface Contact {
  id: string;
  from_user_id: string;
  to_user_id: string;
  via_event_id: string;
}
