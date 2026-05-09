import { Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import type { ProfileViewModel } from "@/hooks/usePublicProfile";

interface ProfileCosmeticsProps {
  profile: ProfileViewModel;
}

export function ProfileCosmetics({ profile }: ProfileCosmeticsProps) {
  const items = profile.cosmeticsUnlocked;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-[14px] font-medium text-foreground uppercase tracking-tight">Unlocked cosmetics ({items.length})</h3>
        <Button asChild variant="outline" size="sm" className="h-7 text-[11px]">
          <Link to="/settings?tab=appearance">
            <Palette className="h-3 w-3 mr-1.5" />
            Manage in Settings
          </Link>
        </Button>
      </div>

      {items.length === 0 ? (
        <p className="text-[12px] text-muted-foreground border border-dashed border-border rounded-md p-8 text-center">
          Complete campaigns and rank on leaderboards to unlock avatars and banners.
        </p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {items.map((c) => (
            <div key={c.id} className="rounded-md border border-border p-2 bg-card">
              <div className={c.type === "banner" ? "h-10 w-full rounded overflow-hidden" : "h-14 w-14 mx-auto rounded-full overflow-hidden"}>
                <img src={c.image_url} alt="" className="h-full w-full object-cover" />
              </div>
              <p className="text-[10px] text-center mt-1 truncate text-muted-foreground">{c.name}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
