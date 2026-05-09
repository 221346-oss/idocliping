import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CreatorProfile } from "@/lib/mockData";
import { cn } from "@/lib/utils";

interface ProfileRightCardProps {
  profile: CreatorProfile;
  isOwnProfile: boolean;
  onEditClick: () => void;
}

const rankColors: Record<string, string> = {
  rookie: "bg-muted text-muted-foreground",
  challenger: "bg-info/20 text-info border-info/40",
  pro: "bg-secondary/20 text-secondary border-secondary/40",
  elite: "bg-warning/20 text-warning border-warning/40",
  legend: "bg-destructive/20 text-destructive border-destructive/40",
};

export function ProfileRightCard({ profile, isOwnProfile, onEditClick }: ProfileRightCardProps) {
  const [copiedId, setCopiedId] = useState(false);

  const handleCopyId = () => {
    navigator.clipboard.writeText(profile.id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const platformCounts = Object.entries(profile.followers)
    .filter(([, count]) => count > 0)
    .sort(([, a], [, b]) => b - a);

  return (
    <div className="space-y-4">
      {/* Profile Card */}
      <div className="bg-card rounded-md border border-border p-4 space-y-4">
        <div className="flex flex-col items-center space-y-3">
          <div className="relative group">
            <img
              src={profile.avatar}
              alt={profile.displayName}
              className="w-20 h-20 rounded-md border border-border bg-muted/30"
            />
            <div className={cn("absolute -bottom-1 -right-1 px-1.5 py-0.5 rounded text-[10px] font-bold border border-background shadow-sm", rankColors[profile.rank])}>
              {profile.rank.toUpperCase()}
            </div>
          </div>

          <div className="text-center">
            <h2 className="text-[14px] font-bold text-foreground leading-tight">{profile.displayName}</h2>
            <p className="text-[11px] text-muted-foreground">@{profile.username}</p>
          </div>

          <div className="flex gap-1.5">
            <Badge variant="outline" className="h-5 px-1.5 text-[10px] bg-primary/5 text-primary border-primary/20">
              Lv. {profile.level}
            </Badge>
          </div>
        </div>

        {/* UID Section */}
        <div className="bg-muted/30 rounded border border-border p-2 flex items-center gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">UID</p>
            <p className="text-[11px] font-mono text-foreground truncate">{profile.id}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleCopyId}
            className="h-6 w-6 text-muted-foreground hover:text-primary transition-colors"
          >
            {copiedId ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
          </Button>
        </div>

        {/* Mini Stats Grid */}
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: "Honor", value: profile.honorScore, color: "text-primary" },
            { label: "Level", value: profile.level },
            { label: "Joined", value: profile.joinedDate.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }) },
            { label: "Earnings", value: `$${profile.totalEarnings}`, color: "text-success" },
          ].map((stat) => (
            <div key={stat.label} className="bg-muted/30 rounded p-2 border border-border/50">
              <p className="text-[10px] text-muted-foreground uppercase">{stat.label}</p>
              <p className={cn("text-[13px] font-bold mt-0.5 truncate", stat.color || "text-foreground")}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Platforms */}
        <div className="space-y-1.5">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-1">Platforms</p>
          <div className="space-y-px bg-border rounded-sm overflow-hidden border border-border">
            {platformCounts.map(([platform, count]) => (
              <div key={platform} className="flex items-center justify-between bg-background px-2 py-1.5">
                <span className="text-[11px] text-muted-foreground capitalize">{platform}</span>
                <span className="text-[11px] font-medium text-foreground">{(count / 1000).toFixed(1)}k</span>
              </div>
            ))}
          </div>
        </div>

        {/* Edit Button */}
        {isOwnProfile && (
          <Button
            onClick={onEditClick}
            variant="outline"
            className="w-full h-8 text-[12px] border-primary/30 text-primary hover:bg-primary/5 hover:border-primary/50"
          >
            Edit Profile
          </Button>
        )}
      </div>
    </div>
  );
}
