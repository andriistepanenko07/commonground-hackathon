// Single mutable store for the running demo. Lives in module scope on the server.
// State resets on dev-server restart — fine for a 2-min pitch (CLAUDE.md §14).

import seedUsers from "@/seed/users.json";
import seedVenues from "@/seed/venues.json";
import seedCityEvents from "@/seed/city-events.json";
import type {
  User,
  Cluster,
  Event,
  Venue,
  CityEvent,
  Contact,
  PartialUser,
} from "./types";
import type { MessageParam } from "@anthropic-ai/sdk/resources/messages";

// Per-user onboarding state held in memory during the Agent 1 chat.
interface OnboardingState {
  history: MessageParam[];
  partial: PartialUser;
}

interface Store {
  users: Map<string, User>;
  passwords: Map<string, string>;
  venues: Venue[];
  cityEvents: CityEvent[];
  clusters: Map<string, Cluster>;
  events: Map<string, Event>;
  contacts: Contact[];
  onboarding: Map<string, OnboardingState>;
}

declare global {
  // eslint-disable-next-line no-var
  var __cg_store: Store | undefined;
}

function init(): Store {
  const users = new Map<string, User>();
  for (const u of seedUsers as User[]) {
    users.set(u.id, u);
  }
  return {
    users,
    passwords: new Map(),
    venues: seedVenues as Venue[],
    cityEvents: seedCityEvents as CityEvent[],
    clusters: new Map(),
    events: new Map(),
    contacts: [],
    onboarding: new Map(),
  };
}

// Avoid reloading seed in dev-mode hot reloads.
export const store: Store = globalThis.__cg_store ?? (globalThis.__cg_store = init());

// Diagnostic: a random ID stamped per Lambda instance at module init. Identical IDs across
// requests = same warm Lambda (state shared). Different IDs = different Lambdas (state split).
// Temporary — remove once the Vercel split-state issue is diagnosed.
export const LAMBDA_ID =
  globalThis.__cg_lambda_id ??
  (globalThis.__cg_lambda_id = Math.random().toString(36).slice(2, 8));

declare global {
  // eslint-disable-next-line no-var
  var __cg_lambda_id: string | undefined;
}

// --- User helpers ---

export function findUserByEmail(email: string): User | undefined {
  const lower = email.trim().toLowerCase();
  for (const u of store.users.values()) {
    if (u.email.toLowerCase() === lower) return u;
  }
  return undefined;
}

export function createNewUser(email: string, password: string): User {
  const id = `u-new-${Math.random().toString(36).slice(2, 8)}`;
  const user: User = {
    id,
    display_name: "",
    email,
    status: "newcomer",
    life_stage: "early-career",
    what_brought_you_here: "other",
    city: "Rotterdam",
    neighbourhood: "",
    languages_spoken: [],
    interests: [],
    availability: [],
    profile_complete: false,
    in_active_cluster: false,
  };
  store.users.set(id, user);
  store.passwords.set(id, password);
  return user;
}

export function updateUser(id: string, patch: Partial<User>): User | undefined {
  const u = store.users.get(id);
  if (!u) return undefined;
  const next = { ...u, ...patch };
  store.users.set(id, next);
  return next;
}

// --- Onboarding helpers ---

export function getOnboarding(userId: string): OnboardingState {
  let state = store.onboarding.get(userId);
  if (!state) {
    state = { history: [], partial: {} };
    store.onboarding.set(userId, state);
  }
  return state;
}

export function setOnboarding(userId: string, state: OnboardingState): void {
  store.onboarding.set(userId, state);
}
