// Cute hand-drawn line-doodle illustrations (self-contained inline SVG, no
// external assets). Stroke uses currentColor so they inherit text color and
// stay theme-safe; small color accents reference the app's CSS vars. Give the
// wrapper a text color (e.g. text-foreground) + an accent via style.
//
// Style: loose single-weight strokes, rounded caps, a few sparkles — matching
// the friendly doodle look Sophiya referenced. Keep them simple; charm > detail.

import type { CSSProperties } from "react";

interface DoodleProps {
  className?: string;
  style?: CSSProperties;
}

const S = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 3,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

/** A little wizard reading a glowing tablet — the analytics "seer". */
export function WizardDoodle({ className, style }: DoodleProps) {
  return (
    <svg viewBox="0 0 200 200" className={className} style={style} role="img" aria-label="Wizard reading insights">
      {/* sparkles */}
      <g style={{ color: "var(--viz)" }} stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
        <path d="M150 40 v10 M145 45 h10" />
        <path d="M168 78 v8 M164 82 h8" />
        <path d="M44 62 v9 M39.5 66.5 h9" />
        <circle cx="160" cy="120" r="2.4" fill="currentColor" stroke="none" />
        <circle cx="52" cy="96" r="2" fill="currentColor" stroke="none" />
      </g>
      {/* hat */}
      <path {...S} d="M78 60 L104 16 L128 60 Z" />
      <path {...S} d="M72 60 q32 12 62 0" />
      <path style={{ color: "var(--viz)" }} stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" fill="none" d="M99 34 l3 5 5 1 -4 4 1 5 -5 -3 -5 3 1 -5 -4 -4 5 -1z" />
      {/* head + face */}
      <circle {...S} cx="104" cy="80" r="17" />
      <path {...S} d="M99 79 q0 3 0 3" />
      <path {...S} d="M112 79 q0 3 0 3" />
      <path {...S} d="M100 88 q4 3 8 0" />
      {/* body */}
      <path {...S} d="M104 97 v40" />
      <path {...S} d="M104 104 l-22 16" />
      <path {...S} d="M104 104 l22 12" />
      <path {...S} d="M104 137 l-12 34" />
      <path {...S} d="M104 137 l12 34" />
      {/* tablet with a glowing spark */}
      <rect {...S} x="120" y="98" width="30" height="22" rx="3" transform="rotate(-14 135 109)" />
      <path style={{ color: "var(--viz)" }} stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" fill="none" d="M133 104 l2 3 3 1 -3 2 0 3 -3 -2 -3 2 1 -3 -2 -2 3 -1z" />
    </svg>
  );
}

/** Empty-state: a friendly bar chart sprouting a little plant. */
export function ChartSproutDoodle({ className, style }: DoodleProps) {
  return (
    <svg viewBox="0 0 200 160" className={className} style={style} role="img" aria-label="No data yet">
      <path {...S} d="M28 132 h150" />
      <rect {...S} x="42" y="96" width="22" height="36" rx="3" />
      <rect {...S} x="78" y="72" width="22" height="60" rx="3" />
      <rect {...S} x="114" y="104" width="22" height="28" rx="3" />
      {/* growing sprout out of the tall bar */}
      <path style={{ color: "var(--viz)" }} stroke="currentColor" {...{ fill: "none", strokeWidth: 3, strokeLinecap: "round" as const, strokeLinejoin: "round" as const }} d="M89 72 v-22" />
      <path style={{ color: "var(--viz)" }} stroke="currentColor" fill="none" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" d="M89 58 q-12 -2 -14 -14 q13 -1 14 14z" />
      <path style={{ color: "var(--viz)" }} stroke="currentColor" fill="none" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" d="M89 52 q12 -3 15 -15 q-13 -2 -15 15z" />
      {/* sparkles */}
      <g style={{ color: "var(--viz)" }} stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
        <path d="M150 60 v8 M146 64 h8" />
        <path d="M40 52 v7 M36.5 55.5 h7" />
      </g>
    </svg>
  );
}

/** Empty-state: a speech bubble with a heart — for the comments/engagement widgets. */
export function ChatHeartDoodle({ className, style }: DoodleProps) {
  return (
    <svg viewBox="0 0 200 160" className={className} style={style} role="img" aria-label="No comments yet">
      <path {...S} d="M40 44 h120 a12 12 0 0 1 12 12 v46 a12 12 0 0 1 -12 12 H86 l-22 20 v-20 H40 a12 12 0 0 1 -12 -12 V56 a12 12 0 0 1 12 -12z" />
      <path style={{ color: "var(--viz)" }} stroke="currentColor" fill="none" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round"
        d="M100 96 c-14 -10 -24 -18 -24 -28 a10 10 0 0 1 20 -4 a10 10 0 0 1 20 4 c0 10 -10 18 -24 28z" transform="translate(0 -6) scale(1)" />
      <g style={{ color: "var(--viz)" }} stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
        <path d="M166 30 v8 M162 34 h8" />
      </g>
    </svg>
  );
}

/** A tiny sparkle cluster — inline accent next to headings. */
export function SparkleAccent({ className, style }: DoodleProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} style={style} aria-hidden="true">
      <path fill="currentColor" d="M12 2l1.6 5.4L19 9l-5.4 1.6L12 16l-1.6-5.4L5 9l5.4-1.6z" />
      <circle cx="19" cy="18" r="1.6" fill="currentColor" />
      <circle cx="5.5" cy="17" r="1.2" fill="currentColor" />
    </svg>
  );
}
