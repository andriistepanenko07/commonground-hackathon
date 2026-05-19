"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { User, DayPart, Status, LifeStage, WhatBroughtYouHere, City } from "@/lib/types";

const DAY_PART_LABELS: Record<DayPart, string> = {
  "weekday-morning": "Weekday morning",
  "weekday-day": "Weekday daytime",
  "weekday-evening": "Weekday evening",
  "weekend-morning": "Weekend morning",
  "weekend-day": "Weekend daytime",
  "weekend-evening": "Weekend evening",
};

const STATUS_LABELS: Record<Status, string> = {
  newcomer: "Newcomer to this city",
  "local-meet": "Local, want to meet new people",
  "local-help": "Local, want to help newcomers",
};

const LIFE_STAGE_LABELS: Record<LifeStage, string> = {
  student: "Student",
  "early-career": "Early-career",
  "mid-career": "Mid-career",
  established: "Established",
  retired: "Retired",
};

const REASON_LABELS: Record<WhatBroughtYouHere, string> = {
  study: "Study",
  work: "Work",
  family: "Family",
  partner: "Partner",
  other: "Other",
};

const ALL_DAY_PARTS: DayPart[] = Object.keys(DAY_PART_LABELS) as DayPart[];
const ALL_STATUSES: Status[] = Object.keys(STATUS_LABELS) as Status[];
const ALL_LIFE_STAGES: LifeStage[] = Object.keys(LIFE_STAGE_LABELS) as LifeStage[];
const ALL_REASONS: WhatBroughtYouHere[] = Object.keys(REASON_LABELS) as WhatBroughtYouHere[];
const ALL_CITIES: City[] = ["Rotterdam", "Amsterdam", "The Hague"];

