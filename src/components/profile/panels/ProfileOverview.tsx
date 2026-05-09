import { TrendingUp, DollarSign, Target, CheckCircle, Trophy, Flame } from "lucide-react";
import type { ProfileViewModel } from "@/hooks/usePublicProfile";
import { EarningsTierBadge } from "@/components/leaderboard/EarningsTierBadge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatViewCount } from "@/lib/format-views";
import { formatCurrencySimple } from "@/lib/format-currency";

interface ProfileOverviewProps {
  profile: ProfileViewModel;
}

export function ProfileOverview({ profile }: ProfileOverviewProps) {
  const initials = profile.displayName
    .split(/\s+/)
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "?";

  const overviewStats = [
    { label: "Total Views", value: formatViewCount(profile.statistics.totalViews), icon: TrendingUp, color: "text-info" },
    { label: "Total Earned", value: formatCurrencySimple(profile.totalEarnings), icon: DollarSign, color: "text-success" },
    { label: "Campaigns", value: String(profile.campaigns.length), icon: Target, color: "text-warning" },
    { label: "Approved", value: String(profile.statistics.approvedSubmissions), icon: CheckCircle, color: "text-primary" },
    { label: "Honor score", value: String(profile.honorScore), icon: Flame, color: "text-destructive" },
    { label: "Submissions", value: String(profile.statistics.totalSubmissions), icon: Trophy, color: "text-warning" },
  ];

  return (
    <div className="space-y-4">
      <div className="relative w-full h-36 rounded-md overflow-hidden border border-border bg-muted/30">
        <img src={profile.bannerUrl} alt="" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />

        <div className="absolute bottom-3 left-4 flex items-end gap-3">
          <Avatar className="w-14 h-14 rounded-md border-2 border-background bg-muted">
            <AvatarImage src={profile.avatarUrl || undefined} alt="" className="object-cover" />
            <AvatarFallback className="rounded-md text-sm">{initials}</AvatarFallback>
          </Avatar>
          <div className="pb-0.5">
            <h2 className="text-[16px] font-bold text-foreground drop-shadow-sm">{profile.displayName}</h2>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <EarningsTierBadge tier={profile.tier} compact />
              <span className="text-[11px] text-muted-foreground">{profile.honorLabelText}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-2 gap-px bg-border border border-border rounded-md overflow-hidden">
        {overviewStats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="bg-background p-4 hover:bg-muted/30 transition-colors group">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-muted/50 rounded group-hover:bg-muted transition-colors">
                  <Icon className={`w-4 h-4 ${stat.color}`} />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] text-muted-foreground uppercase tracking-widest font-medium">{stat.label}</p>
                  <p className="text-xl font-bold text-foreground mt-0.5">{stat.value}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-card border border-border rounded-md p-4">
        <h3 className="text-[12px] font-semibold text-muted-foreground mb-2 uppercase tracking-wider">About</h3>
        {profile.bio?.trim() ? (
          <p className="text-[13px] text-foreground leading-relaxed whitespace-pre-wrap">{profile.bio}</p>
        ) : (
          <p className="text-[13px] text-muted-foreground italic">No bio yet.</p>
        )}
      </div>
    </div>
  );
}
