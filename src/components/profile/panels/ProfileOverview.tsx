import { TrendingUp, DollarSign, Target, CheckCircle, Trophy, Flame } from "lucide-react";
import { CreatorProfile } from "@/lib/mockData";

interface ProfileOverviewProps {
  profile: CreatorProfile;
}

export function ProfileOverview({ profile }: ProfileOverviewProps) {
  const overviewStats = [
    { label: "Total Views", value: (profile.statistics.totalViews / 1000000).toFixed(1) + "M", icon: TrendingUp, color: "text-info" },
    { label: "Total Earned", value: "$" + profile.totalEarnings.toLocaleString(), icon: DollarSign, color: "text-success" },
    { label: "Campaigns Joined", value: profile.campaigns.length, icon: Target, color: "text-warning" },
    { label: "Approved", value: profile.statistics.approvedSubmissions, icon: CheckCircle, color: "text-primary" },
    { label: "Best Rank", value: profile.statistics.bestRank, icon: Trophy, color: "text-warning" },
    { label: "Active Streak", value: profile.statistics.activeStreak + "w", icon: Flame, color: "text-destructive" },
  ];

  return (
    <div className="space-y-4">
      {/* Banner Showcase */}
      <div className="relative w-full h-32 rounded-md overflow-hidden border border-border bg-muted/30">
        <img 
          src={profile.banner || "https://images.unsplash.com/photo-1614850523459-c2f4c699c52e?w=800&h=200&fit=crop"} 
          alt="Banner" 
          className="w-full h-full object-cover opacity-60"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
        
        <div className="absolute bottom-3 left-4 flex items-center gap-3">
          <img 
            src={profile.avatar} 
            alt={profile.displayName} 
            className="w-12 h-12 rounded-md border border-border bg-card"
          />
          <div>
            <h2 className="text-[15px] font-bold text-foreground">{profile.displayName}</h2>
            <p className="text-[11px] text-primary font-medium uppercase tracking-wider">Elite Creator</p>
          </div>
        </div>

        <div className="absolute bottom-3 right-4 flex gap-1">
          {profile.badges.slice(0, 3).map((badge) => (
            <div key={badge} className="bg-background/80 border border-border rounded p-1" title={badge}>
              <Trophy className="w-3.5 h-3.5 text-warning" />
            </div>
          ))}
        </div>
      </div>

      {/* Statistics Grid - 1px border gap style */}
      <div className="grid grid-cols-2 md:grid-cols-2 gap-px bg-border border border-border rounded-md overflow-hidden">
        {overviewStats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="bg-background p-4 hover:bg-muted/30 transition-colors group">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-muted/50 rounded group-hover:bg-muted transition-colors">
                  <Icon className={`w-4 h-4 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground uppercase tracking-widest font-medium">{stat.label}</p>
                  <p className="text-xl font-bold text-foreground mt-0.5">{stat.value}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Bio Section */}
      <div className="bg-card border border-border rounded-md p-4">
        <h3 className="text-[12px] font-semibold text-muted-foreground mb-2 uppercase tracking-wider">About Creator</h3>
        <p className="text-[13px] text-foreground leading-relaxed italic">"{profile.bio}"</p>
      </div>
    </div>
  );
}
