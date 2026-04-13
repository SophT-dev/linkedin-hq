// Route group layout for public-facing pages. Intentionally minimal —
// we do NOT redefine <html>/<body> here because the root app/layout.tsx
// already supplies them. Internal chrome (BottomNav, QuickCaptureButton)
// is hidden on /lead-magnet/* paths inside those components themselves.

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
