import { useState, useMemo } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/AppLayout";
import { ProfileHeader } from "@/components/profile/ProfileHeader";
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
import { EditProfileModal } from "@/components/profile/EditProfileModal";
import { generateMockCreatorProfile } from "@/lib/mockData";

type PanelType = "overview" | "stats" | "campaigns" | "submissions" | "achievements" | "cosmetics" | "honor" | "saved";

export default function CreatorProfile() {
  const { username } = useParams<{ username: string }>();
  const [activePanel, setActivePanel] = useState<PanelType>("overview");
  const [showEditModal, setShowEditModal] = useState(false);

  const { profile } = useAuth();

  // Mock creator data - in production would fetch from API
  const displayUsername = username === "me" ? (profile?.full_name || "creator") : (username || "creator");
  const creatorProfile = useMemo(() => {
    return generateMockCreatorProfile(displayUsername);
  }, [displayUsername]);

  const isOwnProfile = !username || username === "me" || username === profile?.full_name;

  const renderPanel = () => {
    switch (activePanel) {
      case "overview":
        return <ProfileOverview profile={creatorProfile} />;
      case "stats":
        return <ProfileStats profile={creatorProfile} />;
      case "campaigns":
        return <ProfileCampaigns profile={creatorProfile} />;
      case "submissions":
        return <ProfileSubmissions profile={creatorProfile} />;
      case "achievements":
        return <ProfileAchievements profile={creatorProfile} />;
      case "cosmetics":
        return isOwnProfile ? (
          <ProfileCosmetics profile={creatorProfile} onEdit={() => setShowEditModal(true)} />
        ) : null;
      case "honor":
        return <ProfileHonorScore profile={creatorProfile} />;
      case "saved":
        return <ProfileSavedCampaigns profile={creatorProfile} />;
      default:
        return <ProfileOverview profile={creatorProfile} />;
    }
  };

  return (
    <AppLayout>
      <div className="flex flex-col h-full bg-background overflow-hidden">
        {/* Header - exactly like Settings h-11 */}
        <div className="px-4 md:px-6 h-11 border-b border-border flex items-center shrink-0">
          <h1 className="text-[13px] font-medium uppercase tracking-tight">Creator Profile</h1>
        </div>
        
        <div className="flex-1 overflow-auto">
          {/* Main Layout - replicating Settings flex structure */}
          <div className="flex flex-col md:flex-row h-full">
            {/* Left Sidebar - exactly md:w-44 from Settings.tsx */}
            <div className="md:w-44 shrink-0 border-b md:border-b-0 md:border-r border-border h-full">
              <ProfileLeftNav 
                activePanel={activePanel} 
                setActivePanel={setActivePanel}
                isOwnProfile={isOwnProfile}
              />
            </div>

            {/* Center Content + Right Card Container */}
            <div className="flex-1 min-w-0 flex flex-col lg:flex-row h-full">
              {/* Dynamic Content Panels */}
              <div className="flex-1 min-w-0 overflow-auto">
                <div className="p-4 md:p-6 max-w-4xl mx-auto">
                  <div key={activePanel} className="animate-fade-in pb-10">
                    {renderPanel()}
                  </div>
                </div>
              </div>

              {/* Right Profile Card - Desktop only */}
              <div className="hidden xl:block w-72 shrink-0 border-l border-border bg-muted/5 overflow-auto">
                <div className="p-4 md:p-6">
                  <ProfileRightCard 
                    profile={creatorProfile}
                    isOwnProfile={isOwnProfile}
                    onEditClick={() => setShowEditModal(true)}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {isOwnProfile && (
          <EditProfileModal
            open={showEditModal}
            onOpenChange={setShowEditModal}
            profile={creatorProfile}
          />
        )}
      </div>
    </AppLayout>
  );
}
