import { Bookmark, Calendar, Users, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CreatorProfile } from "@/lib/mockData";

interface ProfileSavedCampaignsProps {
  profile: CreatorProfile;
}

const statusColors = {
  active: "bg-green-500/20 text-green-400 border-green-500/40",
  completed: "bg-blue-500/20 text-blue-400 border-blue-500/40",
  ongoing: "bg-yellow-500/20 text-yellow-400 border-yellow-500/40",
};

export function ProfileSavedCampaigns({ profile }: ProfileSavedCampaignsProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Bookmark className="w-5 h-5 text-yellow-400" />
        <h3 className="text-lg font-semibold text-white">
          Saved Campaigns ({profile.savedCampaigns.length})
        </h3>
      </div>

      {profile.savedCampaigns.length === 0 ? (
        <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-12 text-center">
          <Bookmark className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400 mb-3">No saved campaigns yet</p>
          <p className="text-xs text-slate-500">
            Bookmark campaigns to review them later
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {profile.savedCampaigns.map((campaign) => (
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
                  <p className="text-xs text-slate-500">{campaign.category}</p>

                  <div className="flex flex-wrap gap-3 text-xs text-slate-400 mt-3">
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

                <div className="flex flex-col gap-2">
                  <Button
                    size="sm"
                    className="bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 border border-yellow-500/40"
                  >
                    View Details
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-slate-700 text-slate-400 hover:text-white"
                  >
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
