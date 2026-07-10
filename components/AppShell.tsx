"use client";

import { usePathname } from "next/navigation";

// Applies the internal-app CSS scope (globals.css's .app-shell -- the
// Taplio-inspired soft palette) everywhere EXCEPT the public, customer-facing
// lead-magnet landing pages, which must keep :root's original values (real
// prospects land there; this app is internal-only). Same pathname-guard
// pattern Sidebar.tsx already uses to hide itself on those routes.
export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // Only the public /lead-magnet/<slug> landing pages keep :root's brand colors.
  // Match "/lead-magnet/" (trailing slash) so the internal /lead-magnets list
  // page isn't wrongly treated as public and stripped of the .app-shell theme.
  const isPublic = pathname === "/lead-magnet" || pathname?.startsWith("/lead-magnet/");
  return <div className={`${isPublic ? "" : "app-shell "}lg:flex lg:min-h-dvh`}>{children}</div>;
}
