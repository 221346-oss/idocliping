import { Lock, Trophy, Medal, Star, Flame, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { CreatorProfile } from "@/lib/mockData";

interface ProfileAchievementsProps {
  profile: CreatorProfile;
}

const rarityColors = {
  common: "bg-muted text-muted-foreground",
  rare: "bg-info/10 text-info border-info/20",
  epic: "bg-primary/10 text-primary border-primary/20",
  legendary: "bg-warning/10 text-warning border-warning/20",
};

const categoryLabels: Record<string, string> = {
  platform: "Platform",
  engagement: "Engagement",
  creator: "Creator",
  community: "Community",
  seasonal: "Seasonal",
};

export function ProfileAchievements({ profile }: ProfileAchievementsProps) {
  const groupedAchievements = profile.achievements.reduce((acc, achievement) => {
    if (!acc[achievement.category]) acc[achievement.category] = [];
    acc[achievement.category].push(achievement);
    return acc;
  }, {} as Record<string, typeof profile.achievements>);

  const categories = Object.keys(groupedAchievements);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-[14px] font-medium text-foreground uppercase tracking-tight">Achievements ({profile.achievements.length})</h3>
      </div>

      {categories.map((category) => (
        <div key={category} className="space-y-2">
          <h4 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest px-1">
            {categoryLabels[category]}
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {groupedAchievements[category].map((achievement) => (
              <div key={achievement.id} className="bg-card border border-border rounded-md p-3 hover:bg-muted/30 transition-colors flex items-start gap-3">
                <div className="h-9 w-9 flex items-center justify-center rounded bg-muted/50 shrink-0">
                   <Trophy className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h5 className="font-semibold text-[13px] text-foreground truncate">{achievement.name}</h5>
                    <Badge variant="outline" className={`h-4 text-[8px] uppercase px-1 border-none ${rarityColors[achievement.rarity]}`}>
                      {achievement.rarity}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground line-clamp-1">{achievement.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Locked achievements */}
      <div className="space-y-2 pt-4">
        <h4 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest px-1 opacity-60">Locked</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 opacity-60">
          {[
            { id: "locked-1", name: "Superstar", description: "Reach 1M total views", rarity: "legendary" as const },
            { id: "locked-2", name: "Influencer", description: "1M followers across platforms", rarity: "epic" as const },
          ].map((achievement) => (
            <div key={achievement.id} className="bg-muted/10 border border-border rounded-md p-3 flex items-start gap-3 grayscale">
              <div className="h-9 w-9 flex items-center justify-center rounded bg-muted/50 shrink-0">
                <Lock className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h5 className="font-semibold text-[13px] text-muted-foreground truncate">{achievement.name}</h5>
                  <Badge variant="outline" className="h-4 text-[8px] uppercase px-1 border-none bg-muted text-muted-foreground">
                    {achievement.rarity}
                  </Badge>
                </div>
                <p className="text-[11px] text-muted-foreground line-clamp-1">{achievement.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
