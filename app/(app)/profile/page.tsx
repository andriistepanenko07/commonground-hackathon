import Link from "next/link";
import { redirect } from "next/navigation";
import {
  MapPin,
  UserCircle,
  Briefcase,
  Plane,
  Languages as LanguagesIcon,
  Heart,
  CalendarClock,
  Pencil,
} from "lucide-react";
import { getSessionUserId } from "@/lib/session";
import { getUserById } from "@/lib/store";
import ProfileActions from "@/components/ProfileActions";
import type { DayPart } from "@/lib/types";

const DAY_PART_LABELS: Record<DayPart, string> = {
  "weekday-morning": "Weekday morning",
  "weekday-day": "Weekday daytime",
  "weekday-evening": "Weekday evening",
  "weekend-morning": "Weekend morning",
  "weekend-day": "Weekend daytime",
  "weekend-evening": "Weekend evening",
};

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const userId = await getSessionUserId();
  if (!userId) redirect("/login");
  const user = await getUserById(userId);
  if (!user) redirect("/login");

  return (
    <div className="px-5 pt-6 pb-8 space-y-5">
      <div>
        <div className="text-[11px] uppercase tracking-widest text-ink-soft font-semibold">
          Profile
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink mt-2">
          {user.display_name || "You"}
        </h1>
        <p className="text-xs text-ink-soft mt-1">{user.email}</p>
      </div>

      <div className="rounded-xl border border-border-soft bg-surface card-shadow divide-y divide-border-soft">
        <Row icon={<MapPin className="h-4 w-4" />} label="In">
          {user.city}
          {user.neighbourhood ? ` · ${user.neighbourhood}` : ""}
        </Row>
        <Row icon={<UserCircle className="h-4 w-4" />} label="Status">
          {user.status === "newcomer"
            ? "Newcomer"
            : user.status === "local-meet"
            ? "Local, want to meet"
            : "Local, want to help"}
        </Row>
        <Row icon={<Briefcase className="h-4 w-4" />} label="Life stage">{user.life_stage}</Row>
        <Row icon={<Plane className="h-4 w-4" />} label="What brought you">{user.what_brought_you_here}</Row>
        <Row icon={<LanguagesIcon className="h-4 w-4" />} label="Languages">
          {user.languages_spoken.length > 0 ? user.languages_spoken.join(", ") : "—"}
          {user.languages_to_practice && user.languages_to_practice.length > 0 && (
            <span className="block text-xs text-ink-soft mt-1">
              practising: {user.languages_to_practice.join(", ")}
            </span>
          )}
        </Row>
        <Row icon={<Heart className="h-4 w-4" />} label="Interests">
          <div className="flex flex-wrap gap-1.5">
            {user.interests.length > 0 ? (
              user.interests.map((t) => (
                <span key={t} className="text-xs px-2.5 py-1 rounded-full bg-chip-bg text-chip-text">
                  {t}
                </span>
              ))
            ) : (
              <span className="text-sm text-ink-soft">—</span>
            )}
          </div>
        </Row>
        <Row icon={<CalendarClock className="h-4 w-4" />} label="Free time">
          {user.availability.length > 0
            ? user.availability.map((a) => DAY_PART_LABELS[a.day_part]).join(", ")
            : "—"}
        </Row>
      </div>

      <Link
        href="/onboarding/summary"
        className="flex items-center justify-center gap-2 w-full rounded-lg bg-accent text-white font-semibold py-3"
      >
        <Pencil className="h-4 w-4" />
        Edit profile
      </Link>

      <div className="pt-2 border-t border-border-soft">
        <ProfileActions />
      </div>
    </div>
  );
}

function Row({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="p-4 flex gap-3">
      <div className="text-accent shrink-0 mt-0.5">{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="text-[11px] uppercase tracking-wider text-ink-soft font-semibold mb-0.5">
          {label}
        </div>
        <div className="text-sm text-ink">{children}</div>
      </div>
    </div>
  );
}
