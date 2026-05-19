"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUp, Sparkles } from "lucide-react";
import { ChatBubble, TypingBubble } from "@/components/ChatBubble";
import ProgressBar from "@/components/ProgressBar";
import AgentNotice from "@/components/AgentNotice";

interface Bubble {
  from: "agent" | "user";
  text: string;
}

export default function OnboardingChatPage() {
  const router = useRouter();
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const [filled, setFilled] = useState(0);
  const [total, setTotal] = useState(8);
  const [done, setDone] = useState(false);
  const askedOpener = useRef(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (askedOpener.current) return;
    askedOpener.current = true;
    void sendTurn(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [bubbles, pending]);

  async function sendTurn(message: string | null) {
    setPending(true);
    try {
      const res = await fetch("/api/agent1/turn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      const data = await res.json();
      if (!res.ok) {
        setBubbles((b) => [...b, { from: "agent", text: data.error ?? "Something went wrong." }]);
        return;
      }
      setBubbles((b) => [...b, { from: "agent", text: data.assistant_text }]);
      setFilled(data.filled);
      setTotal(data.total);
      setDone(!!data.done);
    } finally {
      setPending(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.trim() || pending || done) return;
    const text = draft.trim();
    setBubbles((b) => [...b, { from: "user", text }]);
    setDraft("");
    await sendTurn(text);
  }

  return (
    <div className="app-shell">
      <header className="px-5 pt-5 pb-3 border-b border-border-soft">
        <div className="flex items-center justify-between mb-2">
          <div className="text-[11px] font-semibold uppercase tracking-widest text-ink-soft inline-flex items-center gap-1.5">
            <Sparkles className="h-3 w-3 text-accent" />
            Building your profile
          </div>
          <AgentNotice />
        </div>
        <ProgressBar filled={filled} total={total} />
      </header>

      <main
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-5 py-5 space-y-3 min-h-0"
      >
        {bubbles.map((b, i) => (
          <ChatBubble key={i} from={b.from} text={b.text} />
        ))}
        {pending && <TypingBubble />}
      </main>

      <footer className="border-t border-border-soft p-3 bg-surface">
        {done ? (
          <button
            onClick={() => router.push("/onboarding/summary")}
            className="w-full rounded-lg bg-accent text-white font-semibold py-3.5"
          >
            Review my profile
          </button>
        ) : (
          <form onSubmit={onSubmit} className="flex gap-2">
            <input
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Type your reply…"
              disabled={pending}
              className="flex-1 rounded-lg border border-border-soft bg-surface px-3.5 py-2.5 text-sm text-ink focus:outline-none focus:border-accent disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={pending || !draft.trim()}
              aria-label="Send"
              className="rounded-lg bg-accent text-white font-semibold px-3.5 grid place-items-center disabled:opacity-50"
            >
              <ArrowUp className="h-5 w-5" />
            </button>
          </form>
        )}
      </footer>
    </div>
  );
}
