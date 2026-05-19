"use client";

// Client component that fetches /api/events-data. Same reasoning as /now: keeps the read
// inside the API-route Lambda pool where mutations also happen.

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, HeartHandshake, Loader2 } from "lucide-react";
import type { Event } from "@/lib/types";
import EventCard from "@/components/EventCard";
import AgentNotice from "@/components/AgentNotice";
import FindAnotherGroupCard from "@/components/FindAnotherGroupCard";

interface EventsData {
  userId: string;
  interests: string[];
  activeClusterCount: number;
  toConfirm: Event[];
  upcoming: Event[];
  past: Event[];
}

export default function EventsPage() {
  const router = useRouter();
  const [data, setData] = useState<EventsData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/events-data", { cache: "no-store" });
        if (cancelled) return;
        if (res.status === 401 || res.status === 409) {
          const d = await res.json().catch(() => ({}));
          router.replace(d.redirect ?? "/login");
          return;
        }
        if (!res.ok) {
          setError("Couldn't load your events. Try again in a moment.");
          return;
        }
        const d = (await res.json()) as EventsData;
        if (!cancelled) setData(d);
      } catch {
        if (!cancelled) setError("Network error — try again in a moment.");
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (error) {
    return (
      <div className="px-5 pt-6 pb-8 text-center text-sm text-ink-soft">{error}</div>
    );
  }

  if (!data) {
    return (
      <div className="grid place-items-center py-20">
        <Loader2 className="h-6 w-6 text-accent animate-spin" />
      </div>
    );
  }

  const { userId, interests, activeClusterCount, toConfirm, upcoming, past } = data;
  const totalEvents = toConfirm.length + upcoming.length + past.length;

  if (totalEvents === 0) {
    return (
      <div className="px-5 pt-6 pb-8 space-y-8">
        <div>
          <div className="text-[11px] uppercase tracking-widest text-ink-soft font-semibold">
            Events
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink mt-2">Nothing yet.</h1>
          <p className="text-ink-soft text-sm mt-2 leading-relaxed">
            When your group has a meetup proposal, it&apos;ll show up here.
          </p>
          <Link
            href="/now"
            className="mt-6 inline-block text-sm font-medium text-accent"
          >
            Go to Now to find a group →
          </Link>
        </div>

        {activeClusterCount > 0 && (
          <FindAnotherGroupCard
            interests={interests}
            activeClusterCount={activeClusterCount}
          />
        )}
      </div>
    );
  }

  return (
    <div className="px-5 pt-6 pb-8 space-y-8">
      {toConfirm.length > 0 && (
        <section>
          <h2 className="text-[11px] uppercase tracking-widest text-ink-soft font-semibold mb-3">
            To confirm
          </h2>
          <div className="space-y-4">
            {toConfirm.map((e) => (
              <EventCard key={e.id} event={e} currentUserId={userId} />
            ))}
          </div>
        </section>
      )}

      {upcoming.length > 0 && (
        <section>
          <h2 className="text-[11px] uppercase tracking-widest text-ink-soft font-semibold mb-3">
            Upcoming
          </h2>
          <div className="space-y-4">
            {upcoming.map((e) => (
              <EventCard key={e.id} event={e} currentUserId={userId} />
            ))}
          </div>
        </section>
      )}

      {past.length > 0 && (
        <section>
          <h2 className="text-[11px] uppercase tracking-widest text-ink-soft font-semibold mb-3">
            Past
          </h2>
          <div className="space-y-4">
            {past.map((e) => (
              <Link
                key={e.id}
                href={`/events/${e.id}/followup`}
                className="block rounded-xl border border-border-soft bg-surface p-5 card-shadow hover:bg-chip-bg/40 transition"
              >
                <div className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-ink-soft font-semibold">
                  <HeartHandshake className="h-3 w-3 text-accent" />
                  Past meetup
                </div>
                <div className="text-lg font-semibold text-ink mt-1">{e.activity}</div>
                <div className="text-xs text-ink-soft mt-1">{e.place.name}</div>
                <div className="inline-flex items-center gap-1 text-[11px] text-accent font-semibold mt-3">
                  Follow up with the group
                  <ArrowRight className="h-3 w-3" />
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {activeClusterCount > 0 && (
        <section>
          <FindAnotherGroupCard
            interests={interests}
            activeClusterCount={activeClusterCount}
          />
        </section>
      )}

      <AgentNotice className="text-center" />
    </div>
  );
}
