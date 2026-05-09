import { Check, Edit, Shield, Sparkles, Award, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CreatorProfile } from "@/lib/mockData";

interface ProfileCosmeticsProps {
  profile: CreatorProfile;
  onEdit: () => void;
}

const rarityColors = {
  common: "bg-muted text-muted-foreground",
  rare: "bg-info/10 text-info border-info/20",
  epic: "bg-primary/10 text-primary border-primary/20",
  legendary: "bg-warning/10 text-warning border-warning/20",
};

const typeLabels: Record<string, string> = {
  avatar_frame: "Frame",
  badge: "Badge",
  effect: "Effect",
  title: "Title",
};

export function ProfileCosmetics({ profile, onEdit }: ProfileCosmeticsProps) {
  const groupedCosmetics = profile.cosmetics.reduce((acc, cosmetic) => {
    if (!acc[cosmetic.type]) acc[cosmetic.type] = [];
    acc[cosmetic.type].push(cosmetic);
    return acc;
  }, {} as Record<string, typeof profile.cosmetics>);

  const types = Object.keys(groupedCosmetics) as Array<keyof typeof groupedCosmetics>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-[14px] font-medium text-foreground uppercase tracking-tight">Cosmetics ({profile.cosmetics.length})</h3>
        <Button onClick={onEdit} variant="outline" size="sm" className="h-7 text-[11px] border-border hover:bg-muted">
          <Edit className="h-3 w-3 mr-1.5" />
          Customize
        </Button>
      </div>

      {types.map((type) => (
        <div key={type} className="space-y-2">
          <h4 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest px-1">
            {typeLabels[type]}
          </h4>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {groupedCosmetics[type].map((cosmetic) => (
              <div
                key={cosmetic.id}
                className={`rounded-md p-3 border transition-all ${
                  cosmetic.equipped
                    ? "bg-primary/5 border-primary/40 ring-1 ring-primary/20"
                    : "bg-card border-border hover:bg-muted/30"
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className={`h-8 w-8 flex items-center justify-center rounded bg-muted/50 text-[18px]`}>
                    {cosmetic.icon}
                  </div>
                  {cosmetic.equipped && (
                    <Badge variant="outline" className="h-4 text-[8px] uppercase bg-primary text-primary-foreground border-none px-1">
                      Equipped
                    </Badge>
                  )}
                </div>

                <div className="space-y-1">
                  <h5 className="font-semibold text-[12px] text-foreground truncate">{cosmetic.name}</h5>
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className={`h-3.5 text-[7px] uppercase px-1 border-none ${rarityColors[cosmetic.rarity]}`}>
                      {cosmetic.rarity}
                    </Badge>
                    <span className="text-[9px] text-muted-foreground">{new Date(cosmetic.obtainedAt).toLocaleDateString(undefined, { month: 'short', year: '2-digit' })}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
