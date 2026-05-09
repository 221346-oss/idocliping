import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import type { ProfileViewModel } from "@/hooks/usePublicProfile";

interface ProfileCampaignsProps {
  profile: ProfileViewModel;
}

const statusColors: Record<string, string> = {
  ongoing: "border-warning/40 text-warning bg-warning/5",
  active: "border-success/40 text-success bg-success/5",
  completed: "border-info/40 text-info bg-info/5",
};

export function ProfileCampaigns({ profile }: ProfileCampaignsProps) {
  return (
    <div className="space-y-3">
      <h3 className="text-[14px] font-medium text-foreground uppercase tracking-tight">Campaigns ({profile.campaigns.length})</h3>
      <div className="space-y-2">
        {profile.campaigns.length === 0 ? (
          <div className="bg-card border border-dashed border-border rounded-md p-8 text-center">
            <p className="text-[12px] text-muted-foreground">No campaigns yet</p>
          </div>
        ) : (
          profile.campaigns.map((campaign) => (
            <div key={campaign.id} className="bg-card border border-border rounded-md p-3 hover:bg-muted/30 transition-colors">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-[13px] font-semibold text-foreground truncate">{campaign.title}</h4>
                    <Badge
                      variant="outline"
                      className={`h-4 text-[9px] uppercase font-bold border px-1 ${statusColors[campaign.status] ?? statusColors.ongoing}`}
                    >
                      {campaign.status}
                    </Badge>
                  </div>
                  <Link to={`/creator/campaigns/${campaign.id}`} className="text-[11px] text-primary hover:underline mt-1 inline-block">
                    View campaign
                  </Link>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
