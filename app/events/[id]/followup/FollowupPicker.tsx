"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Clock } from "lucide-react";
import { avatarClass, initials } from "@/components/avatar";

interface Other {
  id: string;
  display_name: string;
}

export default function FollowupPicker({
  eventId,
  eventActivity,
  others,
  pickedIds,
  mutualIds,
}: {
  eventId: string;
  eventActivity: string;
  others: Other[];
  pickedIds: string[];
  mutualIds: string[];
}) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const pickedSet = new Set(pickedIds);
  const mutualSet = new Set(mutualIds);

  async function pick(id: string) {
    if (pending || pickedSet.has(id)) return;
    setPending(id);
    try {
      await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to_user_id: id, via_event_id: eventId }),
      });
      router.refresh();
    } finally {
      setPending(null);
    }
  }

  function finish() {
    setDone(true);
    setTimeout(() => router.push("/now"), 800);
  }

  return (
    <>
      <p className="text-xs text-ink-soft mt-6 italic">{eventActivity}</p>
      <ul className="mt-3 space-y-2">
        {others.map((o) => {
          const isMutual = mutualSet.has(o.id);
          const isPicked = pickedSet.has(o.id);
          const isPending = pending === o.id;
          return (
            <li key={o.id}>
              <button
                type="button"
                onClick={() => pick(o.id)}
                disabled={pending !== null || isPicked}
                className={`w-full flex items-center gap-3 rounded-lg border p-3 text-left transition ${
                  isMutual
                    ? "border-accent bg-accent-soft"
                    : isPicked
                      ? "border-border-soft bg-chip-bg/40"
                      : "border-border-soft bg-surface"
                } disabled:cursor-default`}
              >
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold text-white ${avatarClass(o.id)}`}
                >
                  {initials(o.display_name)}
                </div>
                <div className="flex-1">
                  <div className="text-sm font-semibold text-ink">{o.display_name}</div>
                  <div className="text-xs text-ink-soft">
                    {isMutual
                      ? `You both said yes — find each other as ${o.display_name}.`
                      : isPicked
                        ? `Waiting on ${o.display_name} to pick back.`
                        : isPending
                          ? "Sending…"
                          : "Tap to stay in touch."}
                  </div>
                </div>
                {isMutual ? (
                  <Check className="h-4 w-4 text-accent" aria-label="matched" />
                ) : isPicked ? (
                  <Clock className="h-4 w-4 text-ink-soft" aria-label="waiting" />
                ) : null}
              </button>
            </li>
          );
        })}
      </ul>

      <button
        onClick={finish}
        className="mt-8 w-full rounded-lg bg-accent text-white font-semibold py-3.5 disabled:opacity-60"
        disabled={pending !== null || done}
      >
        {done ? "Saved — back to Now" : pickedIds.length === 0 ? "I'm good, thanks" : "Done"}
      </button>
    </>
  );
}
