import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/AppLayout";
import { Film, Megaphone } from "lucide-react";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/EmptyState";
import { TableSkeleton } from "@/components/Skeletons";
import { Skeleton } from "@/components/ui/skeleton";

type SubRow = {
  id: string;
  campaign_id: string;
  platform: string;
  post_url: string;
  manual_views: number;
  status: string;
  created_at: string;
  earnings?: { amount: number; status: string }[];
  campaigns?: { id: string; title: string; thumbnail_url: string | null; status: string; category: string };
};

export default function CreatorSubmissions() {
  const { user } = useAuth();
  const { campaignId } = useParams();
  const navigate = useNavigate();
  const [rows, setRows] = useState<SubRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("submissions")
        .select("*, earnings(amount, status), campaigns(id, title, thumbnail_url, status, category)")
        .eq("creator_id", user.id)
        .order("created_at", { ascending: false });
      setRows((data ?? []) as any);
      setLoading(false);
    })();
  }, [user]);

  // Group by campaign
  const campaignsMap = useMemo(() => {
    const map = new Map<string, { campaign: any; submissions: SubRow[] }>();
    rows.forEach((r) => {
      if (!r.campaigns) return;
      const existing = map.get(r.campaign_id);
      if (existing) existing.submissions.push(r);
      else map.set(r.campaign_id, { campaign: r.campaigns, submissions: [r] });
    });
    return map;
  }, [rows]);

  const campaignList = Array.from(campaignsMap.values());
  const activeId = campaignId || campaignList[0]?.campaign.id;
  const active = activeId ? campaignsMap.get(activeId) : null;

  const earningsForCampaign = (subs: SubRow[]) =>
    subs.reduce((acc, s) => acc + (s.earnings ?? []).reduce((a, e) => a + Number(e.amount), 0), 0);

  const payoutStatus = (subs: SubRow[], campaignStatus: string) => {
    const allEarnings = subs.flatMap((s) => s.earnings ?? []);
    if (allEarnings.length === 0) return { label: "Awaiting review", tone: "warning" as const };
    const allPaid = allEarnings.every((e) => e.status === "paid");
    if (allPaid) return { label: "✓ Paid Out", tone: "success" as const };
    return { label: "⏳ Processing", tone: "warning" as const };
  };

  return (
    <AppLayout>
      <div className="flex flex-col h-full">
        <div className="px-4 md:px-6 h-11 border-b border-border flex items-center shrink-0">
          <h1 className="text-[13px] font-medium">My Submissions</h1>
        </div>

        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex flex-col md:flex-row h-full">
              <div className="md:w-56 shrink-0 border-b md:border-b-0 md:border-r border-border p-1.5 space-y-1">
                {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-7 w-full" />)}
              </div>
              <div className="flex-1 p-6 space-y-6"><Skeleton className="h-12 w-full" /><Skeleton className="h-56 w-full sm:w-72" /><TableSkeleton rows={4} cols={5} /></div>
            </div>
          ) : campaignList.length === 0 ? (
            <EmptyState
              icon={Film}
              title="Your submissions will appear here"
              description="Once you submit a clip to a campaign, you'll be able to track its views, status, and earnings right here."
              actionLabel="Find a campaign"
              actionTo="/creator/campaigns"
            />
          ) : (
            <div className="flex flex-col md:flex-row h-full">
              {/* Sub-sidebar: per-campaign tabs */}
              <div className="md:w-56 shrink-0 border-b md:border-b-0 md:border-r border-border">
                <div className="flex md:flex-col p-1.5 gap-px overflow-x-auto md:overflow-visible">
                  {campaignList.map(({ campaign, submissions }) => {
                    const isActive = campaign.id === activeId;
                    return (
                      <button
                        key={campaign.id}
                        onClick={() => navigate(`/creator/submissions/${campaign.id}`)}
                        className={cn(
                          "flex items-center gap-1.5 text-[12px] h-7 px-2 rounded w-full justify-start whitespace-nowrap",
                          isActive ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted/50"
                        )}
                      >
                        <Megaphone className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{campaign.title}</span>
                        <span className="ml-auto text-[10px] text-muted-foreground">{submissions.length}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Active campaign details */}
              <div className="flex-1 min-w-0 p-6">
                {active && <CampaignSubmissionsView active={active} payoutStatus={payoutStatus} earningsForCampaign={earningsForCampaign} />}
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}

function CampaignSubmissionsView({
  active, payoutStatus, earningsForCampaign,
}: {
  active: { campaign: any; submissions: SubRow[] };
  payoutStatus: (subs: SubRow[], status: string) => { label: string; tone: "success" | "warning" };
  earningsForCampaign: (subs: SubRow[]) => number;
}) {
  const { campaign, submissions } = active;
  const earnings = earningsForCampaign(submissions);
  const { label, tone } = payoutStatus(submissions, campaign.status);
  const ended = campaign.status === "completed" || campaign.status === "ended";

  return (
    <div className="space-y-6">
      <div className="rounded-md bg-info/10 border border-info/20 p-3 text-[12px] text-foreground">
        Earnings will be credited to your <Link to="/creator/wallet" className="underline">Wallet</Link>. All posts are subject to review and earnings are not final.
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="border border-border rounded-md overflow-hidden bg-card">
          <div className="aspect-video bg-muted relative">
            {campaign.thumbnail_url ? (
              <img src={campaign.thumbnail_url} alt={campaign.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-[10px] text-muted-foreground uppercase tracking-wide">{campaign.category}</div>
            )}
            {campaign.category && (
              <span className="absolute bottom-2 left-2 text-[10px] uppercase tracking-wide px-1.5 py-0.5 bg-primary text-primary-foreground rounded font-medium">
                {campaign.category}
              </span>
            )}
          </div>
          <div className="p-4 space-y-3">
            <h3 className="text-[14px] font-semibold">{campaign.title}</h3>
            <div className="bg-muted/40 rounded-md p-3 text-center space-y-1">
              <div className="text-[11px] text-muted-foreground">Your Earnings</div>
              <div className="text-[22px] font-bold">${earnings.toFixed(2)}</div>
              <div className={cn("text-[12px] font-medium", tone === "success" ? "text-success" : "text-warning")}>
                {label}
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground text-center">
              {ended
                ? (tone === "success" ? "Campaign has ended. Earnings have been paid out." : "Campaign has ended. Payout is being processed.")
                : "Campaign is active. Submissions are under review."}
            </p>
          </div>
        </div>
      </div>

      <div className="border border-border rounded-md overflow-hidden">
        <div className="px-4 h-11 flex items-center border-b border-border">
          <h3 className="text-[13px] font-medium">Posts ({submissions.length})</h3>
        </div>
        <table className="w-full text-[13px]">
          <thead className="bg-muted/30 text-muted-foreground text-[11px] uppercase tracking-wide">
            <tr>
              <th className="text-left p-3">Platform</th>
              <th className="text-left p-3">URL</th>
              <th className="text-right p-3">Views</th>
              <th className="text-right p-3">Earned</th>
              <th className="text-left p-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {submissions.map((s) => {
              const earned = (s.earnings ?? []).reduce((a, e) => a + Number(e.amount), 0);
              return (
                <tr key={s.id} className="border-t border-border">
                  <td className="p-3 capitalize">{s.platform}</td>
                  <td className="p-3 max-w-[280px]">
                    <a href={s.post_url} target="_blank" rel="noreferrer" className="underline truncate block">{s.post_url}</a>
                  </td>
                  <td className="p-3 text-right">{Number(s.manual_views).toLocaleString()}</td>
                  <td className="p-3 text-right">${earned.toFixed(2)}</td>
                  <td className="p-3">
                    <span className={cn("text-[11px] px-2 py-0.5 rounded uppercase tracking-wide",
                      s.status === "approved" ? "bg-success/15 text-success" :
                      s.status === "rejected" ? "bg-destructive/15 text-destructive" :
                      "bg-warning/15 text-warning"
                    )}>{s.status}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
