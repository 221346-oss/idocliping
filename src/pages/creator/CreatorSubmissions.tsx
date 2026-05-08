import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/AppLayout";
import { Film, Megaphone } from "lucide-react";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/EmptyState";
import { TableSkeleton } from "@/components/Skeletons";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { submissionStatusBadgeClass, submissionStatusLabel } from "@/lib/submission-status";
import { useToast } from "@/hooks/use-toast";
import type { Tables } from "@/integrations/supabase/types";

type AppealRow = Pick<
  Tables<"submission_appeals">,
  "id" | "status" | "message" | "admin_note" | "created_at"
>;

type SubRow = {
  id: string;
  campaign_id: string;
  platform: string;
  post_url: string;
  manual_views: number;
  status: string;
  created_at: string;
  reject_reason: string | null;
  earnings?: { amount: number }[];
  campaigns?: { id: string; title: string; thumbnail_url: string | null; status: string; category: string };
  submission_appeals?: AppealRow[] | null;
};

export default function CreatorSubmissions() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { campaignId } = useParams();
  const navigate = useNavigate();
  const [rows, setRows] = useState<SubRow[]>([]);
  const [loading, setLoading] = useState(true);

  const missingAppealsWarned = useRef(false);

  const loadRows = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("submissions")
      .select(
        "*, earnings(amount), campaigns(id, title, thumbnail_url, status, category), submission_appeals(id, status, message, admin_note, created_at)",
      )
      .eq("creator_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      const missingTable =
        error.message?.includes("submission_appeals") ||
        error.message?.includes("Could not find") ||
        error.code === "PGRST200";
      if (missingTable) {
        const { data: fallback } = await supabase
          .from("submissions")
          .select("*, earnings(amount), campaigns(id, title, thumbnail_url, status, category)")
          .eq("creator_id", user.id)
          .order("created_at", { ascending: false });
        setRows((fallback ?? []) as SubRow[]);
        if (!missingAppealsWarned.current) {
          missingAppealsWarned.current = true;
          toast({
            title: "Appeals not available yet",
            description: "Run the SQL in supabase/manual/001_submission_appeals_and_realtime.sql to enable appeals and live updates.",
          });
        }
      } else {
        toast({ title: "Could not load submissions", description: error.message, variant: "destructive" });
      }
    } else {
      setRows((data ?? []) as SubRow[]);
    }
    setLoading(false);
  }, [user]);

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
        () => {
          void loadRows();
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "submission_appeals", filter: `creator_id=eq.${user.id}` },
        () => {
          void loadRows();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [user?.id, loadRows]);

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

  const payoutStatus = (subs: SubRow[], _campaignStatus: string) => {
    const allEarnings = subs.flatMap((s) => s.earnings ?? []);
    if (allEarnings.length === 0) return { label: "Awaiting review", tone: "warning" as const };
    return { label: "✓ Eligible", tone: "success" as const };
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
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-7 w-full" />
                ))}
              </div>
              <div className="flex-1 p-6 space-y-6">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-56 w-full sm:w-72" />
                <TableSkeleton rows={4} cols={5} />
              </div>
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
              <div className="md:w-56 shrink-0 border-b md:border-b-0 md:border-r border-border">
                <div className="flex md:flex-col p-1.5 gap-px overflow-x-auto md:overflow-visible">
                  {campaignList.map(({ campaign, submissions }) => {
                    const isActive = campaign.id === activeId;
                    return (
                      <button
                        key={campaign.id}
                        type="button"
                        onClick={() => navigate(`/creator/submissions/${campaign.id}`)}
                        className={cn(
                          "flex items-center gap-1.5 text-[12px] h-7 px-2 rounded w-full justify-start whitespace-nowrap",
                          isActive ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted/50",
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

              <div className="flex-1 min-w-0 p-6">
                {active && (
                  <CampaignSubmissionsView
                    active={active}
                    payoutStatus={payoutStatus}
                    earningsForCampaign={earningsForCampaign}
                    onAppealSubmitted={loadRows}
                  />
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}

function CampaignSubmissionsView({
  active,
  payoutStatus,
  earningsForCampaign,
  onAppealSubmitted,
}: {
  active: { campaign: any; submissions: SubRow[] };
  payoutStatus: (subs: SubRow[], status: string) => { label: string; tone: "success" | "warning" };
  earningsForCampaign: (subs: SubRow[]) => number;
  onAppealSubmitted: () => void | Promise<void>;
}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { campaign, submissions } = active;
  const earnings = earningsForCampaign(submissions);
  const { label, tone } = payoutStatus(submissions, campaign.status);
  const ended = campaign.status === "completed" || campaign.status === "ended";

  const [appealFor, setAppealFor] = useState<SubRow | null>(null);
  const [appealText, setAppealText] = useState("");
  const [appealSending, setAppealSending] = useState(false);

  const sendAppeal = async () => {
    if (!user || !appealFor || !appealText.trim()) return;
    setAppealSending(true);
    const { error } = await supabase.from("submission_appeals").insert({
      submission_id: appealFor.id,
      creator_id: user.id,
      message: appealText.trim(),
    });
    setAppealSending(false);
    if (error) {
      return toast({
        title: "Appeal not sent",
        description: error.message,
        variant: "destructive",
      });
    }
    toast({ title: "Appeal submitted", description: "An admin will review your request." });
    setAppealFor(null);
    setAppealText("");
    await onAppealSubmitted();
  };

  const pendingAppeal = (s: SubRow) =>
    (s.submission_appeals ?? []).some((a) => a.status === "pending");

  const latestAppealNote = (s: SubRow) => {
    const withNote = (s.submission_appeals ?? [])
      .filter((a) => (a.status === "closed" || a.status === "reviewed") && a.admin_note?.trim())
      .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
    return withNote[0] ?? null;
  };

  return (
    <div className="space-y-6">
      <div className="rounded-md bg-muted/40 border border-border p-3 text-[12px] text-foreground">
        Earnings credit to your <Link to="/creator/wallet" className="underline">Wallet</Link>.
        <span className="text-muted-foreground"> Processing</span> means the post is with an admin.
        <span className="text-primary"> Eligible</span> means it counts for views and payout;
        <span className="text-destructive"> Ineligible</span> means it was declined — see the reason below.
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="border border-border rounded-md overflow-hidden bg-card">
          <div className="aspect-video bg-muted relative">
            {campaign.thumbnail_url ? (
              <img src={campaign.thumbnail_url} alt={campaign.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-[10px] text-muted-foreground uppercase tracking-wide">
                {campaign.category}
              </div>
            )}
            {campaign.category && (
              <span className="absolute bottom-2 left-2 text-[9px] uppercase tracking-wide px-1.5 py-0.5 bg-muted text-muted-foreground border border-border rounded font-medium">
                {campaign.category}
              </span>
            )}
          </div>
          <div className="p-4 space-y-3">
            <h3 className="text-[14px] font-semibold">{campaign.title}</h3>
            <div className="bg-muted/40 rounded-md p-3 text-center space-y-1">
              <div className="text-[11px] text-muted-foreground">Your Earnings</div>
              <div className="text-[22px] font-bold">${earnings.toFixed(2)}</div>
              <div className={cn("text-[12px] font-medium", tone === "success" ? "text-primary" : "text-warning")}>
                {label}
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground text-center">
              {ended
                ? tone === "success"
                  ? "Campaign has ended. Earnings have been paid out."
                  : "Campaign has ended. Payout is being processed."
                : "Campaign is active. Submissions move through admin review."}
            </p>
          </div>
        </div>
      </div>

      <div className="border border-border rounded-md overflow-hidden">
        <div className="px-4 h-11 flex items-center border-b border-border">
          <h3 className="text-[13px] font-medium">Posts ({submissions.length})</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px] min-w-[640px]">
            <thead className="bg-muted/30 text-muted-foreground text-[11px] uppercase tracking-wide">
              <tr>
                <th className="text-left p-3">Platform</th>
                <th className="text-left p-3">URL</th>
                <th className="text-right p-3">Views</th>
                <th className="text-right p-3">Earned</th>
                <th className="text-left p-3">Status</th>
                <th className="text-left p-3 w-[120px]"> </th>
              </tr>
            </thead>
            <tbody>
              {submissions.map((s) => {
                const earned = (s.earnings ?? []).reduce((a, e) => a + Number(e.amount), 0);
                const appeals = s.submission_appeals ?? [];
                const note = latestAppealNote(s);
                return (
                  <tr key={s.id} className="border-t border-border align-top">
                    <td className="p-3 capitalize">{s.platform}</td>
                    <td className="p-3 max-w-[220px] md:max-w-[280px]">
                      <a
                        href={s.post_url}
                        target="_blank"
                        rel="noreferrer"
                        className="underline truncate block"
                      >
                        {s.post_url}
                      </a>
                      {s.status === "rejected" && s.reject_reason && (
                        <p className="text-[11px] text-destructive mt-1.5 leading-snug">
                          Reason: {s.reject_reason}
                        </p>
                      )}
                      {note && (
                        <p className="text-[11px] text-muted-foreground mt-1.5 leading-snug">
                          Admin (appeal): {note.admin_note}
                        </p>
                      )}
                      {pendingAppeal(s) && (
                        <p className="text-[11px] text-warning mt-1">Appeal pending review.</p>
                      )}
                    </td>
                    <td className="p-3 text-right">{Number(s.manual_views).toLocaleString()}</td>
                    <td className="p-3 text-right">${earned.toFixed(2)}</td>
                    <td className="p-3">
                      <span
                        className={cn(
                          "inline-flex text-[10px] px-2 py-0.5 rounded uppercase tracking-wide font-medium",
                          submissionStatusBadgeClass(s.status),
                        )}
                      >
                        {submissionStatusLabel(s.status)}
                      </span>
                    </td>
                    <td className="p-3">
                      {s.status === "rejected" && !pendingAppeal(s) && (
                        <Button type="button" variant="outline" size="sm" className="h-7 text-[11px]" onClick={() => setAppealFor(s)}>
                          Appeal
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={!!appealFor} onOpenChange={(o) => !o && setAppealFor(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[15px]">Appeal this decision</DialogTitle>
          </DialogHeader>
          <p className="text-[12px] text-muted-foreground">
            Explain why this submission should be reconsidered. An admin will see this in the appeals queue.
          </p>
          <Textarea
            value={appealText}
            onChange={(e) => setAppealText(e.target.value)}
            placeholder="Details for the admin…"
            className="min-h-[100px] text-[13px]"
          />
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="ghost" size="sm" onClick={() => setAppealFor(null)}>
              Cancel
            </Button>
            <Button type="button" size="sm" disabled={appealSending || !appealText.trim()} onClick={() => void sendAppeal()}>
              {appealSending ? "Sending…" : "Submit appeal"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
