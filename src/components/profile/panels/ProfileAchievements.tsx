import { Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { CreatorProfile } from "@/lib/mockData";

interface ProfileAchievementsProps {
  profile: CreatorProfile;
}

const rarityColors = {
  common: "bg-slate-600",
  rare: "bg-blue-600",
  epic: "bg-purple-600",
  legendary: "bg-yellow-600",
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
    if (!acc[achievement.category]) {
      acc[achievement.category] = [];
    }
    acc[achievement.category].push(achievement);
    return acc;
  }, {} as Record<string, typeof profile.achievements>);

  const categories = Object.keys(groupedAchievements) as Array<keyof typeof groupedAchievements>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">
          Achievements ({profile.achievements.length})
        </h3>
      </div>

      {categories.map((category) => (
        <div key={category}>
          <h4 className="text-sm font-semibold text-slate-300 mb-3 uppercase tracking-wide">
            {categoryLabels[category]}
          </h4>

          <div className="grid grid-cols-2 gap-3">
            {groupedAchievements[category].map((achievement) => (
              <div
                key={achievement.id}
                className="bg-slate-900/50 border border-slate-800 rounded-lg p-4 hover:border-slate-700 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`text-3xl w-12 h-12 flex items-center justify-center rounded-lg ${
                      rarityColors[achievement.rarity]
                    } flex-shrink-0`}
                  >
                    {achievement.icon}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h5 className="font-semibold text-white text-sm">{achievement.name}</h5>
                        <p className="text-xs text-slate-400 mt-1">{achievement.description}</p>
                      </div>
                      <Badge
                        variant="outline"
                        className={`capitalize text-xs border-0 ${rarityColors[achievement.rarity]} text-white flex-shrink-0`}
                      >
                        {achievement.rarity}
                      </Badge>
                    </div>

                    <p className="text-xs text-slate-500 mt-2">
                      Unlocked {achievement.unlockedAt.toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Placeholder for locked achievements */}
      <div>
        <h4 className="text-sm font-semibold text-slate-400 mb-3 uppercase tracking-wide">Locked</h4>
        <div className="grid grid-cols-2 gap-3">
          {[
            {
              id: "locked-1",
              name: "Superstar",
              description: "Reach 1M total views",
              rarity: "legendary",
            },
            {
              id: "locked-2",
              name: "Influencer",
              description: "1M followers across platforms",
              rarity: "epic",
            },
          ].map((achievement) => (
            <div
              key={achievement.id}
              className="bg-slate-900/30 border border-slate-800 rounded-lg p-4 opacity-50"
            >
              <div className="flex items-start gap-3">
                <div
                  className={`text-2xl w-12 h-12 flex items-center justify-center rounded-lg ${
                    rarityColors[achievement.rarity]
                  } flex-shrink-0`}
                >
                  <Lock className="w-6 h-6 text-slate-700" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h5 className="font-semibold text-slate-500 text-sm">{achievement.name}</h5>
                      <p className="text-xs text-slate-600 mt-1">{achievement.description}</p>
                    </div>
                    <Badge
                      variant="outline"
                      className={`capitalize text-xs border-slate-700 text-slate-600 flex-shrink-0`}
                    >
                      {achievement.rarity}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
