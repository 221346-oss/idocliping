import { Check, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CreatorProfile } from "@/lib/mockData";

interface ProfileCosmeticsProps {
  profile: CreatorProfile;
  onEdit: () => void;
}

const rarityColors = {
  common: "bg-slate-600",
  rare: "bg-blue-600",
  epic: "bg-purple-600",
  legendary: "bg-yellow-600",
};

const typeLabels: Record<string, string> = {
  avatar_frame: "Avatar Frame",
  badge: "Badge",
  effect: "Effect",
  title: "Title",
};

export function ProfileCosmetics({ profile, onEdit }: ProfileCosmeticsProps) {
  const groupedCosmetics = profile.cosmetics.reduce((acc, cosmetic) => {
    if (!acc[cosmetic.type]) {
      acc[cosmetic.type] = [];
    }
    acc[cosmetic.type].push(cosmetic);
    return acc;
  }, {} as Record<string, typeof profile.cosmetics>);

  const types = Object.keys(groupedCosmetics) as Array<keyof typeof groupedCosmetics>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">
          Cosmetics ({profile.cosmetics.length})
        </h3>
        <Button
          onClick={onEdit}
          variant="outline"
          size="sm"
          className="border-yellow-500/40 text-yellow-400 hover:bg-yellow-500/10"
        >
          <Edit className="w-4 h-4 mr-2" />
          Edit
        </Button>
      </div>

      {types.map((type) => (
        <div key={type}>
          <h4 className="text-sm font-semibold text-slate-300 mb-3 uppercase tracking-wide">
            {typeLabels[type]}
          </h4>

          <div className="grid grid-cols-2 gap-3">
            {groupedCosmetics[type].map((cosmetic) => (
              <div
                key={cosmetic.id}
                className={`rounded-lg p-4 border transition-colors ${
                  cosmetic.equipped
                    ? "bg-gradient-to-br from-yellow-500/20 to-orange-500/10 border-yellow-500/40"
                    : "bg-slate-900/50 border-slate-800 hover:border-slate-700"
                }`}
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className={`text-4xl w-12 h-12 flex items-center justify-center rounded-lg ${rarityColors[cosmetic.rarity]} flex-shrink-0`}>
                    {cosmetic.icon}
                  </div>
                  {cosmetic.equipped && (
                    <div className="bg-yellow-500/20 border border-yellow-500/40 rounded px-2 py-1 flex items-center gap-1">
                      <Check className="w-3 h-3 text-yellow-400" />
                      <span className="text-xs text-yellow-400 font-medium">Equipped</span>
                    </div>
                  )}
                </div>

                <div>
                  <h5 className="font-semibold text-white text-sm">{cosmetic.name}</h5>
                  <div className="flex items-center justify-between mt-2">
                    <Badge
                      variant="outline"
                      className={`capitalize text-xs border-0 ${rarityColors[cosmetic.rarity]} text-white`}
                    >
                      {cosmetic.rarity}
                    </Badge>
                    <span className="text-xs text-slate-400">
                      {cosmetic.obtainedAt.toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Available to Unlock */}
      <div>
        <h4 className="text-sm font-semibold text-slate-400 mb-3 uppercase tracking-wide">Available to Unlock</h4>
        <div className="grid grid-cols-2 gap-3">
          {[
            { name: "Dragon Frame", icon: "🐉", rarity: "legendary", type: "avatar_frame" },
            { name: "Thunder Effect", icon: "⚡", rarity: "epic", type: "effect" },
          ].map((cosmetic, index) => (
            <div key={index} className="bg-slate-900/30 border border-slate-800 rounded-lg p-4 opacity-50">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className={`text-4xl w-12 h-12 flex items-center justify-center rounded-lg ${rarityColors[cosmetic.rarity as keyof typeof rarityColors]} flex-shrink-0`}>
                  {cosmetic.icon}
                </div>
              </div>
              <div>
                <h5 className="font-semibold text-slate-500 text-sm">{cosmetic.name}</h5>
                <div className="flex items-center justify-between mt-2">
                  <Badge
                    variant="outline"
                    className={`capitalize text-xs border-slate-700 text-slate-600`}
                  >
                    {cosmetic.rarity}
                  </Badge>
                  <span className="text-xs text-slate-600">Locked</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
