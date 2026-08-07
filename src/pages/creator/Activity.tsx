import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { CreatorShell, PageContainer, PageTitle } from "@/components/shell/CreatorShell";
import { FilterPills, UnderlineTabs } from "@/components/ui-kit/Pills";
import { StatusChip, normalizeStatus } from "@/components/ui-kit/StatusChip";
import { RowListSkeleton, StatBlockSkeleton } from "@/components/ui-kit/Skeletons";
import { Film, ChevronRight } from "lucide-react";
import { RowGroup, SubmissionRow } from "@/components/ui-kit/SubmissionRow";
import { EmptyState } from "@/components/EmptyState";
import { useToast } from "@/hooks/use-toast";

type SubRow = {
  id: string;
  campaign_id: string;
  platform: string;
  post_url: string;
  manual_views: number;
  total_views?: number | null;
  status: string;
  created_at: string;
  reject_reason: string | null;
  earnings?: { amount: number }[];
  campaigns?: {
    id: string;
    title: string;
    thumbnail_url: string | null;
    status: string;
    category: string;
    platforms?: string[];
  };
};

/** Derived campaign lifecycle state used by the Campaigns filter pills. */
function campaignPayoutState(status: string | null | undefined): "active" | "pending" | "paid" {
  const s = (status ?? "").toLowerCase();
  if (["completed", "ended", "paid", "paid_out"].includes(s)) return "paid";
  if (["paused", "pending", "pending_payout", "draft"].includes(s)) return "pending";
  return "active";
}

export default function CreatorActivity() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [rows, setRows] = useState<SubRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("campaigns");
  const [campFilter, setCampFilter] = useState("all");
  const [subFilter, setSubFilter] = useState("all");
  const warned = useRef(false);

  const loadRows = useCallback(async () => {
    if (!user) return;
    // flips posts whose 6s processing window has passed to Eligible
    await supabase.rpc("promote_eligible_submissions" as any);
    const { data, error } = await supabase
      .from("submissions")
      .select("*, earnings(amount), campaigns(id, title, thumbnail_url, status, category, platforms)")
      .eq("creator_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      if (!warned.current) {
        warned.current = true;
        toast({ title: "Could not load activity", description: error.message, variant: "destructive" });
      }
    } else {
      setRows((data ?? []) as SubRow[]);
    }
    setLoading(false);
  }, [user, toast]);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    void loadRows();
  }, [user, loadRows]);

  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`creator-submissions-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "submissions", filter: `creator_id=eq.${user.id}` },
        () => void loadRows(),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [user?.id, loadRows]);

  // keep polling while a post is inside its 6s processing window
  useEffect(() => {
    const hasProcessing = rows.some((r) => r.status === "processing");
    if (!hasProcessing) return;
    const t = setInterval(() => void loadRows(), 3000);
    return () => clearInterval(t);
  }, [rows, loadRows]);

  const campaignList = useMemo(() => {
    const map = new Map<string, { campaign: NonNullable<SubRow["campaigns"]>; submissions: SubRow[] }>();
    rows.forEach((r) => {
      if (!r.campaigns) return;
      const existing = map.get(r.campaign_id);
      if (existing) existing.submissions.push(r);
      else map.set(r.campaign_id, { campaign: r.campaigns, submissions: [r] });
    });
    return Array.from(map.values());
  }, [rows]);

  const earningsFor = (subs: SubRow[]) =>
    subs.reduce((acc, s) => acc + (s.earnings ?? []).reduce((a, e) => a + Number(e.amount), 0), 0);

  const filteredCampaigns = campaignList.filter(
    ({ campaign }) => campFilter === "all" || campaignPayoutState(campaign.status) === campFilter,
  );
  const filteredSubmissions = rows.filter((s) => subFilter === "all" || normalizeStatus(s.status) === subFilter);

  return (
    <CreatorShell>
      <PageContainer>
        <PageTitle>My Activity</PageTitle>

        {loading ? (
          <div className="space-y-4">
            <StatBlockSkeleton />
            <RowListSkeleton count={5} />
          </div>
        ) : campaignList.length === 0 ? (
          <div className="surface-card">
            <EmptyState
              icon={Film}
              title="Your submissions will appear here"
              description="Once you submit a clip to a campaign, you'll be able to track its views, status, and earnings right here."
              actionLabel="Find a campaign"
              actionTo="/discover"
            />
          </div>
        ) : (
          <>
            <UnderlineTabs
              className="mt-1"
              value={tab}
              onChange={setTab}
              options={[
                { value: "campaigns", label: "My Campaigns", count: campaignList.length },
                { value: "submissions", label: "Submissions", count: rows.length },
              ]}
            />

            {tab === "campaigns" ? (
              <FilterPills
                className="mt-4"
                value={campFilter}
                onChange={setCampFilter}
                options={[
                  { value: "all", label: "All" },
                  { value: "active", label: "Active" },
                  { value: "pending", label: "Pending" },
                  { value: "paid", label: "Paid Out" },
                ]}
              />
            ) : (
              <FilterPills
                className="mt-4"
                value={subFilter}
                onChange={setSubFilter}
                options={[
                  { value: "all", label: "All" },
                  { value: "eligible", label: "Eligible" },
                  { value: "ineligible", label: "Ineligible" },
                  { value: "paid", label: "Paid Out" },
                ]}
              />
            )}

            {tab === "campaigns" ? (
              <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                {filteredCampaigns.map(({ campaign, submissions }) => {
                  const earned = earningsFor(submissions);
                  const thumbnail = campaign.thumbnail_url || "/marketing-campaign-banner-fallback.svg";
                  const state = campaignPayoutState(campaign.status);
                  return (
                    <div key={campaign.id} className="surface-card p-4">
                      <div className="flex items-center gap-2.5">
                        <img
                          src={thumbnail}
                          alt=""
                          loading="lazy"
                          className="h-7 w-7 shrink-0 rounded-lg object-cover"
                        />
                        <h3 className="min-w-0 flex-1 truncate text-[14px] font-medium">{campaign.title}</h3>
                      </div>

                      <div className="mt-4 text-center">
                        <StatusChip
                          size="sm"
                          status={state === "paid" ? "paid" : state === "pending" ? "pending" : "active"}
                          label={state === "paid" ? "Paid Out" : state === "pending" ? "Pending" : "Active"}
                        />
                        <div className="display-figure mt-2 text-[30px] leading-none">${earned.toFixed(2)}</div>
                        <div className="mt-1.5 text-[12.5px] text-muted-foreground">Your earnings</div>
                      </div>

                      <button
                        type="button"
                        onClick={() => navigate(`/campaigns/${campaign.id}?tab=activity`)}
                        className="btn-outline-pill mt-4 h-11 w-full justify-between px-4 text-[13.5px]"
                      >
                        <span>Your Submissions: {submissions.length}</span>
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <RowGroup className="mt-4">
                {filteredSubmissions.map((s) => (
                  <SubmissionRow
                    key={s.id}
                    to={`/submissions/${s.id}`}
                    title={s.campaigns?.title ?? "Campaign"}
                    thumbnailUrl={s.campaigns?.thumbnail_url ?? null}
                    platform={s.platform}
                    status={s.status}
                    views={Number(s.total_views ?? s.manual_views ?? 0)}
                    createdAt={s.created_at}
                  />
                ))}
              </RowGroup>
            )}
          </>
        )}
      </PageContainer>
    </CreatorShell>
  );
}
