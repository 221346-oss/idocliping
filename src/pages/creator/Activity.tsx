import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { CreatorShell, PageContainer, PageTitle, DetailHeader } from "@/components/shell/CreatorShell";
import { FilterPills, UnderlineTabs } from "@/components/ui-kit/Pills";
import { StatusChip, normalizeStatus } from "@/components/ui-kit/StatusChip";
import { RowListSkeleton, StatBlockSkeleton } from "@/components/ui-kit/Skeletons";
import { Film, Megaphone, ArrowLeft, Trash2, Loader2, Info, LayoutDashboard, TrendingUp, Clock, ChevronRight } from "lucide-react";
import { RowGroup, SubmissionRow, StatusIcon, PlatformGlyph } from "@/components/ui-kit/SubmissionRow";

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
  total_views?: number | null;

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
/** Derived campaign lifecycle state used by the Campaigns filter pills. */
function campaignPayoutState(status: string | null | undefined): "active" | "pending" | "paid" {
  const s = (status ?? "").toLowerCase();
  if (["completed", "ended", "paid", "paid_out"].includes(s)) return "paid";
  if (["paused", "pending", "draft"].includes(s)) return "pending";
  return "active";
}


export default function CreatorSubmissions() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { campaignId } = useParams();
  const navigate = useNavigate();
  const [rows, setRows] = useState<SubRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("campaigns");
  const [campFilter, setCampFilter] = useState("all");
  const [subFilter, setSubFilter] = useState("all");

  const missingAppealsWarned = useRef(false);

  const loadRows = useCallback(async () => {
    if (!user) return;
    // flips posts whose 6s processing window has passed to Eligible
    await supabase.rpc("promote_eligible_submissions" as any);
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

  // keep polling while a post is inside its 6s processing window
  useEffect(() => {
    const hasProcessing = rows.some((r: any) => r.status === "processing");
    if (!hasProcessing) return;
    const t = setInterval(() => void loadRows(), 3000);
    return () => clearInterval(t);
  }, [rows, loadRows]);



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

  const allSubmissions = rows;

  const filteredCampaignList = campaignList.filter(
    ({ campaign }) => campFilter === "all" || campaignPayoutState(campaign.status) === campFilter,
  );
  const filteredSubmissions = allSubmissions.filter(
    (s) => subFilter === "all" || normalizeStatus(s.status) === subFilter,
  );


  if (!isOverview && active) {
    return (
      <CreatorShell>
        <PageContainer>
          <DetailHeader title={active.campaign.title} onBack={() => navigate("/activity")} />
          <div className="animate-fade-in pb-4">
            <CampaignSubmissionsView
              active={active}
              payoutStatus={payoutStatus}
              earningsForCampaign={earningsForCampaign}
              onAppealSubmitted={loadRows}
              onReload={() => loadRows()}
            />
          </div>
        </PageContainer>
      </CreatorShell>
    );
  }

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
            <div className="surface-card grid grid-cols-3 divide-x divide-border/60 overflow-hidden">
              {[
                { label: "Total earned", value: `$${totalEarnings.toFixed(2)}`, accent: true },
                { label: "Campaigns", value: String(campaignList.length) },
                { label: "Submissions", value: String(allSubmissions.length) },
              ].map((s) => (
                <div key={s.label} className="min-w-0 px-3 py-4 text-center">
                  <div
                    className={cn(
                      "display-figure truncate text-[20px] leading-none",
                      s.accent && "text-primary",
                    )}
                  >
                    {s.value}
                  </div>
                  <div className="mt-1.5 truncate text-[12px] text-muted-foreground">{s.label}</div>
                </div>
              ))}
            </div>

            <UnderlineTabs
              className="mt-5"
              value={tab}
              onChange={setTab}
              options={[
                { value: "campaigns", label: "Campaigns", count: campaignList.length },
                { value: "submissions", label: "Submissions", count: allSubmissions.length },
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
                  { value: "processing", label: "Processing" },
                  { value: "ineligible", label: "Ineligible" },
                  { value: "eligible", label: "Eligible" },
                  { value: "paid", label: "Paid Out" },
                  { value: "rejected", label: "Rejected" },
                ]}
              />
            )}

            {tab === "campaigns" ? (
              <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                {filteredCampaignList.map(({ campaign, submissions }) => {
                  const earnings = earningsForCampaign(submissions);
                  const thumbnail = campaign.thumbnail_url || "/marketing-campaign-banner-fallback.svg";
                  const state = campaignPayoutState(campaign.status);
                  return (
                    <div key={campaign.id} className="surface-card p-3.5">
                      <div className="flex items-start gap-3">
                        <img
                          src={thumbnail}
                          alt=""
                          loading="lazy"
                          className="h-[68px] w-[68px] shrink-0 rounded-2xl object-cover"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start gap-2">
                            <h3 className="min-w-0 flex-1 truncate font-display text-[15px] font-semibold">
                              {campaign.title}
                            </h3>
                            <StatusChip
                              size="sm"
                              status={state === "paid" ? "paid" : state === "pending" ? "pending" : "active"}
                              label={state === "paid" ? "Paid Out" : state === "pending" ? "Pending" : "Active"}
                            />
                          </div>
                          <div className="mt-2 flex items-baseline gap-1.5">
                            <span className="display-figure text-[18px] text-primary">
                              ${earnings.toFixed(2)}
                            </span>
                            <span className="text-[11.5px] text-muted-foreground">earned</span>
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => navigate(`/activity/${campaign.id}`)}
                        className="btn-outline-pill mt-3 h-10 w-full justify-between px-4 text-[13px]"
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
  const [appealProof, setAppealProof] = useState<File | null>(null);


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

    let proofUrl: string | null = null;
    if (appealProof) {
      const ext = appealProof.name.split(".").pop()?.toLowerCase() || "bin";
      const path = `${user.id}/${appealFor.id}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("appeal-proof").upload(path, appealProof, {
        upsert: true,
        contentType: appealProof.type || undefined,
      });
      if (upErr) {
        setAppealSending(false);
        return toast({ title: "Upload failed", description: upErr.message, variant: "destructive" });
      }
      proofUrl = path;
    }

    const { error } = await supabase.from("submission_appeals").insert({
      submission_id: appealFor.id,
      creator_id: user.id,
      message: appealText.trim(),
      proof_url: proofUrl,
    });
    setAppealSending(false);
    if (error) {
      return toast({
        title: "Appeal not sent",
        description: error.message?.includes("duplicate")
          ? "You've already appealed this submission — only one appeal is allowed per post."
          : error.message,
        variant: "destructive",
      });
    }
    toast({ title: "Appeal submitted", description: "An admin will review your request." });
    setAppealFor(null);
    setAppealText("");
    setAppealProof(null);
    await onAppealSubmitted();
  };

  /** Only one appeal per submission is allowed, ever. */
  const hasAppeal = (s: SubRow) => (s.submission_appeals ?? []).length > 0;
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
        Earnings credit to your <Link to="/wallet" className="underline">Wallet</Link>.
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

      {/* Mobile: row cards. Desktop (md+): the richer table. */}
      <section className="space-y-2">
        <h3 className="px-1 font-display text-[15px] font-semibold">Posts ({submissions.length})</h3>

        <div className="surface-card divide-y divide-border/60 overflow-hidden md:hidden">
          {submissions.length === 0 ? (
            <div className="px-4 py-10 text-center text-[13px] text-muted-foreground">
              Your activity will show up here once you submit content.
            </div>
          ) : (
            submissions.map((s) => {
              const earned = (s.earnings ?? []).reduce((a, e) => a + Number(e.amount), 0);
              const note = latestAppealNote(s);
              return (
                <div key={s.id} className="px-4 py-3.5">
                  <button
                    type="button"
                    onClick={() => navigate(`/submissions/${s.id}`)}
                    className="focus-ring flex w-full items-center gap-3 text-left"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-raised text-primary">
                      <Film className="h-[18px] w-[18px]" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14.5px] font-semibold">
                        {PLATFORM_LABEL[s.platform] ?? s.platform}
                      </span>
                      <span className="mt-0.5 block truncate text-[12.5px] text-muted-foreground">
                        {Number(s.manual_views).toLocaleString()} views ·{" "}
                        {new Date(s.created_at).toLocaleDateString()}
                      </span>
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="display-figure block text-[15px] tabular-nums">${earned.toFixed(2)}</span>
                      <span className="mt-1 block">
                        <StatusChip status={normalizeStatus(s.status)} size="sm" />
                      </span>
                    </span>
                  </button>

                  {s.status === "rejected" && s.reject_reason && (
                    <p className="mt-2 text-[12px] leading-snug text-destructive">Reason: {s.reject_reason}</p>
                  )}
                  {note && (
                    <p className="mt-2 text-[12px] leading-snug text-muted-foreground">
                      Admin (appeal): {note.admin_note}
                    </p>
                  )}
                  {pendingAppeal(s) && <p className="mt-1 text-[12px] text-warning">Appeal pending review.</p>}

                  <div className="mt-2.5 flex flex-wrap items-center gap-2">
                    <a
                      href={s.post_url}
                      target="_blank"
                      rel="noreferrer"
                      className="btn-outline-pill h-9 px-4 text-[13px]"
                    >
                      Open post
                    </a>
                    {s.status === "rejected" && !pendingAppeal(s) && (
                      <button type="button" onClick={() => setAppealFor(s)} className="btn-outline-pill h-9 px-4 text-[13px]">
                        Appeal
                      </button>
                    )}
                    {s.status === "pending" && (
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(s)}
                        className="btn-outline-pill h-9 px-4 text-[13px] border-destructive/40 text-destructive"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="hidden overflow-hidden rounded-md border border-border bg-card md:block">
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead className="bg-muted/30 text-[11px] uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="p-3 text-left">Platform</th>
                  <th className="p-3 text-left">URL</th>
                  <th className="p-3 text-right">Views</th>
                  <th className="p-3 text-right">Earned</th>
                  <th className="p-3 text-left">Status</th>
                  <th className="w-[112px] p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {submissions.map((s) => {
                  const earned = (s.earnings ?? []).reduce((a, e) => a + Number(e.amount), 0);
                  const note = latestAppealNote(s);
                  return (
                    <tr key={s.id} className="border-t border-border align-top transition-colors hover:bg-muted/5">
                      <td className="p-3 capitalize">{s.platform}</td>
                      <td className="max-w-[280px] p-3">
                        <a href={s.post_url} target="_blank" rel="noreferrer" className="block truncate underline">
                          {s.post_url}
                        </a>
                        {s.status === "rejected" && s.reject_reason && (
                          <p className="mt-1.5 text-[11px] leading-snug text-destructive">Reason: {s.reject_reason}</p>
                        )}
                        {note && (
                          <p className="mt-1.5 text-[11px] leading-snug text-muted-foreground">
                            Admin (appeal): {note.admin_note}
                          </p>
                        )}
                        {pendingAppeal(s) && <p className="mt-1 text-[11px] text-warning">Appeal pending review.</p>}
                      </td>
                      <td className="p-3 text-right">{Number(s.manual_views).toLocaleString()}</td>
                      <td className="p-3 text-right">${earned.toFixed(2)}</td>
                      <td className="p-3">
                        <StatusChip status={normalizeStatus(s.status)} size="sm" />
                      </td>
                      <td className="space-x-1 p-3 text-right">
                        <div className="inline-flex flex-wrap justify-end gap-1">
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
                              className="h-7 px-2 text-[11px]"
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
      </section>


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
