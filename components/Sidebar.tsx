"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Calendar, Gift, Lightbulb } from "lucide-react";

const NAV = [
  { href: "/calendar", label: "Calendar", icon: Calendar },
  { href: "/lead-magnets", label: "Lead Magnets", icon: Gift },
  { href: "/ideas", label: "Post Ideas", icon: Lightbulb },
];

// Desktop-only sidebar (hidden below lg). On mobile the app falls back to
// just the page content -- no bottom nav exists anymore (removed 2026-07-08),
// and rebuilding one wasn't in scope for this desktop-webapp revamp.
export default function Sidebar() {
  const pathname = usePathname();
  return (
    <aside
      className="hidden lg:flex lg:flex-col lg:w-56 lg:shrink-0 lg:h-dvh lg:sticky lg:top-0 border-r px-3 py-5"
      style={{ background: "var(--sidebar)", borderColor: "var(--sidebar-border)" }}
    >
      <div className="px-2 mb-6">
        <p className="text-sm font-bold tracking-tight">LinkedIn HQ</p>
        <p className="text-xs text-muted-foreground">Taha Anwar</p>
      </div>
      <nav className="flex flex-col gap-1">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname?.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-sm font-medium transition-colors"
              style={
                active
                  ? { background: "var(--sidebar-accent)", color: "var(--sidebar-accent-foreground)" }
                  : { color: "var(--sidebar-foreground)" }
              }
            >
              <Icon size={17} />
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
