"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Calendar, Gift, Lightbulb, PenLine, LayoutDashboard, Flame, MessageCircle, BarChart2, Users2 } from "lucide-react";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/calendar", label: "Calendar", icon: Calendar },
  { href: "/viral-posts", label: "Viral Posts", icon: Flame },
  { href: "/engagement", label: "Engagement Hub", icon: MessageCircle },
  { href: "/analytics", label: "Analytics", icon: BarChart2 },
  { href: "/networking", label: "Networking", icon: Users2 },
  { href: "/lead-magnets", label: "Lead Magnets", icon: Gift },
  { href: "/ideas", label: "Post Ideas", icon: Lightbulb },
];

// Desktop-only sidebar (hidden below lg). On mobile the app falls back to
// just the page content -- no bottom nav exists anymore (removed 2026-07-08),
// and rebuilding one wasn't in scope for this desktop-webapp revamp.
export default function Sidebar() {
  const pathname = usePathname();
  // Hidden on public customer-facing lead-magnet landing pages -- same
  // convention app/(public)/layout.tsx documents for the old BottomNav.
  if (pathname?.startsWith("/lead-magnet")) return null;
  return (
    <aside
      className="hidden lg:flex lg:flex-col lg:w-60 lg:shrink-0 lg:h-dvh lg:sticky lg:top-0 border-r px-4 py-6"
      style={{ background: "var(--sidebar)", borderColor: "var(--sidebar-border)" }}
    >
      <div className="px-2.5 mb-6">
        <p className="text-sm font-bold tracking-tight">LinkedIn HQ</p>
        <p className="text-xs text-muted-foreground">Taha Anwar</p>
      </div>
      <Link
        href="/calendar"
        className="flex items-center justify-center gap-2 rounded-full py-3 mb-6 text-sm font-semibold shadow-sm transition-transform hover:scale-[1.02]"
        style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}
      >
        <PenLine size={16} />
        Write a post
      </Link>
      <nav className="flex flex-col gap-1">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname?.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-full text-sm font-medium transition-colors"
              style={
                active
                  ? { background: "var(--sidebar-accent)", color: "var(--sidebar-accent-foreground)" }
                  : { color: "var(--sidebar-foreground)" }
              }
              onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = "var(--sidebar-border)"; }}
              onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = "transparent"; }}
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
