"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  MapPin,
  CalendarDays,
  Check,
  XCircle,
  Clock,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import type { Event } from "@/lib/types";

const QUORUM = 3;
const MAX_TIME_OPTIONS = 3;

function formatTime(iso: string): { date: string; time: string } {
  const d = new Date(iso);
  return {
    date: d.toLocaleDateString("en-GB", {
      weekday: "long",
      day: "numeric",
      month: "short",
    }),
    time: d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
  };
}

export default function EventCard({
  event,
  currentUserId,
}: {
  event: Event;
  currentUserId: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [suggestValue, setSuggestValue] = useState("");

  const declined = event.declined.includes(currentUserId);
  const fired = event.status === "fired";
  const canAddTime = !fired && event.time_options.length < MAX_TIME_OPTIONS;
  const userConfirmedTime = event.time_options.find((t) => t.confirmations.includes(currentUserId));

  async function call(path: string, action: string, body?: object) {
    setPending(action);
    setError(null);
    try {
      const res = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
        setPending(null);
        return;
      }
      // /events is a client component (see app/(app)/events/page.tsx) so router.refresh()
      // doesn't re-run its data fetch. Full reload remounts the page and re-fetches /api/events-data.
      window.location.reload();
    } catch {
      setError("Network error.");
      setPending(null);
    }
  }

  return (
    <article className="rounded-xl border border-border-soft bg-surface p-5 card-shadow">
      <header>
        <div className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-wider font-semibold px-2 py-1 rounded bg-chip-bg text-chip-text mb-3">
          <Sparkles className="h-3 w-3 text-accent" />
          {event.mode === "aggregated"
            ? `From a real event in ${event.place.city}`
            : "Suggested for your group"}
        </div>
        <h2 className="text-xl font-semibold tracking-tight text-ink leading-snug">
          {event.activity}
        </h2>
        <p className="text-sm text-ink-soft mt-1.5 inline-flex items-center gap-1.5">
          <MapPin className="h-3.5 w-3.5 shrink-0" />
          {event.place.name}
          {event.place.neighbourhood ? ` · ${event.place.neighbourhood}` : ""}
        </p>
        {event.place.meeting_point && (
          <p className="text-xs text-ink-soft mt-1 ml-5">Meet at: {event.place.meeting_point}</p>
        )}
      </header>

      <ul className="mt-5 space-y-2">
        {event.time_options.map((t) => {
          const fmt = formatTime(t.datetime);
          const isMine = t.confirmations.includes(currentUserId);
          const reached = t.confirmations.length >= QUORUM;
          return (
            <li
              key={t.datetime}
              className={`rounded-lg border p-3 ${
                isMine || reached
                  ? "border-accent bg-accent-soft"
                  : "border-border-soft bg-surface"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <CalendarDays className="h-4 w-4 text-ink-soft shrink-0" />
                  <div>
                    <div className="text-sm font-semibold text-ink">
                      {fmt.date} · {fmt.time}
                    </div>
                    <div className="text-xs text-ink-soft mt-0.5">
                      {reached
                        ? "Locked — meetup confirmed"
                        : `${t.confirmations.length} of ${QUORUM} confirmed`}
                    </div>
                  </div>
                </div>
                {fired ? null : (
                  <button
                    onClick={() => call(`/api/event/${event.id}/confirm`, `confirm-${t.datetime}`, { datetime: t.datetime })}
                    disabled={pending !== null || isMine}
                    className={`text-xs font-semibold px-3 py-2 rounded inline-flex items-center gap-1 ${
                      isMine
                        ? "bg-accent text-white"
                        : "bg-accent-soft text-accent border border-accent"
                    } disabled:opacity-60`}
                  >
                    {isMine ? (
                      <>
                        <Check className="h-3.5 w-3.5" />
                        You&rsquo;re in
                      </>
                    ) : (
                      <>I&rsquo;m in</>
                    )}
                  </button>
                )}
              </div>
              {!fired && !reached && (
                <button
                  onClick={() => call(`/api/event/${event.id}/demo-confirm-one`, `demo-one-${t.datetime}`, { datetime: t.datetime })}
                  disabled={pending !== null}
                  className="mt-2 w-full text-[11px] text-ink-soft underline py-1 disabled:opacity-60"
                >
                  Demo: +1 confirmation on this time
                </button>
              )}
            </li>
          );
        })}
      </ul>

      {!fired && (
        <>
          <div className="mt-4 flex gap-2">
            <button
              onClick={() => call(`/api/event/${event.id}/decline`, "decline")}
              disabled={pending !== null}
              className={`flex-1 inline-flex items-center justify-center gap-1.5 text-xs py-2.5 rounded border ${
                declined
                  ? "border-danger text-danger bg-danger-soft"
                  : "border-border-soft text-ink"
              } disabled:opacity-60`}
            >
              <XCircle className="h-3.5 w-3.5" />
              {declined ? "You declined" : "Can’t make it"}
            </button>
            <button
              onClick={() => setSuggestOpen((v) => !v)}
              disabled={!canAddTime || pending !== null}
              className="flex-1 inline-flex items-center justify-center gap-1.5 text-xs py-2.5 rounded border border-border-soft text-ink disabled:opacity-50"
            >
              <Clock className="h-3.5 w-3.5" />
              {canAddTime ? "Suggest another time" : "3 times proposed"}
            </button>
          </div>

          {userConfirmedTime && (
            <button
              onClick={() => call(`/api/event/${event.id}/demo-confirm`, "demo", { datetime: userConfirmedTime.datetime })}
              disabled={pending !== null}
              className="mt-3 w-full text-[11px] text-ink-soft underline py-2 disabled:opacity-60"
            >
              Demo: skip to quorum (auto-confirm 2 more)
            </button>
          )}

          {suggestOpen && canAddTime && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!suggestValue) return;
                const iso = new Date(suggestValue).toISOString();
                void call(`/api/event/${event.id}/suggest`, "suggest", { datetime: iso });
                setSuggestOpen(false);
                setSuggestValue("");
              }}
              className="mt-3 flex gap-2"
            >
              <input
                type="datetime-local"
                value={suggestValue}
                onChange={(e) => setSuggestValue(e.target.value)}
                className="flex-1 rounded border border-border-soft bg-surface px-3 py-2 text-sm text-ink focus:outline-none focus:border-accent"
              />
              <button
                type="submit"
                disabled={!suggestValue || pending !== null}
                className="rounded bg-accent text-white text-xs font-semibold px-3 disabled:opacity-50"
              >
                Add
              </button>
            </form>
          )}
        </>
      )}

      {error && (
        <p className="mt-3 text-xs text-danger bg-danger-soft border border-danger-soft rounded px-3 py-2">
          {error}
        </p>
      )}

      <p className="text-[11px] text-ink-soft mt-5 text-center">
        {fired
          ? "Locked in — see you there."
          : userConfirmedTime
          ? "First time to reach 3 confirmations locks the meetup."
          : "Pick a time that works. First time to reach 3 confirmations locks the meetup."}
      </p>

      {fired && (
        <button
          onClick={async () => {
            setPending("complete");
            await fetch(`/api/event/${event.id}/complete`, { method: "POST" });
            router.push(`/events/${event.id}/followup`);
          }}
          disabled={pending !== null}
          className="mt-3 inline-flex items-center justify-center gap-1.5 w-full text-xs text-accent font-semibold py-2 disabled:opacity-60"
        >
          See what happens after the meetup
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      )}
    </article>
  );
}
