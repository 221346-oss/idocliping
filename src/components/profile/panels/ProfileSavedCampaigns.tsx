import { Bookmark, Users, DollarSign, ExternalLink, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CreatorProfile } from "@/lib/mockData";

interface ProfileSavedCampaignsProps {
  profile: CreatorProfile;
}

const statusColors = {
  active: "border-success/40 text-success bg-success/5",
  completed: "border-info/40 text-info bg-info/5",
  ongoing: "border-warning/40 text-warning bg-warning/5",
};

export function ProfileSavedCampaigns({ profile }: ProfileSavedCampaignsProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-2">
        <h3 className="text-[14px] font-medium text-foreground uppercase tracking-tight">Saved Campaigns ({profile.savedCampaigns.length})</h3>
      </div>

      {profile.savedCampaigns.length === 0 ? (
        <div className="bg-card border border-dashed border-border rounded-md p-12 text-center">
          <Bookmark className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-[12px] text-muted-foreground">Your bookmarks are empty</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-2">
          {profile.savedCampaigns.map((campaign) => (
            <div key={campaign.id} className="bg-card border border-border rounded-md p-3 hover:bg-muted/30 transition-colors">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-[13px] font-semibold text-foreground truncate">{campaign.title}</h4>
                    <Badge variant="outline" className={`h-4 text-[9px] uppercase font-bold border px-1 ${statusColors[campaign.status as keyof typeof statusColors]}`}>
                      {campaign.status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="text-[11px] text-muted-foreground">{campaign.brand}</p>
                    <span className="text-muted-foreground/30 text-[10px]">•</span>
                    <p className="text-[10px] text-muted-foreground uppercase">{campaign.category}</p>
                  </div>

                  <div className="flex flex-wrap gap-4 text-[10px] text-muted-foreground pt-2">
                    <div className="flex items-center gap-1"><Users className="h-3 w-3" />{campaign.participants}</div>
                    <div className="flex items-center gap-1 text-success font-medium"><DollarSign className="h-3 w-3" />${campaign.reward}</div>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5 shrink-0">
                  <Button size="sm" className="h-7 px-2.5 text-[11px]">
                    View
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 px-2.5 text-[11px] text-destructive hover:text-destructive hover:bg-destructive/5">
                    Remove
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
