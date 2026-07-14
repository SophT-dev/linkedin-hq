import Image from "next/image";
import { BadgeCheck, ExternalLink } from "lucide-react";
import { tahaProfile as p } from "@/lib/profile";

// Compact live snapshot of Taha's LinkedIn profile — a glance-bar, not a hero.
// Still shows the three real pieces (banner thumbnail, photo, headline) so
// Sophiya can eyeball the current public profile. Assets are separate, swappable
// files in public/profile/ (see lib/profile.ts).

export default function ProfileHeader() {
  return (
    <section className="space-y-3">
      <div>
        <h1 className="text-xl lg:text-2xl font-extrabold tracking-tight flex items-center gap-2">
          {p.greeting}, {p.name.split(" ")[0]} <span aria-hidden>👋</span>
        </h1>
      </div>

      <div className="rounded-2xl border bg-card border-border shadow-sm p-3 flex items-center gap-3">
        {/* Banner thumbnail (hidden on small screens) */}
        <div className="relative hidden sm:block w-36 h-14 rounded-lg overflow-hidden shrink-0 border border-border">
          <Image src={p.banner} alt="LinkedIn banner" fill className="object-cover" sizes="144px" />
        </div>

        {/* Avatar */}
        <div className="relative w-12 h-12 rounded-full overflow-hidden shrink-0 ring-2 ring-[var(--card)] shadow-sm">
          <Image src={p.avatar} alt={p.name} fill className="object-cover" sizes="48px" />
        </div>

        {/* Name + headline */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-sm truncate">{p.name}</span>
            <BadgeCheck size={14} style={{ color: "var(--primary)" }} className="shrink-0" />
          </div>
          <p className="text-xs text-muted-foreground truncate">{p.tagline}</p>
        </div>

        {/* Company + live link */}
        <div className="hidden sm:flex items-center gap-2 shrink-0">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-xs font-semibold">
            <span className="w-2 h-2 rounded-full" style={{ background: "var(--destructive)" }} />
            {p.company}
          </span>
          <a
            href={p.profileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs font-medium hover:underline"
            style={{ color: "var(--primary)" }}
            title={`Live snapshot · verified ${p.verifiedOn} · edit in lib/profile.ts`}
          >
            <ExternalLink size={13} /> View live
          </a>
        </div>
      </div>
    </section>
  );
}
