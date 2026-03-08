"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home, Sparkles, BookOpen, Calendar, Users,
  BarChart2, Lightbulb, MessageSquare, Link as LinkIcon, Layers
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/", icon: Home, label: "Home" },
  { href: "/ai-studio", icon: Sparkles, label: "AI" },
  { href: "/swipe-file", icon: BookOpen, label: "Swipe" },
  { href: "/calendar", icon: Calendar, label: "Calendar" },
  { href: "/creators", icon: Users, label: "Creators" },
];

const MORE_ITEMS = [
  { href: "/analytics", icon: BarChart2, label: "Analytics" },
  { href: "/ideas", icon: Lightbulb, label: "Ideas" },
  { href: "/reddit", icon: MessageSquare, label: "Reddit" },
  { href: "/sources", icon: LinkIcon, label: "Sources" },
  { href: "/lead-magnets", icon: Layers, label: "Leads" },
];

const ACTIVE_COLOR = "oklch(0.65 0.22 25)";

export default function BottomNav() {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t"
      style={{
        background: "oklch(0.10 0.015 25 / 95%)",
        backdropFilter: "blur(12px)",
        borderColor: "oklch(0.60 0.22 25 / 18%)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      <div className="flex items-center justify-around h-16 px-1">
        {NAV_ITEMS.map(({ href, icon: Icon, label }) => (
          <Link
            key={href}
            href={href}
            className="flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-all text-muted-foreground hover:text-foreground"
            style={isActive(href) ? { color: ACTIVE_COLOR } : undefined}
          >
            <Icon size={22} strokeWidth={isActive(href) ? 2.5 : 1.8} />
            <span className="text-[10px] font-medium">{label}</span>
          </Link>
        ))}

        {/* More menu — dropdown for secondary pages */}
        <MoreMenu pathname={pathname} items={MORE_ITEMS} />
      </div>
    </nav>
  );
}

function MoreMenu({
  pathname,
  items,
}: {
  pathname: string;
  items: typeof MORE_ITEMS;
}) {
  const isAnyActive = items.some(({ href }) => pathname.startsWith(href));

  return (
    <div className="relative group">
      <button
        className="flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-all text-muted-foreground hover:text-foreground"
        style={isAnyActive ? { color: ACTIVE_COLOR } : undefined}
      >
        <BarChart2 size={22} strokeWidth={isAnyActive ? 2.5 : 1.8} />
        <span className="text-[10px] font-medium">More</span>
      </button>

      {/* Dropdown */}
      <div
        className="absolute bottom-full right-0 mb-2 w-40 rounded-xl border overflow-hidden opacity-0 invisible group-focus-within:opacity-100 group-focus-within:visible transition-all"
        style={{
          background: "oklch(0.14 0.015 25)",
          borderColor: "oklch(0.60 0.22 25 / 20%)",
          boxShadow: "0 -4px 24px oklch(0 0 0 / 50%)",
        }}
      >
        {items.map(({ href, icon: Icon, label }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-3 px-4 py-3 text-sm transition-colors hover:bg-white/5 text-foreground"
            style={pathname.startsWith(href) ? { color: ACTIVE_COLOR } : undefined}
          >
            <Icon size={16} />
            {label}
          </Link>
        ))}
      </div>
    </div>
  );
}
