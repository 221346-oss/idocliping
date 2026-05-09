import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/AppLayout";
import { Film, Megaphone, ArrowLeft, Trash2, Loader2, Info, LayoutDashboard, TrendingUp, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/EmptyState";
import { TableSkeleton } from "@/components/Skeletons";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { submissionStatusBadgeClass, submissionStatusLabel } from "@/lib/submission-status";
import { useToast } from "@/hooks/use-toast";
import type { Tables } from "@/integrations/supabase/types";
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { detectSocialPlatformFromUrl } from "@/lib/detect-post-platform";

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
  campaigns?: { id: string; title: string; thumbnail_url: string | null; status: string; category: string; platforms?: string[] };
  submission_appeals?: AppealRow[] | null;
};

const PLATFORM_LABEL: Record<string, string> = {
  tiktok: "TikTok",
  instagram: "Instagram",
  youtube: "YouTube",
  x: "X",
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
        "*, earnings(amount), campaigns(id, title, thumbnail_url, status, category, platforms), submission_appeals(id, status, message, admin_note, created_at)",
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
          .select("*, earnings(amount), campaigns(id, title, thumbnail_url, status, category, platforms)")
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
  const isOverview = !campaignId || campaignId === "overview";
  const activeId = isOverview ? "overview" : campaignId;
  const active = campaignsMap.get(activeId);

  const earningsForCampaign = (subs: SubRow[]) =>
    subs.reduce((acc, s) => acc + (s.earnings ?? []).reduce((a, e) => a + Number(e.amount), 0), 0);

  const payoutStatus = (subs: SubRow[], campaignStatus: string) => {
    const allEarnings = subs.flatMap((s) => s.earnings ?? []);
    if (allEarnings.length === 0) return { label: "Processing", tone: "warning" as const, icon: Clock };
    return { label: "Eligible", tone: "success" as const, icon: TrendingUp };
  };

  const totalEarnings = rows.reduce((acc, r) => acc + (r.earnings ?? []).reduce((a, e) => a + Number(e.amount), 0), 0);

  return (
    <AppLayout>
      <div className="flex flex-col h-full bg-background overflow-hidden">
        {/* Header */}
        <div className="px-4 md:px-6 h-11 border-b border-border flex items-center shrink-0">
          <h1 className="text-[13px] font-medium uppercase tracking-tight">My Submissions</h1>
        </div>

        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex flex-col md:flex-row h-full">
              <div className="md:w-44 shrink-0 border-b md:border-b-0 md:border-r border-border p-1.5 space-y-1">
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
              {/* Left Sidebar */}
              <div className="md:w-44 shrink-0 border-b md:border-b-0 md:border-r border-border overflow-y-auto">
                <div className="flex md:flex-col p-1.5 gap-px">
                  {/* Overview Item */}
                  <button
                    onClick={() => navigate("/creator/submissions/overview")}
                    className={cn(
                      "flex items-center gap-1.5 text-[12px] h-7 px-2 rounded-sm w-full justify-start whitespace-nowrap transition-colors",
                      isOverview ? "bg-muted text-foreground font-medium" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                    )}
                  >
                    <LayoutDashboard className="h-3.5 w-3.5 shrink-0" />
                    <span>Overview</span>
                  </button>

                  <div className="my-1 border-t border-border/50 md:block hidden" />

                  {/* Campaign Items */}
                  {campaignList.map(({ campaign, submissions }) => {
                    const isActive = campaign.id === activeId;
                    return (
                      <button
                        key={campaign.id}
                        type="button"
                        onClick={() => navigate(`/creator/submissions/${campaign.id}`)}
                        className={cn(
                          "flex items-center gap-1.5 text-[12px] h-7 px-2 rounded-sm w-full justify-start whitespace-nowrap transition-colors",
                          isActive ? "bg-muted text-foreground font-medium" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                        )}
                      >
                        <Megaphone className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{campaign.title}</span>
                        <span className="ml-auto text-[10px] text-muted-foreground tabular-nums">{submissions.length}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Content Panel */}
              <div className="flex-1 min-w-0 overflow-y-auto">
                <div className="p-4 md:p-6 max-w-6xl mx-auto">
                  {isOverview ? (
                    <SubmissionsOverview 
                      campaignList={campaignList} 
                      totalEarnings={totalEarnings} 
                      earningsForCampaign={earningsForCampaign}
                      payoutStatus={payoutStatus}
                      navigate={navigate}
                    />
                  ) : active ? (
                    <div className="animate-fade-in pb-10">
                      <CampaignSubmissionsView
                        active={active}
                        payoutStatus={payoutStatus}
                        earningsForCampaign={earningsForCampaign}
                        onAppealSubmitted={loadRows}
                        onReload={() => loadRows()}
                      />
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}

function SubmissionsOverview({ 
  campaignList, 
  totalEarnings, 
  earningsForCampaign,
  payoutStatus,
  navigate
}: { 
  campaignList: { campaign: any; submissions: SubRow[] }[],
  totalEarnings: number,
  earningsForCampaign: (subs: SubRow[]) => number,
  payoutStatus: (subs: SubRow[], status: string) => { label: string; tone: "success" | "warning", icon: any },
  navigate: any
}) {
  return (
    <div className="space-y-8 animate-fade-in pb-20">
      {/* Total Earnings Stats - Dashboard Style */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-px bg-border rounded-md overflow-hidden border border-border">
        <div className="bg-background p-4">
          <p className="text-[12px] text-muted-foreground">Total Earnings</p>
          <div className="flex items-baseline gap-1.5 mt-1">
            <p className="text-2xl font-medium text-primary">${totalEarnings.toFixed(2)}</p>
          </div>
          <p className="text-[10px] text-muted-foreground/60 mt-1 flex items-center gap-1">
            <TrendingUp className="h-3 w-3" /> Lifetime earnings
          </p>
        </div>
        <div className="bg-background p-4">
          <p className="text-[12px] text-muted-foreground">Active Tracks</p>
          <p className="text-2xl font-medium mt-1">{campaignList.filter(c => c.campaign.status === "active").length}</p>
        </div>
        <div className="bg-background p-4">
          <p className="text-[12px] text-muted-foreground">Participated</p>
          <p className="text-2xl font-medium mt-1">{campaignList.length}</p>
        </div>
      </div>

      {/* Campaigns Rich Cards Grid */}
      <div className="space-y-4">
        <h3 className="text-[12px] font-bold uppercase tracking-[0.1em] text-muted-foreground/70 px-1">Campaign Earnings Breakdown</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {campaignList.map(({ campaign, submissions }) => {
            const earnings = earningsForCampaign(submissions);
            const { label, tone, icon: StatusIcon } = payoutStatus(submissions, campaign.status);
            const ended = campaign.status === "completed" || campaign.status === "ended";
            const thumbnail = campaign.thumbnail_url || "/marketing-campaign-banner-fallback.svg";
            
            return (
              <div 
                key={campaign.id} 
                onClick={() => navigate(`/creator/submissions/${campaign.id}`)}
                className="group bg-card border border-border rounded-lg p-2.5 space-y-3 hover:border-primary/50 transition-all cursor-pointer flex flex-col shadow-sm"
              >
                {/* Thumbnail Area - Shorter for compactness */}
                <div className="relative aspect-video w-full rounded-md overflow-hidden shrink-0">
                  <img src={thumbnail} alt="" className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                  <div className="absolute inset-0 bg-black/20" />
                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2">
                    <span className="bg-primary px-3 py-1 rounded-full text-[9px] font-bold text-black shadow-lg uppercase tracking-wider">
                      {campaign.category || "General"}
                    </span>
                  </div>
                </div>

                {/* Title - Smaller font */}
                <div className="px-1 text-center">
                  <h4 className="text-[13px] font-bold text-foreground leading-tight line-clamp-1">
                    {campaign.title}
                  </h4>
                </div>

                {/* Earnings Box - Compact version */}
                <div className="bg-muted/30 rounded-md p-3 flex flex-col items-center justify-center space-y-0.5 flex-1 border border-border/40">
                  <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest">Earnings</p>
                  <p className="text-[20px] font-black text-foreground">${earnings.toFixed(2)}</p>
                  <div className={cn(
                    "flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider",
                    tone === "success" ? "text-primary" : "text-warning"
                  )}>
                    <StatusIcon className="h-3 w-3" />
                    {label}
                  </div>
                </div>

                {/* Footer Status Text - Smaller font */}
                <p className="text-[10px] text-center text-muted-foreground/70 leading-tight px-1">
                  {ended 
                    ? "Ended. Payout processing." 
                    : "Active. Under review."}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function CampaignSubmissionsView({
  active,
  payoutStatus,
  earningsForCampaign,
  onAppealSubmitted,
  onReload,
}: {
  active: { campaign: any; submissions: SubRow[] };
  payoutStatus: (subs: SubRow[], status: string) => { label: string; tone: "success" | "warning", icon: any };
  earningsForCampaign: (subs: SubRow[]) => number;
  onAppealSubmitted: () => void | Promise<void>;
  onReload: () => void | Promise<void>;
}) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { campaign, submissions } = active;
  const earnings = earningsForCampaign(submissions);
  const { label, tone } = payoutStatus(submissions, campaign.status);
  const ended = campaign.status === "completed" || campaign.status === "ended";

  const [appealFor, setAppealFor] = useState<SubRow | null>(null);
  const [appealText, setAppealText] = useState("");
  const [appealSending, setAppealSending] = useState(false);

  const supportedPlatforms = ((campaign.platforms ?? []) as string[]).filter(Boolean);
  const [submitOpen, setSubmitOpen] = useState(false);
  const [postUrlDraft, setPostUrlDraft] = useState("");
  const [pendingPlatform, setPendingPlatform] = useState<string | null>(null);
  const [submitBusy, setSubmitBusy] = useState(false);

  const [confirmSubmitOpen, setConfirmSubmitOpen] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<SubRow | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const heroImage =
    typeof campaign.thumbnail_url === "string" && campaign.thumbnail_url.trim()
      ? campaign.thumbnail_url.trim()
      : "/marketing-campaign-banner-fallback.svg";

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

  const openSubmitModal = () => {
    setPostUrlDraft("");
    setPendingPlatform(null);
    setSubmitOpen(true);
  };

  const validateUrlForSubmit = (): { platform: "tiktok" | "instagram" | "youtube" | "x"; url: string } | null => {
    const raw = postUrlDraft.trim();
    if (!raw) {
      toast({ title: "URL required", variant: "destructive" });
      return null;
    }
    try {
      // eslint-disable-next-line no-new
      new URL(raw);
    } catch {
      toast({ title: "Invalid URL", description: "Paste a full link including https://", variant: "destructive" });
      return null;
    }
    const detected = detectSocialPlatformFromUrl(raw);
    if (!detected) {
      toast({
        title: "Could not detect platform",
        description: "Use a TikTok, Instagram, YouTube, or X post URL.",
        variant: "destructive",
      });
      return null;
    }
    if (supportedPlatforms.length && !supportedPlatforms.some((p) => String(p).toLowerCase() === detected)) {
      toast({
        title: "Platform not accepted",
        description: `This campaign does not accept ${PLATFORM_LABEL[detected]} posts.`,
        variant: "destructive",
      });
      return null;
    }
    return { platform: detected, url: raw };
  };

  const handleSubmitIntent = () => {
    const ok = validateUrlForSubmit();
    if (!ok) return;
    setPendingPlatform(ok.platform);
    setConfirmSubmitOpen(true);
  };

  const finalizeSubmit = async () => {
    if (!user) return;
    const ok = validateUrlForSubmit();
    if (!ok) return;
    setSubmitBusy(true);
    try {
      const { data: part } = await supabase
        .from("campaign_participants")
        .select("id")
        .eq("campaign_id", campaign.id)
        .eq("creator_id", user.id)
        .maybeSingle();
      if (!part) {
        await supabase.from("campaign_participants").insert({ campaign_id: campaign.id, creator_id: user.id });
      }

      const { error } = await supabase.from("submissions").insert({
        campaign_id: campaign.id,
        creator_id: user.id,
        platform: ok.platform,
        post_url: ok.url,
      });
      if (error) throw error;
      toast({ title: "Submitted!", description: "Admin will verify your post shortly." });
      setConfirmSubmitOpen(false);
      setSubmitOpen(false);
      setPostUrlDraft("");
      await onReload();
    } catch (e: unknown) {
      toast({
        title: "Submission failed",
        description: e instanceof Error ? e.message : "Try again",
        variant: "destructive",
      });
    } finally {
      setSubmitBusy(false);
    }
  };

  const confirmDelete = async () => {
    if (!user || !deleteTarget) return;
    setDeleteBusy(true);
    const { error } = await supabase.from("submissions").delete().eq("id", deleteTarget.id).eq("creator_id", user.id);
    setDeleteBusy(false);
    setDeleteTarget(null);
    if (error) {
      return toast({
        title: "Could not delete",
        description:
          error.message?.includes("policy") || error.code === "42501"
            ? "Run supabase/manual/003_creator_delete_own_pending_submission.sql in Supabase, then try again."
            : error.message,
        variant: "destructive",
      });
    }
    toast({ title: "Submission removed" });
    await onReload();
  };

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div className="rounded-md bg-muted/40 border border-border p-3 text-[12px] text-foreground">
        Earnings credit to your <Link to="/creator/wallet" className="underline">Wallet</Link>.
        <span className="text-muted-foreground"> Processing</span> means the post is with an admin.
        <span className="text-primary"> Eligible</span> means it counts for views and payout;
        <span className="text-destructive"> Ineligible</span> means it was declined — see the reason below.
      </div>

      <div className="relative w-full rounded-lg overflow-hidden border border-border min-h-[176px] sm:min-h-[220px] max-h-[320px]">
        <img src={heroImage} alt="" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-black/58" />

        <div className="relative z-10 flex flex-col gap-5 p-5 sm:p-7 min-h-[176px] sm:min-h-[220px]">
          <div className="flex items-start justify-end gap-3">
            <Button type="button" variant="destructive" size="sm" className="shadow-sm shrink-0" onClick={openSubmitModal}>
              Submit a post
            </Button>
          </div>

          <div className="flex flex-1 items-center justify-center px-4">
            <div className="max-w-[min(100%,620px)] w-full px-6 py-2.5 rounded-full bg-black/72 border border-white/25 backdrop-blur-sm">
              <div className="text-center space-y-1">
                <h2 className="text-[clamp(17px,2.8vw,22px)] font-semibold text-white tracking-tight leading-snug">{campaign.title}</h2>
                <div className="flex items-center justify-center gap-4 mt-2">
                  <div className="bg-white/10 rounded-full px-3 py-1 flex items-center gap-2">
                    <div className="text-[11px] text-white/85">Earnings</div>
                    <div className="text-[15px] font-bold text-white tabular-nums">${earnings.toFixed(2)}</div>
                  </div>
                  <div className={cn("text-[12px] font-medium px-2 py-0.5 rounded-full", tone === "success" ? "text-primary bg-primary/10" : "text-warning bg-warning/10")}>
                    {label}
                  </div>
                </div>
                <p className="text-[11px] text-white/85 pt-2">
                  {ended
                    ? tone === "success"
                      ? "Campaign has ended."
                      : "Campaign has ended. Payout is being processed."
                    : "Campaign is active. Submissions move through admin review."}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="border border-border rounded-md overflow-hidden bg-card">
        <div className="px-4 h-11 flex items-center justify-between gap-4 border-b border-border bg-muted/20">
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
                <th className="text-right p-3 w-[112px]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {submissions.map((s) => {
                const earned = (s.earnings ?? []).reduce((a, e) => a + Number(e.amount), 0);
                const appeals = s.submission_appeals ?? [];
                const note = latestAppealNote(s);
                return (
                  <tr key={s.id} className="border-t border-border align-top hover:bg-muted/5 transition-colors">
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
                    <td className="p-3 text-right space-x-1">
                      <div className="inline-flex justify-end gap-1 flex-wrap">
                        {s.status === "rejected" && !pendingAppeal(s) && (
                          <Button type="button" variant="outline" size="sm" className="h-7 text-[11px]" onClick={() => setAppealFor(s)}>
                            Appeal
                          </Button>
                        )}
                        {s.status === "pending" && (
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            className="h-7 text-[11px] px-2"
                            title="Withdraw submission before review"
                            onClick={() => setDeleteTarget(s)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog
        open={submitOpen}
        onOpenChange={(o) => {
          setSubmitOpen(o);
          if (!o) {
            setPostUrlDraft("");
            setPendingPlatform(null);
            setConfirmSubmitOpen(false);
          }
        }}
      >
        <DialogContent className="sm:max-w-md [&>button]:hidden">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-[15px]">Submit Your Content</DialogTitle>
            <DialogDescription className="sr-only">
              Paste a post URL from a supported platform. Submitting joins this campaign.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label className="text-[12px]">Post URL</Label>
            <Textarea
              value={postUrlDraft}
              onChange={(e) => setPostUrlDraft(e.target.value)}
              placeholder="Paste your content URL here…"
              className="min-h-[108px] text-[13px] resize-none"
              onBlur={() => {
                const d = detectSocialPlatformFromUrl(postUrlDraft);
                setPendingPlatform(d);
              }}
            />
            <div className="flex gap-2 text-[11px] text-muted-foreground items-start pt-1">
              <Info className="h-4 w-4 shrink-0" />
              <span>Views after submission count toward earnings; submit as soon as you post.</span>
            </div>
          </div>
          <DialogFooter className="flex-col-reverse sm:flex-row gap-2 sm:justify-between">
            <Button type="button" variant="outline" size="sm" onClick={() => setSubmitOpen(false)}>
              Cancel
            </Button>
            <Button type="button" variant="destructive" size="sm" onClick={() => void handleSubmitIntent()}>
              Submit for review
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmSubmitOpen} onOpenChange={setConfirmSubmitOpen}>
        <DialogContent className="sm:max-w-md [&>button]:hidden">
          <DialogHeader>
            <DialogTitle className="text-[15px]">Confirm submission</DialogTitle>
            <DialogDescription className="text-[13px] text-left">
              Detected{" "}
              <span className="text-foreground font-medium">{pendingPlatform ? PLATFORM_LABEL[pendingPlatform] : "platform"}</span>{" "}
              from this URL. Proceed?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" size="sm" disabled={submitBusy} onClick={() => setConfirmSubmitOpen(false)}>
              Cancel
            </Button>
            <Button type="button" variant="destructive" size="sm" disabled={submitBusy} onClick={() => void finalizeSubmit()}>
              {submitBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this submission?</AlertDialogTitle>
            <AlertDialogDescription>
              This only works while the post is still pending review. You can submit a corrected link afterward.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteBusy}>Cancel</AlertDialogCancel>
            <Button
              type="button"
              variant="destructive"
              disabled={deleteBusy}
              className="h-9"
              onClick={() => void confirmDelete()}
            >
              {deleteBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
