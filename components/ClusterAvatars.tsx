"use client";

import { useState } from "react";
import type { SafeMember } from "@/lib/types";
import { avatarClass, initials } from "./avatar";
import MemberPreview from "./MemberPreview";

export default function ClusterAvatars({
  members,
  sharedInterests,
}: {
  members: SafeMember[];
  sharedInterests: string[];
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = members.find((m) => m.id === selectedId) ?? null;

  return (
    <>
      <div className="flex -space-x-2">
        {members.slice(0, 6).map((m) => (
          <button
            type="button"
            key={m.id}
            onClick={() => setSelectedId(m.id)}
            aria-label={`See ${m.display_name}'s profile`}
            className={`w-11 h-11 rounded-full border-2 border-surface flex items-center justify-center text-sm font-semibold text-white shadow-sm transition hover:scale-105 active:scale-100 ${avatarClass(m.id)}`}
          >
            {initials(m.display_name)}
          </button>
        ))}
      </div>
      <p className="text-[11px] text-ink-soft mt-2 italic">Tap an avatar to see who they are.</p>
      {selected && (
        <MemberPreview
          member={selected}
          sharedInterests={sharedInterests}
          onClose={() => setSelectedId(null)}
        />
      )}
    </>
  );
}
