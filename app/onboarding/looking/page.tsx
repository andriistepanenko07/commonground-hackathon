"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Users } from "lucide-react";

export default function LookingPage() {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    async function go() {
      try {
        await fetch("/api/cluster/find", { method: "POST" });
      } catch {
        // Agent 2 is wired in Step 7; the page works without it too.
      }
      await new Promise((r) => setTimeout(r, 1500));
      if (!cancelled) router.push("/now");
    }
    void go();
    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <div className="app-shell">
      <main className="flex-1 grid place-items-center px-6">
        <div className="text-center">
          <Loader2 className="mx-auto h-12 w-12 text-accent animate-spin" />
          <Users className="mx-auto mt-4 h-5 w-5 text-ink-soft" />
          <h1 className="mt-4 text-2xl font-semibold tracking-tight text-ink">
            Looking for your group
          </h1>
          <p className="text-ink-soft text-sm mt-2 max-w-xs mx-auto">
            An AI agent is checking who else in your city fits your week.
          </p>
        </div>
      </main>
    </div>
  );
}
