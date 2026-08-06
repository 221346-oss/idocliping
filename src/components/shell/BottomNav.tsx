import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  ExploreGlyph,
  ActivityGlyph,
  WalletGlyph,
  ProfileGlyph,
} from "@/components/brand/icons/NavGlyphs";

export type NavEntry = {
  label: string;
  to: string;
  match: string[];
  Glyph: (props: { active?: boolean; className?: string; size?: number }) => JSX.Element;
};

export const CREATOR_NAV: NavEntry[] = [
  { label: "Explore", to: "/discover", match: ["/discover", "/discover"], Glyph: ExploreGlyph },
  { label: "My Activity", to: "/activity", match: ["/activity"], Glyph: ActivityGlyph },
  { label: "Wallet", to: "/wallet", match: ["/wallet", "/referrals"], Glyph: WalletGlyph },
  { label: "Profile", to: "/profile", match: ["/profile", "/creator/profile", "/settings"], Glyph: ProfileGlyph },
];

export function isNavActive(entry: NavEntry, pathname: string) {
  return entry.match.some((m) => pathname === m || pathname.startsWith(m + "/"));
}

export function BottomNav({ badge }: { badge?: Record<string, boolean> }) {
  const { pathname } = useLocation();

  return (
    <nav
      className="md:hidden fixed inset-x-0 bottom-0 z-50 px-3 pb-[max(0.6rem,env(safe-area-inset-bottom))] pt-1 pointer-events-none"
      aria-label="Primary"
    >
      <div className="pointer-events-auto mx-auto flex max-w-md items-center justify-around rounded-[28px] border border-border bg-surface-raised/95 px-2.5 py-2.5 shadow-lift backdrop-blur-xl">
        {CREATOR_NAV.map((entry) => {
          const active = isNavActive(entry, pathname);
          const { Glyph } = entry;
          return (
            <Link
              key={entry.to}
              to={entry.to}
              aria-label={entry.label}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex h-12 w-14 flex-col items-center justify-center gap-1 rounded-2xl press-scale focus-ring transition-all duration-200",
                active
                  ? "bg-primary/[0.14] text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground",
              )}
            >
              <Glyph active={active} size={26} />
              <span
                className={cn(
                  "h-1 w-1 rounded-full transition-opacity duration-200",
                  active ? "bg-primary opacity-100" : "opacity-0",
                )}
              />
              {badge?.[entry.to] && (
                <span className="absolute right-2.5 top-1.5 h-2 w-2 rounded-full bg-destructive ring-2 ring-surface-raised" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

