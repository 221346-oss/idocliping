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

/** Explore — a rounded square with a central dot. Active fills the square. */
export function ExploreGlyph({ active, className, size }: GlyphProps) {
  return (
    <svg {...base(className, size)}>
      <rect
        x="2.75"
        y="2.75"
        width="18.5"
        height="18.5"
        rx="6"
        stroke="currentColor"
        strokeWidth="1.5"
        fill={active ? "currentColor" : "none"}
      />
      <circle
        cx="12"
        cy="12"
        r="2.6"
        fill={active ? "hsl(var(--primary-foreground))" : "currentColor"}
      />
    </svg>
  );
}

/** Activity — a simple flag on a pole. Active fills the flag. */
export function ActivityGlyph({ active, className, size }: GlyphProps) {
  return (
    <svg {...base(className, size)}>
      <path
        d="M6.4 3.4v17.2"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M6.4 4.6h10.2L13.6 9l3 4.4H6.4z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
        fill={active ? "currentColor" : "none"}
      />
    </svg>
  );
}

/** Wallet — a simple card wallet. Active fills the body. */
export function WalletGlyph({ active, className, size }: GlyphProps) {
  return (
    <svg {...base(className, size)}>
      <rect
        x="2.9"
        y="6.4"
        width="18.2"
        height="11.2"
        rx="3.2"
        stroke="currentColor"
        strokeWidth="1.5"
        fill={active ? "currentColor" : "none"}
      />
      <path
        d="M3.3 10.2h17.4"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <circle
        cx="16.5"
        cy="12"
        r="1.4"
        fill={active ? "hsl(var(--primary-foreground))" : "currentColor"}
      />
    </svg>
  );
}

/** Profile — a simple head-and-shoulders silhouette. Active fills the shape. */
export function ProfileGlyph({ active, className, size }: GlyphProps) {
  return (
    <svg {...base(className, size)}>
      <path
        d="M12 11.2a3.6 3.6 0 1 0 0-7.2 3.6 3.6 0 0 0 0 7.2z"
        stroke="currentColor"
        strokeWidth="1.5"
        fill={active ? "currentColor" : "none"}
      />
      <path
        d="M4.4 19.8c0-3.6 3.4-5.8 7.6-5.8s7.6 2.2 7.6 5.8"
        stroke="currentColor"
        strokeWidth="1.5"
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
