import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Link } from "react-router-dom";
import type { ProfileViewModel } from "@/hooks/usePublicProfile";
import { cn } from "@/lib/utils";
import { EarningsTierBadge } from "@/components/leaderboard/EarningsTierBadge";
import { tierRingClass } from "@/components/leaderboard/tierStyles";
import { formatCurrencySimple } from "@/lib/format-currency";
import { formatViewCount } from "@/lib/format-views";

interface ProfileRightCardProps {
  profile: ProfileViewModel;
  isOwnProfile: boolean;
}

export function ProfileRightCard({ profile, isOwnProfile }: ProfileRightCardProps) {
  const [copiedId, setCopiedId] = useState(false);

  const handleCopyId = () => {
    void navigator.clipboard.writeText(profile.userId);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const initials = (profile.displayName || profile.usernameLabel || "U")
    .split(/\s+/)
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const platformRows = Object.entries(profile.platformViewTotals)
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1]);

  return (
    <div className="space-y-4">
      <div className="bg-card rounded-md border border-border p-4 space-y-4">
        <div className="flex flex-col items-center space-y-3">
          <div className="relative group">
            <Avatar className={cn("w-20 h-20 rounded-md border border-border bg-muted/30 object-cover", tierRingClass(profile.tier))}>
              <AvatarImage src={profile.avatarUrl || undefined} alt="" className="object-cover" />
              <AvatarFallback className="rounded-md text-[13px]">{initials}</AvatarFallback>
            </Avatar>
          </div>

          <div className="text-center">
            <h2 className="text-[14px] font-bold text-foreground leading-tight">{profile.displayName}</h2>
            <p className="text-[11px] text-muted-foreground">{profile.usernameLabel}</p>
          </div>

          <EarningsTierBadge tier={profile.tier} compact />
        </div>

        <div className="bg-muted/30 rounded border border-border p-2 flex items-center gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">UID</p>
            <p className="text-[11px] font-mono text-foreground truncate">{profile.userId}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={handleCopyId} className="h-6 w-6 text-muted-foreground hover:text-primary transition-colors shrink-0">
            {copiedId ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="bg-muted/30 rounded p-2 border border-border/50">
            <p className="text-[10px] text-muted-foreground uppercase">Honor</p>
            <p className="text-[13px] font-bold tabular-nums text-primary">{profile.honorScore}</p>
          </div>
          <div className="bg-muted/30 rounded p-2 border border-border/50">
            <p className="text-[10px] text-muted-foreground uppercase">Trust</p>
            <p className="text-[13px] font-bold tabular-nums">{profile.level}</p>
          </div>
          <div className="bg-muted/30 rounded p-2 border border-border/50">
            <p className="text-[10px] text-muted-foreground uppercase">Joined</p>
            <p className="text-[13px] font-bold">{profile.joinedDate.toLocaleDateString(undefined, { month: "short", year: "2-digit" })}</p>
          </div>
          <div className="bg-muted/30 rounded p-2 border border-border/50">
            <p className="text-[10px] text-muted-foreground uppercase">Earned</p>
            <p className="text-[13px] font-bold text-success truncate">{formatCurrencySimple(profile.totalEarnings)}</p>
          </div>
        </div>

        <div className="space-y-1.5">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-1">Platforms (views)</p>
          <div className="space-y-px bg-border rounded-sm overflow-hidden border border-border">
            {platformRows.length === 0 ? (
              <div className="bg-background px-2 py-2 text-[11px] text-muted-foreground">No approved views yet</div>
            ) : (
              platformRows.map(([platform, count]) => (
                <div key={platform} className="flex items-center justify-between bg-background px-2 py-1.5">
                  <span className="text-[11px] text-muted-foreground capitalize">{platform}</span>
                  <span className="text-[11px] font-medium text-foreground tabular-nums">{formatViewCount(count)}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {isOwnProfile ? (
          <Button asChild variant="outline" className="w-full h-8 text-[12px] border-primary/30 text-primary hover:bg-primary/5 hover:border-primary/50">
            <Link to="/creator/profile/edit">Edit profile</Link>
          </Button>
        ) : null}
      </div>
    </div>
  );
}
