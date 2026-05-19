"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Something went wrong.");
      setPending(false);
      return;
    }
    router.push(data.redirect ?? "/now");
  }

  return (
    <div className="app-shell">
      <main className="flex-1 px-6 pt-14 pb-10 flex flex-col">
        <h1 className="text-3xl font-semibold tracking-tight text-ink">Log in</h1>
        <p className="text-ink-soft text-sm mt-2">Welcome back.</p>

        <form onSubmit={onSubmit} className="mt-8 space-y-4">
          <label className="block">
            <span className="text-xs font-semibold text-ink-soft uppercase tracking-wider">Email</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-border-soft bg-surface px-3.5 py-3 text-ink focus:outline-none focus:border-accent"
              placeholder="you@example.com"
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-ink-soft uppercase tracking-wider">Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-border-soft bg-surface px-3.5 py-3 text-ink focus:outline-none focus:border-accent"
              placeholder="••••••••"
            />
          </label>
          {error && (
            <p className="text-sm text-danger bg-danger-soft border border-danger-soft rounded-lg px-3 py-2">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-lg bg-accent text-white font-semibold py-3.5 disabled:opacity-60"
          >
            {pending ? "Signing in…" : "Continue"}
          </button>
        </form>

        <div className="mt-auto pt-8 text-center">
          <Link href="/signup" className="text-sm text-accent font-medium">
            Need an account? Sign up
          </Link>
        </div>
      </main>
    </div>
  );
}
