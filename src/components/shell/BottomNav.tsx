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
  { label: "Explore", to: "/creator/campaigns", match: ["/creator", "/creator/campaigns"], Glyph: ExploreGlyph },
  { label: "My Activity", to: "/creator/submissions", match: ["/creator/submissions"], Glyph: ActivityGlyph },
  { label: "Wallet", to: "/creator/wallet", match: ["/creator/wallet", "/creator/referrals"], Glyph: WalletGlyph },
  { label: "Profile", to: "/profile/me", match: ["/profile", "/creator/profile", "/settings"], Glyph: ProfileGlyph },
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
      <div className="pointer-events-auto mx-auto flex max-w-md items-center justify-around rounded-[26px] border border-border/70 bg-surface-raised/95 px-2 py-2 shadow-lift backdrop-blur-xl">
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
                "relative flex h-11 w-11 items-center justify-center rounded-2xl press-scale focus-ring transition-colors duration-200",
                active ? "text-primary" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Glyph active={active} size={24} />
              {badge?.[entry.to] && (
                <span className="absolute right-2 top-1.5 h-2 w-2 rounded-full bg-destructive ring-2 ring-surface-raised" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
