import Link from "next/link";
import { Sparkles, ShieldCheck } from "lucide-react";
import DemoEntry from "@/components/DemoEntry";
import Walkers from "@/components/illustrations/Walkers";

export default function Landing() {
  return (
    <div className="app-shell">
      <main className="flex-1 px-6 pt-10 pb-10 flex flex-col">
        <div className="text-xs uppercase tracking-widest text-accent font-semibold text-center">
          Common Ground
        </div>

        <Walkers className="mt-6 mb-2 mx-auto w-44 h-auto text-accent/70" />

        <h1 className="text-[32px] leading-[1.1] font-semibold tracking-tight text-ink mt-3">
          Meet a few people who fit your week.
        </h1>

        <div className="mt-4 flex items-start gap-2 text-ink-soft leading-relaxed">
          <Sparkles className="h-4 w-4 mt-1 shrink-0 text-accent" />
          <p>
            Four AI agents help you find a small group in your new city and turn it into one
            real meetup. No feeds, no swiping, no algorithms guessing how you feel.
          </p>
        </div>

        <div className="mt-8 rounded-xl border border-border-soft bg-chip-bg p-4 text-sm text-ink-soft flex gap-3">
          <ShieldCheck className="h-5 w-5 shrink-0 text-accent mt-0.5" />
          <div>
            <p className="font-semibold text-ink mb-0.5">An opt-in pilot.</p>
            <p className="text-xs">
              Offered by Rotterdam, Amsterdam, and The Hague. Your municipality does not see your profile.
            </p>
          </div>
        </div>

        <div className="mt-auto pt-8 space-y-3">
          <Link
            href="/signup"
            className="block w-full rounded-lg bg-accent text-white font-semibold text-center py-3.5"
          >
            Start
          </Link>
          <Link
            href="/login"
            className="block w-full rounded-lg border border-border-soft text-ink font-medium text-center py-3.5"
          >
            I already have an account
          </Link>
          <DemoEntry />
        </div>
      </main>
    </div>
  );
}
