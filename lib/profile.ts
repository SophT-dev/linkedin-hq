// Taha's live public-profile snapshot, surfaced on the dashboard so Sophiya
// always sees exactly what's on his LinkedIn right now — and can change any
// piece in one place. Each asset is a SEPARATE, swappable file in
// public/profile/, so updating the real profile = drop a new file with the same
// name (or point the path here at a new one). Nothing is hardcoded in the JSX.
//
// To update after Taha changes his LinkedIn:
//   • Profile picture → replace public/profile/taha-avatar.jpg
//   • Banner          → replace public/profile/taha-banner.png
//   • Name / tagline  → edit the strings below
// Last verified: 2026-07-14.

export interface LinkedInProfile {
  name: string;
  greeting: string;
  tagline: string;
  company: string;
  profileUrl: string;
  avatar: string;   // public path
  banner: string;   // public path
  verifiedOn: string;
}

export const tahaProfile: LinkedInProfile = {
  name: "Taha Anwar",
  greeting: "Welcome back",
  tagline: "Engineering B2B Outbound Around Real Market Signals | Founder @ Bleed AI",
  company: "Bleed AI",
  profileUrl: "https://www.linkedin.com/in/taha-anwar-bleedai/",
  avatar: "/profile/taha-avatar.jpg",
  banner: "/profile/taha-banner.png",
  verifiedOn: "2026-07-14",
};
