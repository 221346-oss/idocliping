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
  const { user } = useAuth();
  const [activePanel, setActivePanel] = useState<PanelType>("overview");
  const [showEditModal, setShowEditModal] = useState(false);

  // Mock creator data - in production would fetch from API
  const creatorProfile = useMemo(() => {
    return generateMockCreatorProfile(username || user?.username || "creator");
  }, [username, user?.username]);

  const isOwnProfile = !username || username === user?.username;

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
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
        <ProfileHeader />
        
        <div className="flex gap-6 px-6 py-6 max-w-7xl mx-auto">
          {/* Left Navigation - 22% */}
          <div className="w-[22%] min-w-max">
            <ProfileLeftNav 
              activePanel={activePanel} 
              setActivePanel={setActivePanel}
              isOwnProfile={isOwnProfile}
            />
          </div>

          {/* Center Content Panels - 50% */}
          <div className="flex-1 min-w-0">
            {renderPanel()}
          </div>

          {/* Right Profile Card - 28% */}
          <div className="w-[28%] min-w-max">
            <ProfileRightCard 
              profile={creatorProfile}
              isOwnProfile={isOwnProfile}
              onEditClick={() => setShowEditModal(true)}
            />
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
