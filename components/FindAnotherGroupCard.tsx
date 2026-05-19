"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Sparkles } from "lucide-react";

const MAX = 3;

export default function FindAnotherGroupCard({
  interests,
  activeClusterCount,
}: {
  interests: string[];
  activeClusterCount: number;
}) {
  const router = useRouter();
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const atCap = activeClusterCount >= MAX;

  function toggle(tag: string) {
    const next = new Set(picked);
    if (next.has(tag)) next.delete(tag);
    else next.add(tag);
    setPicked(next);
  }

  async function go() {
    if (picked.size === 0 || atCap) return;
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/cluster/find", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preferred_tags: [...picked] }),
      });
      const data = await res.json();
      if (!data.ok || !data.cluster) {
        setError(data.error ?? "Couldn't find another group right now.");
        setPending(false);
        return;
      }
      router.push("/now");
      router.refresh();
    } catch {
      setError("Could not reach the matching service.");
      setPending(false);
    }
  }

  return (
    <div className="rounded-xl border border-border-soft bg-surface p-5 card-shadow">
      <div className="text-[11px] uppercase tracking-widest text-accent font-semibold">
        Try another group
      </div>
      <h2 className="text-lg font-semibold text-ink mt-1">Not feeling this one?</h2>
      <p className="text-sm text-ink-soft mt-1 leading-relaxed">
        Pick what you&apos;d like the next group to lean into. We&apos;ll find another set of
        people who share it.
      </p>

      {interests.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {interests.map((tag) => {
            const isOn = picked.has(tag);
            return (
              <button
                key={tag}
                type="button"
                onClick={() => toggle(tag)}
                disabled={pending || atCap}
                className={`text-xs rounded-full px-3 py-1.5 border transition ${
                  isOn
                    ? "bg-accent text-white border-accent"
                    : "bg-chip-bg text-ink-soft border-border-soft hover:bg-accent-soft"
                } disabled:opacity-60 disabled:cursor-not-allowed`}
              >
                {tag}
              </button>
            );
          })}
        </div>
      ) : (
        <p className="mt-3 text-xs text-ink-soft italic">
          Add some interests on your Profile to use this.
        </p>
      )}

      {atCap ? (
        <p className="mt-5 text-sm text-ink-soft bg-chip-bg border border-border-soft rounded-lg px-3 py-2">
          You&apos;re already in {MAX} groups. Finish a meetup before joining another.
        </p>
      ) : (
        <button
          onClick={go}
          disabled={pending || picked.size === 0 || interests.length === 0}
          className="mt-5 flex items-center justify-center gap-2 w-full rounded-lg bg-accent text-white font-semibold py-3.5 disabled:opacity-60"
        >
          {pending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Looking for another group…
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              Find another group
            </>
          )}
        </button>
      )}

      {error && (
        <p className="mt-3 text-sm text-danger bg-danger-soft border border-danger-soft rounded-lg px-3 py-2">
          {error}
        </p>
      )}
    </div>
  );
}
