"use client";

// Client component that fetches /api/event/[id]/followup-data. See /now and /events for the
// same reasoning — keeps reads in the API-route Lambda pool.

import { useEffect, useState } from "react";
import { useRouter, useParams, notFound } from "next/navigation";
import { HeartHandshake, Loader2 } from "lucide-react";
import FollowupPicker from "./FollowupPicker";
import AgentNotice from "@/components/AgentNotice";

interface FollowupData {
  eventActivity: string;
  others: { id: string; display_name: string }[];
  pickedIds: string[];
  mutualIds: string[];
}

export default function FollowupPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const [data, setData] = useState<FollowupData | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(`/api/event/${id}/followup-data`, { cache: "no-store" });
        if (cancelled) return;
        if (res.status === 401) {
          router.replace("/login");
          return;
        }
        if (res.status === 404) {
          setMissing(true);
          return;
        }
        if (!res.ok) {
          setMissing(true);
          return;
        }
        const d = (await res.json()) as FollowupData;
        if (!cancelled) setData(d);
      } catch {
        if (!cancelled) setMissing(true);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [id, router]);

  if (missing) notFound();

  if (!data || !id) {
    return (
      <div className="app-shell">
        <main className="flex-1 grid place-items-center">
          <Loader2 className="h-6 w-6 text-accent animate-spin" />
        </main>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <main className="flex-1 overflow-y-auto px-5 pt-6 pb-8">
        <div className="text-[11px] uppercase tracking-widest text-ink-soft font-semibold">
          After the meetup
        </div>
        <HeartHandshake className="mt-4 h-10 w-10 text-accent" />
        <h1 className="text-2xl font-semibold tracking-tight text-ink mt-3 leading-tight">
          Met someone you&apos;d like to stay in touch with?
        </h1>
        <p className="text-ink-soft text-sm mt-2 leading-relaxed">
          Pick anyone you&apos;d like to keep in touch with. We&apos;ll share your handle with them only if they pick you back.
        </p>

        <FollowupPicker
          eventId={id}
          eventActivity={data.eventActivity}
          others={data.others}
          pickedIds={data.pickedIds}
          mutualIds={data.mutualIds}
        />

        <AgentNotice className="text-center mt-8" />
      </main>
    </div>
  );
}
