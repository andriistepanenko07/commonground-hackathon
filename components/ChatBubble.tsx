export function ChatBubble({
  from,
  text,
}: {
  from: "agent" | "user";
  text: string;
}) {
  const isAgent = from === "agent";
  return (
    <div className={`flex ${isAgent ? "justify-start" : "justify-end"}`}>
      <div
        className={`max-w-[85%] px-4 py-3 text-sm leading-relaxed rounded-2xl ${
          isAgent
            ? "bg-chip-bg text-ink rounded-tl-md"
            : "bg-gradient-to-br from-accent to-accent-strong text-white rounded-tr-md shadow-sm"
        }`}
      >
        {text}
      </div>
    </div>
  );
}

export function TypingBubble() {
  return (
    <div className="flex justify-start">
      <div className="bg-chip-bg text-ink-soft rounded-2xl rounded-tl-md px-4 py-3 text-sm flex gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-ink-soft animate-pulse" />
        <span className="w-1.5 h-1.5 rounded-full bg-ink-soft animate-pulse [animation-delay:150ms]" />
        <span className="w-1.5 h-1.5 rounded-full bg-ink-soft animate-pulse [animation-delay:300ms]" />
      </div>
    </div>
  );
}
