import { useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { CreatorShell, PageContainer, PageTitle } from "@/components/shell/CreatorShell";
import { FilterPills, PillOption } from "@/components/ui-kit/Pills";
import { ProfileRightCard } from "@/components/profile/ProfileRightCard";
import { ProfileOverview } from "@/components/profile/panels/ProfileOverview";
import { ProfileStats } from "@/components/profile/panels/ProfileStats";
import { ProfileCampaigns } from "@/components/profile/panels/ProfileCampaigns";
import { ProfileSubmissions } from "@/components/profile/panels/ProfileSubmissions";
import { ProfileAchievements } from "@/components/profile/panels/ProfileAchievements";
import { ProfileHonorScore } from "@/components/profile/panels/ProfileHonorScore";
import { ProfileSavedCampaigns } from "@/components/profile/panels/ProfileSavedCampaigns";
import { AccountProfileView } from "@/components/profile/AccountProfileView";

import { usePublicProfile } from "@/hooks/usePublicProfile";
import { StatBlockSkeleton, RowListSkeleton } from "@/components/ui-kit/Skeletons";
import { EmptyState } from "@/components/EmptyState";
import { UserRound, Pencil } from "lucide-react";

type PanelType =
  | "overview"
  | "stats"
  | "campaigns"
  | "submissions"
  | "achievements"
  | "honor"
  | "saved";

const PANELS: { value: PanelType; label: string; ownOnly?: boolean }[] = [
  { value: "overview", label: "Overview" },
  { value: "stats", label: "Stats" },
  { value: "campaigns", label: "Campaigns" },
  { value: "submissions", label: "Submissions" },
  { value: "achievements", label: "Achievements" },
  { value: "honor", label: "Honor score" },
  { value: "saved", label: "Saved", ownOnly: true },
];

export default function CreatorProfile() {
  const { username } = useParams<{ username: string }>();
  const [panel, setPanel] = useState<PanelType>("overview");
  const { profile, loading, error, isOwnProfile } = usePublicProfile(username);

  const options: PillOption[] = useMemo(
    () =>
      PANELS.filter((p) => !p.ownOnly || isOwnProfile).map((p) => ({
        value: p.value,
        label: p.label,
      })),
    [isOwnProfile],
  );

  const renderPanel = () => {
    if (!profile) return null;
    switch (panel) {
      case "stats":
        return <ProfileStats profile={profile} />;
      case "campaigns":
        return <ProfileCampaigns profile={profile} />;
      case "submissions":
        return <ProfileSubmissions profile={profile} />;
      case "achievements":
        return <ProfileAchievements />;
      case "honor":
        return <ProfileHonorScore profile={profile} />;
      case "saved":
        return isOwnProfile ? <ProfileSavedCampaigns /> : null;
      default:
        return <ProfileOverview profile={profile} />;
    }
  };

  const isAccountView = isOwnProfile && (!username || username === "me");

  return (
    <CreatorShell>
      <PageContainer>
        <PageTitle
          action={
            isOwnProfile && !isAccountView ? (
              <Link
                to="/profile/edit"
                className="press-scale focus-ring inline-flex h-10 items-center gap-2 rounded-full border border-border/70 bg-surface-raised px-4 text-[14px] font-semibold transition-colors hover:border-border"
              >
                <Pencil className="h-[15px] w-[15px]" />
                Edit
              </Link>
            ) : undefined
          }
        >
          Profile
        </PageTitle>

        {loading ? (
          <div className="space-y-4">
            <StatBlockSkeleton />
            <RowListSkeleton count={4} />
          </div>
        ) : error === "hidden" ? (
          <EmptyState icon={UserRound} title="Profile unavailable" description="This creator keeps their profile private." />
        ) : error === "not_found" || !profile ? (
          <EmptyState
            icon={UserRound}
            title="Profile not found"
            description="Check the link, or open a creator from the leaderboard."
          />
        ) : isAccountView ? (
          <AccountProfileView profile={profile} />
        ) : (
          <>
            <div className="surface-card p-4 md:p-5">
              <ProfileRightCard profile={profile} isOwnProfile={isOwnProfile} />
            </div>

            <FilterPills className="mt-4" options={options} value={panel} onChange={(v) => setPanel(v as PanelType)} />

            <div key={panel} className="mt-4 animate-fade-in pb-6">
              {renderPanel()}
            </div>
          </>
        )}
      </PageContainer>
    </CreatorShell>
  );
}

