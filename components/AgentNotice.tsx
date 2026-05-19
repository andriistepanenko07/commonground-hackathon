import { Sparkles } from "lucide-react";

export default function AgentNotice({ className = "" }: { className?: string }) {
  return (
    <div className={`text-center ${className}`}>
      <span className="text-[11px] text-ink-soft inline-flex items-center gap-1.5">
        <Sparkles className="h-3 w-3 text-accent" />
        You&apos;re talking to an AI agent.
      </span>
    </div>
  );
}
