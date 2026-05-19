"use client";

import { useState } from "react";
import { Loader2, Sparkles } from "lucide-react";

export default function FindGroupButton() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function go() {
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/cluster/find", { method: "POST" });
      const data = await res.json();
      if (!data.ok || !data.cluster) {
        setError(data.error ?? "No matches in your city yet — try again soon.");
        setPending(false);
        return;
      }
      // /now is a client component (see app/(app)/now/page.tsx) so router.refresh() doesn't
      // re-run its data fetch. A full reload remounts the component and re-fetches /api/now-data.
      window.location.reload();
    } catch {
      setError("Could not reach the matching service.");
      setPending(false);
    }
  }

  return (
    <div>
      <button
        onClick={go}
        disabled={pending}
        className="flex items-center justify-center gap-2 w-full rounded-lg bg-accent text-white font-semibold py-3.5 disabled:opacity-70"
      >
        {pending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Looking for your group…
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4" />
            Find me a new group
          </>
        )}
      </button>
      {error && (
        <p className="mt-3 text-sm text-danger bg-danger-soft border border-danger-soft rounded-lg px-3 py-2">
          {error}
        </p>
      )}
    </div>
  );
}
