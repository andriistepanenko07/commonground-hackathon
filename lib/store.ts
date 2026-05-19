// Redis-backed store. Async API: every dynamic record (users, clusters, events, contacts,
// onboarding, passwords) lives in Upstash so every serverless instance sees the same state.
// Venues and cityEvents are static seed data — kept in memory. See lib/redis.ts.

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
import { redis, ensureSeeded } from "./redis";

// Per-user onboarding state held in Redis during the Agent 1 chat.
export interface OnboardingState {
  history: MessageParam[];
  partial: PartialUser;
}

// --- Static seed data (read-only, no Redis) ---

export const venues: Venue[] = seedVenues as Venue[];
export const cityEvents: CityEvent[] = seedCityEvents as CityEvent[];

// --- Redis hash names ---

const USERS = "cg:users";
const CLUSTERS = "cg:clusters";
const EVENTS = "cg:events";
const ONBOARDING = "cg:onboarding";
const PASSWORDS = "cg:passwords"; // field = email lowercased
const CONTACTS = "cg:contacts";   // single key holding JSON array

// Upstash auto-parses JSON when it can; we still defensively handle both cases.
function parse<T>(raw: unknown): T | undefined {
  if (raw == null) return undefined;
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) as T;
    } catch {
      return undefined;
    }
  }
  return raw as T;
}

function parseAll<T>(map: Record<string, unknown> | null): T[] {
  if (!map) return [];
  const out: T[] = [];
  for (const v of Object.values(map)) {
    const p = parse<T>(v);
    if (p) out.push(p);
  }
  return out;
}

// --- Users ---

export async function getUserById(id: string): Promise<User | undefined> {
  await ensureSeeded();
  const raw = await redis.hget(USERS, id);
  return parse<User>(raw);
}

export async function allUsers(): Promise<User[]> {
  await ensureSeeded();
  const map = await redis.hgetall<Record<string, unknown>>(USERS);
  return parseAll<User>(map);
}

export async function setUser(user: User): Promise<void> {
  await ensureSeeded();
  await redis.hset(USERS, { [user.id]: JSON.stringify(user) });
}

export async function deleteUser(id: string): Promise<void> {
  await ensureSeeded();
  await redis.hdel(USERS, id);
}

export async function findUserByEmail(email: string): Promise<User | undefined> {
  const lower = email.trim().toLowerCase();
  const all = await allUsers();
  return all.find((u) => u.email.toLowerCase() === lower);
}

export async function createNewUser(email: string, password: string): Promise<User> {
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
  await setUser(user);
  await setPasswordByEmail(email, password);
  return user;
}

export async function updateUser(id: string, patch: Partial<User>): Promise<User | undefined> {
  const u = await getUserById(id);
  if (!u) return undefined;
  const next = { ...u, ...patch };
  await setUser(next);
  return next;
}

// --- Passwords (keyed by email, lowercased) ---

export async function getPasswordByEmail(email: string): Promise<string | undefined> {
  await ensureSeeded();
  const raw = await redis.hget(PASSWORDS, email.trim().toLowerCase());
  if (typeof raw === "string") return raw;
  return undefined;
}

export async function setPasswordByEmail(email: string, password: string): Promise<void> {
  await ensureSeeded();
  await redis.hset(PASSWORDS, { [email.trim().toLowerCase()]: password });
}

export async function deletePasswordByEmail(email: string): Promise<void> {
  await ensureSeeded();
  await redis.hdel(PASSWORDS, email.trim().toLowerCase());
}

// --- Clusters ---

export async function getCluster(id: string): Promise<Cluster | undefined> {
  await ensureSeeded();
  const raw = await redis.hget(CLUSTERS, id);
  return parse<Cluster>(raw);
}

export async function allClusters(): Promise<Cluster[]> {
  await ensureSeeded();
  const map = await redis.hgetall<Record<string, unknown>>(CLUSTERS);
  return parseAll<Cluster>(map);
}

export async function setCluster(cluster: Cluster): Promise<void> {
  await ensureSeeded();
  await redis.hset(CLUSTERS, { [cluster.id]: JSON.stringify(cluster) });
}

export async function deleteCluster(id: string): Promise<void> {
  await ensureSeeded();
  await redis.hdel(CLUSTERS, id);
}

// --- Events ---

export async function getEvent(id: string): Promise<Event | undefined> {
  await ensureSeeded();
  const raw = await redis.hget(EVENTS, id);
  return parse<Event>(raw);
}

export async function allEvents(): Promise<Event[]> {
  await ensureSeeded();
  const map = await redis.hgetall<Record<string, unknown>>(EVENTS);
  return parseAll<Event>(map);
}

export async function setEvent(event: Event): Promise<void> {
  await ensureSeeded();
  await redis.hset(EVENTS, { [event.id]: JSON.stringify(event) });
}

export async function deleteEvent(id: string): Promise<void> {
  await ensureSeeded();
  await redis.hdel(EVENTS, id);
}

// --- Onboarding (per-user chat history + partial profile during Agent 1) ---

export async function getOnboarding(userId: string): Promise<OnboardingState> {
  await ensureSeeded();
  const raw = await redis.hget(ONBOARDING, userId);
  return parse<OnboardingState>(raw) ?? { history: [], partial: {} };
}

export async function setOnboarding(userId: string, state: OnboardingState): Promise<void> {
  await ensureSeeded();
  await redis.hset(ONBOARDING, { [userId]: JSON.stringify(state) });
}

export async function deleteOnboarding(userId: string): Promise<void> {
  await ensureSeeded();
  await redis.hdel(ONBOARDING, userId);
}

// --- Contacts (single JSON-encoded array — small list, read-modify-write is fine) ---

export async function allContacts(): Promise<Contact[]> {
  await ensureSeeded();
  const raw = await redis.get(CONTACTS);
  return parse<Contact[]>(raw) ?? [];
}

export async function setContacts(list: Contact[]): Promise<void> {
  await ensureSeeded();
  await redis.set(CONTACTS, JSON.stringify(list));
}