export default function SummaryPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [interestsText, setInterestsText] = useState("");
  const [languagesText, setLanguagesText] = useState("");
  const [practiceText, setPracticeText] = useState("");
  const [pending, setPending] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const [editMode, setEditMode] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/profile/me");
        if (cancelled) return;
        if (res.status === 401) {
          router.replace("/login");
          return;
        }
        if (res.status === 404) {
          // Stale session — the cookie points at a user that no longer exists in the
          // in-memory store (typically after a dev-server restart). Clear it and bounce
          // back to signup instead of hanging here forever.
          await fetch("/api/logout", { method: "POST" });
          router.replace("/signup");
          return;
        }
        if (!res.ok) {
          setLoadError(true);
          return;
        }
        const d = await res.json();
        if (cancelled || !d.user) {
          setLoadError(true);
          return;
        }
        setUser(d.user);
        setInterestsText((d.user.interests as string[]).join(", "));
        setLanguagesText((d.user.languages_spoken as string[]).join(", "));
        setPracticeText(((d.user.languages_to_practice as string[]) ?? []).join(", "));
        // If the user already finished onboarding once, treat this visit as "edit profile",
        // which returns them to /profile instead of triggering a new cluster search.
        if (d.user.profile_complete) setEditMode(true);
      } catch {
        if (!cancelled) setLoadError(true);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (loadError) {
    return (
      <div className="app-shell">
        <main className="flex-1 grid place-items-center px-6 text-center">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-ink">Couldn&apos;t load your profile.</h1>
            <p className="text-ink-soft text-sm mt-2">The session may have expired during a restart.</p>
            <button
              onClick={() => router.replace("/")}
              className="mt-6 inline-block rounded-lg bg-accent text-white font-semibold px-5 py-3"
            >
              Back to start
            </button>
          </div>
        </main>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="app-shell">
        <main className="flex-1 grid place-items-center">
          <p className="text-ink-soft text-sm">Loading…</p>
        </main>
      </div>
    );
  }

  function toggleSlot(dp: DayPart) {
    if (!user) return;
    const has = user.availability.some((a) => a.day_part === dp);
    const next = has
      ? user.availability.filter((a) => a.day_part !== dp)
      : [...user.availability, { day_part: dp }];
    setUser({ ...user, availability: next });
  }

  async function onContinue() {
    if (!user) return;
    setPending(true);
    const body = {
      ...user,
      interests: interestsText.split(",").map((s) => s.trim()).filter(Boolean),
      languages_spoken: languagesText.split(",").map((s) => s.trim()).filter(Boolean),
      languages_to_practice: practiceText.split(",").map((s) => s.trim()).filter(Boolean),
      profile_complete: true,
    };
    const res = await fetch("/api/profile/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      router.push(editMode ? "/profile" : "/onboarding/looking");
    } else {
      setPending(false);
    }
  }

  return (
    <div className="app-shell">
      <header className="px-5 pt-5 pb-3 border-b border-border-soft">
        <div className="text-[11px] uppercase tracking-widest text-ink-soft font-semibold">
          {editMode ? "Edit profile" : "Review your profile"}
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink mt-1.5">
          {editMode ? "Make your changes." : "Anything to fix?"}
        </h1>
        <p className="text-xs text-ink-soft mt-1">
          {editMode
            ? "Saved changes apply to the next group you join."
            : "You can edit any of this before we look for a group."}
        </p>
      </header>

      <main className="flex-1 overflow-y-auto p-5 space-y-5 min-h-0">
        <Field label="Name shown to the group">
          <input
            value={user.display_name}
            onChange={(e) => setUser({ ...user, display_name: e.target.value })}
            className={inputCls}
          />
        </Field>

        <Field label="Where you are">
          <select
            value={user.city}
            onChange={(e) => setUser({ ...user, city: e.target.value as City })}
            className={inputCls}
          >
            {ALL_CITIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </Field>

        <Field label="Neighbourhood">
          <input
            value={user.neighbourhood}
            onChange={(e) => setUser({ ...user, neighbourhood: e.target.value })}
            className={inputCls}
            placeholder="e.g. Oude Westen"
          />
        </Field>

        <Field label="You are">
          <select
            value={user.status}
            onChange={(e) => setUser({ ...user, status: e.target.value as Status })}
            className={inputCls}
          >
            {ALL_STATUSES.map((s) => (
              <option key={s} value={s}>{STATUS_LABELS[s]}</option>
            ))}
          </select>
        </Field>

        <Field label="Life stage">
          <select
            value={user.life_stage}
            onChange={(e) => setUser({ ...user, life_stage: e.target.value as LifeStage })}
            className={inputCls}
          >
            {ALL_LIFE_STAGES.map((l) => (
              <option key={l} value={l}>{LIFE_STAGE_LABELS[l]}</option>
            ))}
          </select>
        </Field>

        <Field label="What brought you here">
          <select
            value={user.what_brought_you_here}
            onChange={(e) => setUser({ ...user, what_brought_you_here: e.target.value as WhatBroughtYouHere })}
            className={inputCls}
          >
            {ALL_REASONS.map((r) => (
              <option key={r} value={r}>{REASON_LABELS[r]}</option>
            ))}
          </select>
        </Field>

        <Field label="Languages you speak (comma-separated)">
          <input
            value={languagesText}
            onChange={(e) => setLanguagesText(e.target.value)}
            className={inputCls}
            placeholder="English, Spanish"
          />
        </Field>

        <Field label="Languages you'd like to practise (optional)">
          <input
            value={practiceText}
            onChange={(e) => setPracticeText(e.target.value)}
            className={inputCls}
            placeholder="Dutch"
          />
        </Field>

        <Field label="Interests (comma-separated)">
          <textarea
            value={interestsText}
            onChange={(e) => setInterestsText(e.target.value)}
            className={`${inputCls} min-h-[80px]`}
            placeholder="long walks, photography, slow coffee, books, film"
          />
        </Field>

        <Field label="When you're typically free">
          <div className="grid grid-cols-2 gap-2">
            {ALL_DAY_PARTS.map((dp) => {
              const active = user.availability.some((a) => a.day_part === dp);
              return (
                <button
                  type="button"
                  key={dp}
                  onClick={() => toggleSlot(dp)}
                  className={`text-xs py-2.5 rounded-lg border ${
                    active
                      ? "bg-accent-soft border-accent text-accent font-semibold"
                      : "bg-surface border-border-soft text-ink-soft"
                  }`}
                >
                  {DAY_PART_LABELS[dp]}
                </button>
              );
            })}
          </div>
        </Field>
      </main>

      <footer className="border-t border-border-soft p-3 bg-surface">
        <button
          onClick={onContinue}
          disabled={pending}
          className="w-full rounded-lg bg-accent text-white font-semibold py-3.5 disabled:opacity-60"
        >
          {pending ? "Saving…" : editMode ? "Save changes" : "Looks good — find me a group"}
        </button>
      </footer>
    </div>
  );
}

const inputCls =
  "w-full rounded-lg border border-border-soft bg-surface px-3 py-2.5 text-sm text-ink focus:outline-none focus:border-accent";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[11px] font-semibold text-ink-soft uppercase tracking-wider">{label}</span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}
