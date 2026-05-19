export default function Walkers({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 200 120"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {/* ground line */}
      <path d="M10 105 Q 100 110 190 105" strokeOpacity="0.4" />

      {/* left figure — head, body, arms, legs */}
      <circle cx="60" cy="36" r="10" />
      <path d="M60 46 V 78" />
      <path d="M60 56 L 48 70" />
      <path d="M60 56 L 72 70" />
      <path d="M60 78 L 52 100" />
      <path d="M60 78 L 70 100" />

      {/* right figure */}
      <circle cx="135" cy="36" r="10" />
      <path d="M135 46 V 78" />
      <path d="M135 56 L 124 70" />
      <path d="M135 56 L 146 68" />
      <path d="M135 78 L 128 100" />
      <path d="M135 78 L 142 100" />

      {/* tiny coffee cup between them */}
      <path d="M95 80 H 105 V 88 Q 100 92 95 88 Z" strokeOpacity="0.6" />
      <path d="M97 76 Q 100 73 103 76" strokeOpacity="0.4" />

      {/* connecting arc — companionship */}
      <path d="M68 30 Q 100 12 130 30" strokeOpacity="0.25" strokeDasharray="2 4" />
    </svg>
  );
}
