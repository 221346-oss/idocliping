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
  { label: "Explore", to: "/discover", match: ["/discover", "/campaigns", "/rewards", "/leaderboard"], Glyph: ExploreGlyph },
  { label: "My Activity", to: "/activity", match: ["/activity", "/submissions"], Glyph: ActivityGlyph },
  { label: "Wallet", to: "/wallet", match: ["/wallet", "/referrals"], Glyph: WalletGlyph },
  { label: "Profile", to: "/profile", match: ["/profile", "/u", "/accounts", "/support", "/settings"], Glyph: ProfileGlyph },
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
      <div className="pointer-events-auto mx-auto flex max-w-md items-center justify-around rounded-full border border-border bg-surface-raised/95 px-4 py-3 shadow-lift backdrop-blur-xl">
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
                "relative flex h-10 w-12 items-center justify-center rounded-full press-scale focus-ring transition-colors duration-200",
                active ? "text-primary" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Glyph active={active} size={29} />
              {badge?.[entry.to] && (
                <span className="absolute right-1.5 top-0.5 h-2 w-2 rounded-full bg-destructive ring-2 ring-surface-raised" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
