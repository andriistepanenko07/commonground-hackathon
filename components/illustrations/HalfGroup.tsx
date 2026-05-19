export default function HalfGroup({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 160 100"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {/* ground line */}
      <path d="M10 88 Q 80 92 150 88" strokeOpacity="0.4" />

      {/* solid figure — you */}
      <circle cx="55" cy="30" r="9" />
      <path d="M55 39 V 65" />
      <path d="M55 47 L 45 60" />
      <path d="M55 47 L 65 60" />
      <path d="M55 65 L 48 84" />
      <path d="M55 65 L 62 84" />

      {/* sketched figure — being found */}
      <circle cx="110" cy="30" r="9" strokeDasharray="2 3" strokeOpacity="0.55" />
      <path d="M110 39 V 65" strokeDasharray="2 3" strokeOpacity="0.55" />
      <path d="M110 47 L 100 60" strokeDasharray="2 3" strokeOpacity="0.55" />
      <path d="M110 47 L 120 60" strokeDasharray="2 3" strokeOpacity="0.55" />
      <path d="M110 65 L 103 84" strokeDasharray="2 3" strokeOpacity="0.55" />
      <path d="M110 65 L 117 84" strokeDasharray="2 3" strokeOpacity="0.55" />

      {/* shimmer dots — searching */}
      <circle cx="135" cy="20" r="1.4" strokeOpacity="0.5" />
      <circle cx="142" cy="34" r="1" strokeOpacity="0.4" />
      <circle cx="128" cy="42" r="1.2" strokeOpacity="0.4" />
    </svg>
  );
}
