"use client";

import { useEffect } from "react";
import { MapPin, Languages as LanguagesIcon, Heart, CalendarClock, X } from "lucide-react";
import type { SafeMember, DayPart } from "@/lib/types";
import { avatarClass, initials } from "./avatar";

const DAY_PART_LABELS: Record<DayPart, string> = {
  "weekday-morning": "Weekday morning",
  "weekday-day": "Weekday daytime",
  "weekday-evening": "Weekday evening",
  "weekend-morning": "Weekend morning",
  "weekend-day": "Weekend daytime",
  "weekend-evening": "Weekend evening",
};

export default function MemberPreview({
  member,
  sharedInterests,
  onClose,
}: {
  member: SafeMember;
  sharedInterests: string[];
  onClose: () => void;
}) {
  // Close on Esc.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const sharedSet = new Set(sharedInterests);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      role="dialog"
      aria-modal="true"
      aria-label={`Profile preview for ${member.display_name}`}
    >
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-ink/30"
      />

      {/* Sheet */}
      <div className="relative w-full max-w-[430px] mx-auto bg-surface rounded-t-3xl shadow-2xl max-h-[75dvh] overflow-y-auto pb-6 animate-in slide-in-from-bottom duration-200">
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 rounded-full bg-border-soft" />
        </div>

        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="absolute top-3 right-3 text-ink-soft p-1.5 rounded-full hover:bg-chip-bg"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="px-6 pt-2">
          <div className="flex items-center gap-4">
            <div
              className={`w-14 h-14 rounded-full flex items-center justify-center text-lg font-semibold text-white shadow-sm ${avatarClass(member.id)}`}
            >
              {initials(member.display_name)}
            </div>
            <div className="min-w-0">
              <h2 className="text-xl font-semibold tracking-tight text-ink truncate">
                {member.display_name}
              </h2>
              <p className="text-xs text-ink-soft inline-flex items-center gap-1.5 mt-0.5">
                <MapPin className="h-3.5 w-3.5" />
                {member.neighbourhood || "Neighbourhood not set"}
              </p>
            </div>
          </div>

          <Section icon={<Heart className="h-4 w-4" />} label="Interests">
            {member.interests.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {member.interests.map((t) => {
                  const isShared = sharedSet.has(t);
                  return (
                    <span
                      key={t}
                      className={
                        isShared
                          ? "text-xs px-2.5 py-1 rounded-full bg-accent-soft text-accent font-semibold"
                          : "text-xs px-2.5 py-1 rounded-full bg-chip-bg text-chip-text"
                      }
                    >
                      {t}
                    </span>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-ink-soft">—</p>
            )}
            {sharedInterests.length > 0 && member.interests.some((i) => sharedSet.has(i)) && (
              <p className="text-[11px] text-ink-soft mt-2">
                Highlighted chips are interests your group shares.
              </p>
            )}
          </Section>

          <Section icon={<LanguagesIcon className="h-4 w-4" />} label="Languages">
            {member.languages_spoken.length > 0 ? (
              <p className="text-sm text-ink">{member.languages_spoken.join(", ")}</p>
            ) : (
              <p className="text-sm text-ink-soft">—</p>
            )}
            {member.languages_to_practice && member.languages_to_practice.length > 0 && (
              <p className="text-xs text-ink-soft mt-1">
                Practising: {member.languages_to_practice.join(", ")}
              </p>
            )}
          </Section>

          <Section icon={<CalendarClock className="h-4 w-4" />} label="Usually free">
            {member.availability.length > 0 ? (
              <p className="text-sm text-ink">
                {member.availability.map((a) => DAY_PART_LABELS[a.day_part]).join(", ")}
              </p>
            ) : (
              <p className="text-sm text-ink-soft">—</p>
            )}
          </Section>
        </div>
      </div>
    </div>
  );
}

function Section({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-5">
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-ink-soft font-semibold mb-1.5">
        <span className="text-accent">{icon}</span>
        {label}
      </div>
      {children}
    </div>
  );
}
