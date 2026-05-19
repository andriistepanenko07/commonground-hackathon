// Qualitative onboarding progress: three stages, driven by filled-field count.
// Kept on the {filled, total} prop interface so the chat page didn't need to change.

const STAGES = ["Getting to know you", "Picking up the details", "Almost ready"] as const;

function stageIndex(filled: number): 0 | 1 | 2 {
  if (filled >= 7) return 2;
  if (filled >= 4) return 1;
  return 0;
}

export default function ProgressBar({ filled }: { filled: number; total?: number }) {
  const active = stageIndex(filled);
  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-1.5">
        {STAGES.map((_, i) => (
          <span
            key={i}
            className={`block h-1.5 w-8 rounded-full transition-colors ${
              i < active
                ? "bg-accent-soft"
                : i === active
                  ? "bg-accent"
                  : "bg-chip-bg border border-border-soft"
            }`}
          />
        ))}
      </div>
      <span className="text-[11px] font-semibold uppercase tracking-widest text-ink-soft">
        {STAGES[active]}
      </span>
    </div>
  );
}
