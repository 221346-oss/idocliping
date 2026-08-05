import { cn } from "@/lib/utils";

type GlyphProps = {
  active?: boolean;
  className?: string;
  size?: number;
};

/**
 * Clipper nav glyphs — hand-authored, brand-specific.
 * Shared language: a 24px box, 1.75 stroke, softly rounded joints,
 * and a single "clip corner" cut that echoes the stacked-clapper mark.
 * Inactive renders as outline; active fills with currentColor.
 */

const base = (className?: string, size = 24) => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  xmlns: "http://www.w3.org/2000/svg",
  className: cn("shrink-0", className),
  "aria-hidden": true as const,
});

/** Explore — a clapper lens: slanted aperture inside a rounded square. */
export function ExploreGlyph({ active, className, size }: GlyphProps) {
  return (
    <svg {...base(className, size)}>
      <rect
        x="2.6"
        y="2.6"
        width="18.8"
        height="18.8"
        rx="6.4"
        transform="rotate(-12 12 12)"
        stroke="currentColor"
        strokeWidth="1.75"
        fill={active ? "currentColor" : "none"}
      />
      <circle
        cx="12"
        cy="12"
        r="3.35"
        fill={active ? "hsl(var(--primary-foreground))" : "currentColor"}
      />
    </svg>
  );
}

/** Activity — a submission flag planted on a pole. */
export function ActivityGlyph({ active, className, size }: GlyphProps) {
  return (
    <svg {...base(className, size)}>
      <path
        d="M6.2 3.2v17.6"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <path
        d="M6.2 4.4h9.9a1 1 0 0 1 .77 1.64l-2.1 2.53a1 1 0 0 0 0 1.28l2.1 2.53a1 1 0 0 1-.77 1.64H6.2z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
        fill={active ? "currentColor" : "none"}
      />
    </svg>
  );
}

/** Wallet — rounded pouch with a clipped flap corner and coin slot. */
export function WalletGlyph({ active, className, size }: GlyphProps) {
  return (
    <svg {...base(className, size)}>
      <path
        d="M3.2 8.6a3.4 3.4 0 0 1 3.4-3.4h8.1l2.6-2.05a1 1 0 0 1 1.62.78V5.3a3.4 3.4 0 0 1 2.88 3.36v6.74a3.4 3.4 0 0 1-3.4 3.4H6.6a3.4 3.4 0 0 1-3.4-3.4z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
        fill={active ? "currentColor" : "none"}
      />
      <circle
        cx="17.1"
        cy="12"
        r="1.5"
        fill={active ? "hsl(var(--primary-foreground))" : "currentColor"}
      />
    </svg>
  );
}

/** Profile — head and shoulders with a soft clipped shoulder line. */
export function ProfileGlyph({ active, className, size }: GlyphProps) {
  return (
    <svg {...base(className, size)}>
      <circle
        cx="12"
        cy="8.1"
        r="3.9"
        stroke="currentColor"
        strokeWidth="1.75"
        fill={active ? "currentColor" : "none"}
      />
      <path
        d="M4.6 20.2c0-3.7 3.31-6.2 7.4-6.2s7.4 2.5 7.4 6.2"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        fill={active ? "currentColor" : "none"}
      />
    </svg>
  );
}

/* ---------- Platform glyphs ---------- */

export function TikTokGlyph({ className, size = 16 }: { className?: string; size?: number }) {
  return (
    <svg {...base(className, size)} viewBox="0 0 24 24">
      <path
        d="M16.6 2h-3v13.1a2.6 2.6 0 1 1-2.6-2.6c.24 0 .47.03.69.09V9.5a5.7 5.7 0 1 0 4.91 5.64V8.6a6.6 6.6 0 0 0 3.9 1.27V6.8a3.9 3.9 0 0 1-3.9-3.9V2z"
        fill="currentColor"
      />
    </svg>
  );
}

export function InstagramGlyph({ className, size = 16 }: { className?: string; size?: number }) {
  return (
    <svg {...base(className, size)}>
      <rect x="3" y="3" width="18" height="18" rx="5" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="17.2" cy="6.8" r="1.15" fill="currentColor" />
    </svg>
  );
}

export function YouTubeGlyph({ className, size = 16 }: { className?: string; size?: number }) {
  return (
    <svg {...base(className, size)}>
      <rect x="2.2" y="5.4" width="19.6" height="13.2" rx="4" fill="currentColor" />
      <path d="M10.3 9.4l5.1 2.6-5.1 2.6z" fill="hsl(var(--background))" />
    </svg>
  );
}

export function XGlyph({ className, size = 16 }: { className?: string; size?: number }) {
  return (
    <svg {...base(className, size)}>
      <path
        d="M3.2 3h4.4l4.15 5.6L16.6 3h3.3l-6.1 7.35L21 21h-4.4l-4.5-6.05L6.9 21H3.5l6.5-7.8z"
        fill="currentColor"
      />
    </svg>
  );
}

export const PLATFORM_GLYPHS = {
  tiktok: TikTokGlyph,
  instagram: InstagramGlyph,
  youtube: YouTubeGlyph,
  x: XGlyph,
} as const;

export type PlatformKey = keyof typeof PLATFORM_GLYPHS;

export function PlatformRow({
  platforms,
  className,
  size = 15,
}: {
  platforms: unknown;
  className?: string;
  size?: number;
}) {
  const list = (Array.isArray(platforms) ? platforms : [])
    .map((p) => String(p).toLowerCase())
    .filter((p): p is PlatformKey => p in PLATFORM_GLYPHS);

  if (!list.length) return null;

  return (
    <div className={cn("flex items-center gap-1.5 text-muted-foreground", className)}>
      {list.map((p) => {
        const Glyph = PLATFORM_GLYPHS[p];
        return <Glyph key={p} size={size} />;
      })}
    </div>
  );
}
