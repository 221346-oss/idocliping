import { Link, useLocation, useNavigate } from "react-router-dom";
import { Bell, HelpCircle, LogOut, Settings as SettingsIcon, UserPlus, User as UserIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useCreatorBalance } from "@/hooks/useCreatorBalance";
import { ClipperWordmark } from "@/components/brand/ClipperWordmark";
import { WalletGlyph } from "@/components/brand/icons/NavGlyphs";
import { CREATOR_NAV, isNavActive } from "./BottomNav";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function TopNav() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { profile, user, signOut } = useAuth();
  const { available } = useCreatorBalance();

  const initials = (profile?.full_name || user?.email || "U")
    .split(/[\s@.]+/)
    .filter(Boolean)
    .map((p) => p[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const primary = CREATOR_NAV.slice(0, 2);

  return (
    <header className="hidden md:block sticky top-0 z-50 border-b border-border/60 bg-background/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-[1400px] items-center gap-2 px-6">
        <Link to="/discover" className="mr-4 focus-ring rounded-xl press-scale">
          <ClipperWordmark size={22} />
        </Link>

        <nav className="flex items-center gap-1" aria-label="Primary">
          {primary.map((entry) => {
            const active = isNavActive(entry, pathname);
            const { Glyph } = entry;
            return (
              <Link
                key={entry.to}
                to={entry.to}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex items-center gap-2 rounded-full px-4 py-2 text-[14px] font-medium transition-all duration-200 press-scale focus-ring",
                  active
                    ? "bg-primary/15 text-foreground shadow-[0_0_28px_-10px_hsl(var(--primary)/0.75)]"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
              >
                <Glyph active={active} size={19} className={active ? "text-primary" : undefined} />
                {entry.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-1.5">
          <Link
            to="/wallet"
            className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3.5 py-2 text-[14px] font-semibold text-foreground transition-colors hover:bg-primary/20 press-scale focus-ring"
          >
            <WalletGlyph size={18} className="text-primary" />
            <span className="tabular-nums">${available.toFixed(2)}</span>
          </Link>

          <Link
            to="/referrals"
            className="inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-[14px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground press-scale focus-ring"
          >
            <UserPlus className="h-[18px] w-[18px]" />
            Invite &amp; Earn
          </Link>

          <Link
            to="/support"
            aria-label="Notifications"
            className="icon-pill h-10 w-10"
          >
            <Bell className="h-[18px] w-[18px]" />
          </Link>

          <DropdownMenu>
            <DropdownMenuTrigger className="focus-ring rounded-full press-scale">
              <Avatar className="h-9 w-9">
                <AvatarImage src={(profile as any)?.avatar_url ?? undefined} alt="" />
                <AvatarFallback className="bg-primary/20 text-[12px] font-semibold text-foreground">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60 rounded-2xl p-1.5">
              <DropdownMenuLabel className="px-3 py-2">
                <div className="text-[14px] font-semibold">{profile?.full_name || "Creator"}</div>
                <div className="truncate text-[12px] font-normal text-muted-foreground">{user?.email}</div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="gap-2.5 rounded-xl px-3 py-2.5 text-[14px]" onClick={() => navigate("/profile")}>
                <UserIcon className="h-4 w-4" /> Profile
              </DropdownMenuItem>
              <DropdownMenuItem className="gap-2.5 rounded-xl px-3 py-2.5 text-[14px]" onClick={() => navigate("/settings")}>
                <SettingsIcon className="h-4 w-4" /> Settings
              </DropdownMenuItem>
              <DropdownMenuItem className="gap-2.5 rounded-xl px-3 py-2.5 text-[14px]" onClick={() => navigate("/support")}>
                <HelpCircle className="h-4 w-4" /> Help
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="gap-2.5 rounded-xl px-3 py-2.5 text-[14px]" onClick={() => void signOut()}>
                <LogOut className="h-4 w-4" /> Log Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
