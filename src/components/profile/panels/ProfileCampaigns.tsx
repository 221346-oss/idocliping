import { Calendar, Users, DollarSign } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { CreatorProfile } from "@/lib/mockData";

interface ProfileCampaignsProps {
  profile: CreatorProfile;
}

const statusColors = {
  active: "bg-green-500/20 text-green-400 border-green-500/40",
  completed: "bg-blue-500/20 text-blue-400 border-blue-500/40",
  ongoing: "bg-yellow-500/20 text-yellow-400 border-yellow-500/40",
};

export function ProfileCampaigns({ profile }: ProfileCampaignsProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Active Campaigns ({profile.campaigns.length})</h3>
      </div>

      <div className="space-y-3">
        {profile.campaigns.length === 0 ? (
          <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-8 text-center">
            <p className="text-slate-400">No campaigns joined yet</p>
          </div>
        ) : (
          profile.campaigns.map((campaign) => (
            <div
              key={campaign.id}
              className="bg-slate-900/50 border border-slate-800 rounded-lg p-4 hover:border-slate-700 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold text-white">{campaign.title}</h4>
                    <Badge
                      variant="outline"
                      className={`capitalize border ${statusColors[campaign.status as keyof typeof statusColors]}`}
                    >
                      {campaign.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-slate-400">{campaign.brand}</p>
                  <div className="flex flex-wrap gap-3 text-xs text-slate-400 mt-2">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {campaign.joinedAt?.toLocaleDateString()}
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      {campaign.participants} participants
                    </div>
                    <div className="flex items-center gap-1 text-yellow-400">
                      <DollarSign className="w-4 h-4" />
                      ${campaign.reward}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-xs text-slate-400 mb-1">Max Reward</p>
                  <p className="text-lg font-bold text-yellow-400">${campaign.reward}</p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
