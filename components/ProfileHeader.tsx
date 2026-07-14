import Image from "next/image";
import { BadgeCheck, ExternalLink, Pencil } from "lucide-react";
import { tahaProfile as p } from "@/lib/profile";
import { SparkleAccent } from "@/components/analytics/Doodles";

// A live snapshot of Taha's LinkedIn profile — greeting + the three editable
// pieces (banner, photo, headline) shown as distinct, labelled elements so
// Sophiya can always see the current public profile and knows what to swap.
// Assets live as separate files in public/profile/ (see lib/profile.ts).

function PieceLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
      {children}
    </span>
  );
}

export default function ProfileHeader() {
  return (
    <section className="space-y-4">
      {/* Greeting */}
      <div className="flex items-center gap-2">
        <div>
          <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight flex items-center gap-2">
            {p.greeting}, {p.name.split(" ")[0]}
            <span aria-hidden>👋</span>
          </h1>
          <p className="text-sm text-muted-foreground flex items-center gap-1.5">
            <SparkleAccent className="w-3.5 h-3.5" style={{ color: "var(--primary)" }} />
            Here&apos;s your LinkedIn profile as it looks right now.
          </p>
        </div>
      </div>

      {/* Profile card — banner + photo + headline, each a labelled element */}
      <div className="rounded-2xl border bg-card border-border shadow-sm overflow-hidden">
        {/* Banner element */}
        <div className="relative">
          <div className="relative h-32 lg:h-44 w-full">
            <Image src={p.banner} alt="Taha's LinkedIn banner" fill priority className="object-cover" sizes="(max-width: 1024px) 100vw, 1024px" />
          </div>
          <div className="absolute top-3 left-3 rounded-md bg-black/45 backdrop-blur px-2 py-0.5">
            <PieceLabel><span className="text-white/90">Banner</span></PieceLabel>
          </div>
          <a
            href={p.profileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute top-3 right-3 inline-flex items-center gap-1 rounded-full bg-black/45 backdrop-blur px-2.5 py-1 text-[11px] font-medium text-white/90 hover:bg-black/60 transition-colors"
          >
            <ExternalLink size={12} /> View live
          </a>
        </div>

        <div className="px-5 lg:px-7 pb-5">
          {/* Photo element (overlaps banner) */}
          <div className="flex items-end justify-between -mt-12 lg:-mt-14">
            <div className="flex flex-col gap-1">
              <div className="relative w-24 h-24 lg:w-28 lg:h-28 rounded-full ring-4 ring-[var(--card)] overflow-hidden shadow-md bg-muted">
                <Image src={p.avatar} alt={p.name} fill className="object-cover" sizes="112px" />
              </div>
              <PieceLabel>Profile photo</PieceLabel>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-sm font-semibold shadow-sm">
              <span className="w-2 h-2 rounded-full" style={{ background: "var(--destructive)" }} />
              {p.company}
            </span>
          </div>

          {/* Name */}
          <div className="mt-3 flex items-center gap-2">
            <h2 className="text-xl font-bold">{p.name}</h2>
            <BadgeCheck size={18} style={{ color: "var(--primary)" }} />
          </div>

          {/* Headline / tagline element */}
          <div className="mt-1.5 space-y-1">
            <p className="text-sm text-foreground/90 leading-relaxed max-w-2xl">{p.tagline}</p>
            <PieceLabel><Pencil size={10} /> Headline</PieceLabel>
          </div>

          {/* Snapshot footer */}
          <p className="mt-4 text-[11px] text-muted-foreground">
            Live snapshot · verified {p.verifiedOn} · edit any piece in{" "}
            <code className="px-1 rounded bg-muted">lib/profile.ts</code> + <code className="px-1 rounded bg-muted">public/profile/</code>
          </p>
        </div>
      </div>
    </section>
  );
}
