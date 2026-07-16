// Small relative-time helpers shared by the Dashboard v2 widgets.
// Kept local to components/dashboard so nothing else in the app depends on it.

// Parse a sheet date that may be a full ISO timestamp or a bare YYYY-MM-DD.
export function safeDate(value: string): Date | null {
  if (!value) return null;
  const d = value.length <= 10 ? new Date(value + "T00:00:00") : new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

// "just now" / "3m ago" / "5h ago" / "2d ago" from a date string.
export function timeAgo(value: string): string {
  const d = safeDate(value);
  if (!d) return "";
  const mins = Math.max(0, Math.round((Date.now() - d.getTime()) / 60000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.round(days / 30);
  return `${months}mo ago`;
}
