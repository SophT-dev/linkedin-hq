"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Calendar, Gift, Lightbulb, PenLine, LayoutDashboard, Flame, MessageCircle, BarChart2, Users2, Menu, X } from "lucide-react";

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

function NavContent({ pathname, onNavigate }: { pathname: string | null; onNavigate?: () => void }) {
  return (
    <>
      <div className="px-2.5 mb-6">
        <p className="text-sm font-bold tracking-tight">LinkedIn HQ</p>
        <p className="text-xs text-muted-foreground">Taha Anwar</p>
      </div>
      <Link
        href="/calendar"
        onClick={onNavigate}
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
              onClick={onNavigate}
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
    </>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  // Hidden ONLY on public customer-facing lead-magnet landing pages
  // (/lead-magnet/<slug>) -- NOT on the internal /lead-magnets list page.
  // Must match the "/lead-magnet/" prefix (with trailing slash) so the plural
  // internal route doesn't collide -- "/lead-magnets".startsWith("/lead-magnet")
  // was true and wrongly nulled the whole sidebar on that page.
  if (pathname === "/lead-magnet" || pathname?.startsWith("/lead-magnet/")) return null;

  return (
    <>
      {/* Mobile top bar -- hidden at lg+, where the real sidebar takes over */}
      <div
        className="lg:hidden sticky top-0 z-40 flex items-center justify-between px-4 py-3 border-b"
        style={{ background: "var(--nav-bg)", borderColor: "var(--sidebar-border)" }}
      >
        <p className="text-sm font-bold tracking-tight">LinkedIn HQ</p>
        <button
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          className="p-2 rounded-full"
          style={{ color: "var(--sidebar-foreground)" }}
        >
          <Menu size={20} />
        </button>
      </div>

      {/* Mobile retractable drawer */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="absolute inset-0"
            style={{ background: "oklch(0 0 0 / 40%)" }}
            onClick={() => setOpen(false)}
          />
          <aside
            className="relative w-72 max-w-[80vw] h-dvh px-4 py-6 overflow-y-auto border-r shadow-xl"
            style={{ background: "var(--sidebar)", borderColor: "var(--sidebar-border)" }}
          >
            <button
              onClick={() => setOpen(false)}
              aria-label="Close menu"
              className="absolute top-4 right-4 p-1.5 rounded-full"
              style={{ color: "var(--sidebar-foreground)" }}
            >
              <X size={18} />
            </button>
            <NavContent pathname={pathname} onNavigate={() => setOpen(false)} />
          </aside>
        </div>
      )}

      {/* Desktop-only static sidebar */}
      <aside
        className="hidden lg:flex lg:flex-col lg:w-60 lg:shrink-0 lg:h-dvh lg:sticky lg:top-0 border-r px-4 py-6"
        style={{ background: "var(--sidebar)", borderColor: "var(--sidebar-border)" }}
      >
        <NavContent pathname={pathname} />
      </aside>
    </>
  );
}
