import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { ProfileLeftNav } from "@/components/profile/ProfileLeftNav";
import { ProfileRightCard } from "@/components/profile/ProfileRightCard";
import { ProfileOverview } from "@/components/profile/panels/ProfileOverview";
import { ProfileStats } from "@/components/profile/panels/ProfileStats";
import { ProfileCampaigns } from "@/components/profile/panels/ProfileCampaigns";
import { ProfileSubmissions } from "@/components/profile/panels/ProfileSubmissions";
import { ProfileAchievements } from "@/components/profile/panels/ProfileAchievements";
import { ProfileCosmetics } from "@/components/profile/panels/ProfileCosmetics";
import { ProfileHonorScore } from "@/components/profile/panels/ProfileHonorScore";
import { ProfileSavedCampaigns } from "@/components/profile/panels/ProfileSavedCampaigns";
import { usePublicProfile } from "@/hooks/usePublicProfile";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

type PanelType = "overview" | "stats" | "campaigns" | "submissions" | "achievements" | "cosmetics" | "honor" | "saved";

export default function CreatorProfile() {
  const { username } = useParams<{ username: string }>();
  const [activePanel, setActivePanel] = useState<PanelType>("overview");

  const { profile, loading, error, isOwnProfile } = usePublicProfile(username);

  const renderPanel = () => {
    if (!profile) return null;
    switch (activePanel) {
      case "overview":
        return <ProfileOverview profile={profile} />;
      case "stats":
        return <ProfileStats profile={profile} />;
      case "campaigns":
        return <ProfileCampaigns profile={profile} />;
      case "submissions":
        return <ProfileSubmissions profile={profile} />;
      case "achievements":
        return <ProfileAchievements />;
      case "cosmetics":
        return isOwnProfile ? <ProfileCosmetics profile={profile} /> : null;
      case "honor":
        return <ProfileHonorScore profile={profile} />;
      case "saved":
        return isOwnProfile ? <ProfileSavedCampaigns /> : null;
      default:
        return <ProfileOverview profile={profile} />;
    }
  };

  return (
    <AppLayout>
      <div className="flex flex-col h-full bg-background overflow-hidden">
        <div className="px-4 md:px-6 h-11 border-b border-border flex items-center shrink-0 justify-between gap-2">
          <h1 className="text-[13px] font-medium uppercase tracking-tight">Creator Profile</h1>
          {isOwnProfile ? (
            <Button asChild size="sm" variant="outline" className="h-7 text-[11px]">
              <Link to="/creator/profile/edit">Edit profile</Link>
            </Button>
          ) : null}
        </div>

        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : error === "hidden" ? (
            <div className="p-8 text-center text-[13px] text-muted-foreground">This profile is not available.</div>
          ) : error === "not_found" || !profile ? (
            <div className="p-8 text-center text-[13px] text-muted-foreground">
              Profile not found. Check the URL or open a creator from the leaderboard.
            </div>
          ) : (
            <div className="flex flex-col md:flex-row h-full">
              <div className="md:w-44 shrink-0 border-b md:border-b-0 md:border-r border-border h-full">
                <ProfileLeftNav activePanel={activePanel} setActivePanel={setActivePanel} isOwnProfile={isOwnProfile} />
              </div>

              <div className="flex-1 min-w-0 flex flex-col lg:flex-row h-full">
                <div className="flex-1 min-w-0 overflow-auto">
                  <div className="p-4 md:p-6 max-w-4xl mx-auto">
                    <div key={activePanel} className="animate-fade-in pb-10">
                      {renderPanel()}
                    </div>
                  </div>
                </div>

                <div className="hidden xl:block w-72 shrink-0 border-l border-border bg-muted/5 overflow-auto">
                  <div className="p-4 md:p-6">
                    <ProfileRightCard profile={profile} isOwnProfile={isOwnProfile} />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
