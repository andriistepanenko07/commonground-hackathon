"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, CalendarDays, User } from "lucide-react";

const TABS = [
  { href: "/now", label: "Now", Icon: Home },
  { href: "/events", label: "Events", Icon: CalendarDays },
  { href: "/profile", label: "Profile", Icon: User },
];

export default function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="border-t border-border-soft bg-surface">
      <ul className="grid grid-cols-3">
        {TABS.map(({ href, label, Icon }) => {
          const active = pathname?.startsWith(href);
          return (
            <li key={href}>
              <Link
                href={href}
                className={`flex flex-col items-center gap-1 py-2.5 ${
                  active ? "text-accent" : "text-ink-soft"
                }`}
              >
                <Icon
                  className={active ? "h-5 w-5" : "h-5 w-5"}
                  strokeWidth={active ? 2.4 : 1.8}
                />
                <span className={`text-[11px] ${active ? "font-semibold" : "font-medium"}`}>
                  {label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
