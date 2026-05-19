"use client";

// Client component that fetches /api/now-data. Lives in /app/api/* so it shares a Vercel
// Lambda pool with /api/cluster/find — see CLAUDE.md and the diagnostic findings in
// plans/the-things-is-we-structured-pixel.md.

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Sparkles, Loader2 } from "lucide-react";
import type { Cluster, SafeMember } from "@/lib/types";
import { ClusterPreview } from "@/components/ClusterPreview";
import FindGroupButton from "@/components/FindGroupButton";
import AgentNotice from "@/components/AgentNotice";
import HalfGroup from "@/components/illustrations/HalfGroup";

interface Group {
  cluster: Cluster;
  members: SafeMember[];
  hasEvent: boolean;
}

interface NowData {
  user: { city: string; display_name: string };
  groups: Group[];
}

export default function NowPage() {
  const router = useRouter();
  const [data, setData] = useState<NowData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/now-data", { cache: "no-store" });
        if (cancelled) return;
        if (res.status === 401 || res.status === 409) {
          const d = await res.json().catch(() => ({}));
          router.replace(d.redirect ?? "/login");
          return;
        }
        if (!res.ok) {
          setError("Couldn't load your group. Try again in a moment.");
          return;
        }
        const d = (await res.json()) as NowData;
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

  const { user, groups } = data;

  if (groups.length === 0) {
    return (
      <div className="px-5 pt-6 pb-8">
        <div className="text-[11px] uppercase tracking-widest text-ink-soft font-semibold">
          Now
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink mt-2">
          Ready for a new group?
        </h1>
        <p className="text-ink-soft text-sm mt-2 leading-relaxed">
          Tap below and an AI agent will find 4–5 people in {user.city} who share what you like to do.
        </p>

        <HalfGroup className="mt-6 mx-auto w-40 h-auto text-accent/70" />

        <div className="mt-6">
          <FindGroupButton />
        </div>
        <div className="mt-6 rounded-xl border border-border-soft bg-chip-bg p-4 text-xs text-ink-soft">
          Each group exists to produce one meetup. Don&apos;t love a group? Open Events and find another, on your terms.
        </div>
        <AgentNotice className="mt-6 text-center" />
      </div>
    );
  }

  return (
    <div className="px-5 pt-6 pb-8 space-y-6">
      <div>
        <div className="text-[11px] uppercase tracking-widest text-ink-soft font-semibold">
          Now
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink mt-2">
          {groups.length === 1 ? "Your group" : `Your groups (${groups.length})`}
        </h1>
        <p className="text-ink-soft text-sm mt-2">
          {groups.length === 1
            ? "Open the Events tab to see your meetup proposal."
            : "Each group runs on its own track. Open the Events tab to see all proposals."}
        </p>
      </div>

      {groups.map(({ cluster, members, hasEvent }) => (
        <div
          key={cluster.id}
          className="rounded-xl border border-border-soft bg-surface p-5 card-shadow"
        >
          <ClusterPreview cluster={cluster} members={members} />
          {hasEvent ? (
            <Link
              href="/events"
              className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-accent"
            >
              See the proposal
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          ) : (
            <p className="mt-4 text-sm text-ink-soft italic inline-flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-accent" />
              An AI agent is preparing a meetup proposal…
            </p>
          )}
        </div>
      ))}

      <AgentNotice className="text-center" />
    </div>
  );
}
