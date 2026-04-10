"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Newspaper, Sparkles, Mic } from "lucide-react";

// Stripped down to the v2 architecture: 3 pages only.
// Batch and Capture are placeholders until those pages are built.
// All other pages still exist on disk but are unreachable from the nav.
const NAV_ITEMS: { href: string; icon: typeof Newspaper; label: string; enabled: boolean }[] = [
  { href: "/batch", icon: Sparkles, label: "batch", enabled: true },
  { href: "/news", icon: Newspaper, label: "news", enabled: true },
  { href: "/capture", icon: Mic, label: "capture", enabled: false },
];

const ACTIVE_COLOR = "var(--color-accent)";

export default function BottomNav() {
  const pathname = usePathname();
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t"
      style={{
        background: "var(--nav-bg)",
        backdropFilter: "blur(12px)",
        borderColor: "var(--border-accent)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      <div className="flex items-center justify-around h-16 px-1">
        {NAV_ITEMS.map(({ href, icon: Icon, label, enabled }) => {
          const active = isActive(href);
          const className =
            "flex flex-col items-center gap-0.5 px-5 py-2 rounded-xl transition-all";

          if (!enabled) {
            return (
              <span
                key={href}
                className={`${className} text-muted-foreground opacity-40 cursor-not-allowed`}
                title="coming soon"
              >
                <Icon size={22} strokeWidth={1.8} />
                <span className="text-[10px] font-medium">{label}</span>
              </span>
            );
          }

          return (
            <Link
              key={href}
              href={href}
              className={`${className} text-muted-foreground hover:text-foreground`}
              style={active ? { color: ACTIVE_COLOR } : undefined}
            >
              <Icon size={22} strokeWidth={active ? 2.5 : 1.8} />
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
