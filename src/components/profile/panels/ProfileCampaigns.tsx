import { Calendar, Users, DollarSign } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { CreatorProfile } from "@/lib/mockData";

interface ProfileCampaignsProps {
  profile: CreatorProfile;
}

const statusColors = {
  active: "border-success/40 text-success bg-success/5",
  completed: "border-info/40 text-info bg-info/5",
  ongoing: "border-warning/40 text-warning bg-warning/5",
};

export function ProfileCampaigns({ profile }: ProfileCampaignsProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-[14px] font-medium text-foreground uppercase tracking-tight">Active Campaigns ({profile.campaigns.length})</h3>
      </div>
      <div className="space-y-2">
        {profile.campaigns.length === 0 ? (
          <div className="bg-card border border-dashed border-border rounded-md p-8 text-center">
            <p className="text-[12px] text-muted-foreground">No campaigns joined yet</p>
          </div>
        ) : (
          profile.campaigns.map((campaign) => (
            <div key={campaign.id} className="bg-card border border-border rounded-md p-3 hover:bg-muted/30 transition-colors">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-[13px] font-semibold text-foreground truncate">{campaign.title}</h4>
                    <Badge variant="outline" className={`h-4 text-[9px] uppercase font-bold border px-1 ${statusColors[campaign.status as keyof typeof statusColors]}`}>
                      {campaign.status}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground">{campaign.brand}</p>
                  <div className="flex flex-wrap gap-3 text-[10px] text-muted-foreground pt-1">
                    <div className="flex items-center gap-1"><Calendar className="h-3 w-3" />{campaign.joinedAt?.toLocaleDateString()}</div>
                    <div className="flex items-center gap-1"><Users className="h-3 w-3" />{campaign.participants}</div>
                    <div className="flex items-center gap-1 text-success font-medium"><DollarSign className="h-3 w-3" />${campaign.reward}</div>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Reward</p>
                  <p className="text-[14px] font-bold text-success">${campaign.reward}</p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
