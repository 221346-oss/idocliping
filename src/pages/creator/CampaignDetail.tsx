import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { CreatorShell, PageContainer, DetailHeader } from "@/components/shell/CreatorShell";
import { UnderlineTabs } from "@/components/ui-kit/Pills";
import { ProgressRate, DataRow, ListSection, StatTrio } from "@/components/ui-kit/DataBits";
import { RowGroup, SubmissionRow } from "@/components/ui-kit/SubmissionRow";

import { StatusChip } from "@/components/ui-kit/StatusChip";
import { PlatformRow, PLATFORM_GLYPHS, type PlatformKey } from "@/components/brand/icons/NavGlyphs";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { RowListSkeleton, StatBlockSkeleton } from "@/components/ui-kit/Skeletons";

import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Check,
  ChevronRight,
  ExternalLink,
  Info,
  Loader2,
  Repeat2,
  Share2,
  Medal,

  SearchX,
  Trophy,
  X,
  Music,
} from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { cn } from "@/lib/utils";
import { detectSocialPlatformFromUrl } from "@/lib/detect-post-platform";

const submitSchema = z.object({
  platform: z.enum(["tiktok", "instagram", "youtube", "x"]),
  post_url: z.string().trim().url("Must be a valid URL").max(500),
});

type LeaderboardRow = {
  creatorId: string;
  creatorLabel: string;
  submissions: number;
  earned: number;
};

const PLATFORM_LABEL: Record<string, string> = {
  tiktok: "TikTok",
  instagram: "Instagram",
  youtube: "YouTube",
  x: "X",
};

function formatCurrency(value: number) {
  if (!Number.isFinite(value)) return "—";
  return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function normalizeStringArray(value: unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.map((v) => String(v)).map((s) => s.trim()).filter(Boolean);
  if (typeof value === "string") {
    return value
      .split(/\n|,/g)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}

function normalizeUrlList(value: unknown): string[] {
  const list = normalizeStringArray(value);
  return list.filter((u) => /^https?:\/\//i.test(u));
}

/** "basitmemon" -> "b***n" — never expose a full handle on a public leaderboard. */
function maskCreatorName(handle: string | null | undefined) {
  const raw = (handle ?? "").trim().replace(/^@/, "");
  if (!raw) return "u***r";
  if (raw.length === 1) return `${raw}***`;
  return `${raw[0]}***${raw[raw.length - 1]}`;
}


function getFirstDefinedNumber(campaign: any, keys: string[]): number | null {
  for (const k of keys) {
    const v = campaign?.[k];
    if (v === null || v === undefined || v === "") continue;
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function getCampaignCommunityLink(campaign: any): string | null {
  const candidates = ["community_link", "discord_link", "discord_url", "community_url", "discordInvite", "discordInviteUrl"];
  for (const k of candidates) {
    const v = campaign?.[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return null;
}

async function getAppSettingValue(key: string): Promise<string | null> {
  const { data } = await (supabase as any).from("app_settings").select("value").eq("key", key).maybeSingle();
  if (!data) return null;
  const value = data.value;
  return value === null || value === undefined ? null : String(value);
}

async function getCommunityLinkFromAppSettings(): Promise<string | null> {
  const candidates = ["community_link", "discord_link", "discord_url", "community_url"];
  for (const k of candidates) {
    const v = await getAppSettingValue(k);
    if (v) return v;
  }
  return null;
}

export default function CreatorCampaignDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [campaign, setCampaign] = useState<any>(null);
  const [joined, setJoined] = useState(false);
  const [loading, setLoading] = useState(true);

  const [communityLink, setCommunityLink] = useState<string | null>(null);

  const [postUrl, setPostUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitModalOpen, setSubmitModalOpen] = useState(false);
  const [confirmSubmitOpen, setConfirmSubmitOpen] = useState(false);
  const [pendingSubmitPayload, setPendingSubmitPayload] = useState<z.infer<typeof submitSchema> | null>(null);

  const [leaderboard, setLeaderboard] = useState<LeaderboardRow[]>([]);
  const [mySubs, setMySubs] = useState<any[]>([]);
  const [connectedPlatforms, setConnectedPlatforms] = useState<string[]>([]);
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get("tab") ?? "details";
  const setTab = (v: string) => setSearchParams(v === "details" ? {} : { tab: v }, { replace: true });

  const [appealFor, setAppealFor] = useState<any | null>(null);
  const [appealMessage, setAppealMessage] = useState("");
  const [appealFile, setAppealFile] = useState<File | null>(null);
  const [appealSubmitting, setAppealSubmitting] = useState(false);


  const supportedPlatforms = useMemo(() => (campaign?.platforms ?? []) as string[], [campaign]);
  const ratePerMillion = Number(campaign?.payout_per_1m_views ?? 0);
  const totalBudget = Number(campaign?.budget_total ?? 0);
  const remainingBudget = Number(campaign?.budget_remaining ?? 0);

  const usedBudget = Math.max(0, totalBudget - remainingBudget);
  const usedPct = totalBudget > 0 ? Math.min(100, Math.round((usedBudget / totalBudget) * 100)) : 0;

  const soundRows = useMemo(() => {
    const raw = campaign?.sounds ?? campaign?.available_sounds ?? campaign?.sound_list ?? [];
    const arr = Array.isArray(raw) ? raw : [];
    return arr
      .map((s: any) => {
        const name = s?.sound_name ?? s?.name ?? s?.sound ?? s?.title ?? "";
        const artist = s?.artist_name ?? s?.artist ?? s?.performer ?? "";
        const url = s?.url ?? s?.link ?? s?.external_url ?? s?.href ?? null;
        return { name, artist, url };
      })
      .filter((r: any) => r.name && r.url);
  }, [campaign]);

  const allowedNichesPages = useMemo(() => {
    return normalizeStringArray(
      campaign?.allowed_niches_pages ?? campaign?.allowed_niches ?? campaign?.allowed_pages ?? campaign?.allowed_categories ?? [],
    );
  }, [campaign]);

  const notAllowedList = useMemo(() => {
    return normalizeStringArray(
      campaign?.not_allowed ?? campaign?.not_allowed_niches ?? campaign?.disallowed ?? campaign?.not_allowed_pages ?? [],
    );
  }, [campaign]);

  const contentRequirements = useMemo(() => {
    const v =
      campaign?.content_requirements ??
      campaign?.content_requirements_text ??
      campaign?.contentRequirements ??
      campaign?.requirements_text ??
      "";
    return typeof v === "string" ? v : "";
  }, [campaign]);

  const songLink = useMemo(() => {
    const v = campaign?.song_link ?? campaign?.song_url ?? campaign?.songUrl ?? campaign?.track_link ?? "";
    return typeof v === "string" && v.trim() ? v.trim() : null;
  }, [campaign]);

  const exampleAds = useMemo(() => {
    return normalizeUrlList(campaign?.example_ads ?? campaign?.example_ads_urls ?? campaign?.exampleAds ?? []);
  }, [campaign]);

  const requirementsChecklist = useMemo(() => {
    const checklistRaw = campaign?.requirements ?? campaign?.requirements_checklist ?? null;
    if (Array.isArray(checklistRaw) && checklistRaw.length) {
      return checklistRaw
        .map((r: any) => {
          if (typeof r === "string") return { text: r, allowed: true };
          const text = r?.text ?? r?.requirement_text ?? r?.rule_text ?? r?.label ?? "";
          const allowed =
            r?.allowed ?? r?.is_allowed ?? r?.accepted ?? r?.can_use ?? (r?.type === "allowed" ? true : undefined);
          if (!text) return null;
          return { text, allowed: allowed === undefined ? true : !!allowed };
        })
        .filter(Boolean) as { text: string; allowed: boolean }[];
    }

    const allowedArr = normalizeStringArray(campaign?.requirements_allowed ?? campaign?.allowed_requirements ?? campaign?.allowed_requirements_list ?? []);
    const notAllowedArr = normalizeStringArray(campaign?.requirements_not_allowed ?? campaign?.not_allowed_requirements ?? campaign?.not_allowed_requirements_list ?? []);
    const allowedItems = allowedArr.map((t) => ({ text: t, allowed: true }));
    const notAllowedItems = notAllowedArr.map((t) => ({ text: t, allowed: false }));
    return [...allowedItems, ...notAllowedItems];
  }, [campaign]);

  const leaderboardEmpty = leaderboard.length === 0;

  const load = async () => {
    if (!id || !user) return;
    setLoading(true);

    try {
      const [{ data: c }, { data: p }] = await Promise.all([
        supabase.from("campaigns").select("*, brands(name)").eq("id", id).single(),
        supabase
          .from("campaign_participants")
          .select("id")
          .eq("campaign_id", id)
          .eq("creator_id", user.id)
          .maybeSingle(),
      ]);

      if (!c) {
        setCampaign(null);
        setJoined(false);
        setLeaderboard([]);
        setLoading(false);
        return;
      }

      const participantJoined = !!p;
      let campaignCommunity = getCampaignCommunityLink(c);
      if (!campaignCommunity) campaignCommunity = await getCommunityLinkFromAppSettings();
      setCampaign(c);
      setJoined(participantJoined);
      setCommunityLink(campaignCommunity);

      // My submissions for this campaign + my connected social accounts.
      const [{ data: mine }, { data: socials }] = await Promise.all([
        supabase
          .from("submissions")
          .select(
            "id, platform, post_url, status, reject_reason, manual_views, total_views, created_at, earnings(amount), submission_appeals(id, status)",
          )
          .eq("campaign_id", id)
          .eq("creator_id", user.id)
          .order("created_at", { ascending: false }),
        supabase.from("social_accounts").select("platform, verified, verification_status").eq("user_id", user.id),
      ]);
      setMySubs((mine ?? []) as any[]);
      setConnectedPlatforms(
        ((socials ?? []) as any[])
          .filter((s) => s.verified === true || s.verification_status === "verified")
          .map((s) => String(s.platform).toLowerCase()),
      );



      // Leaderboard: approved submissions + earnings of type "campaign".
      const { data: subs } = await (supabase as any)
        .from("public_submissions")
        .select("id, creator_id, status")
        .eq("campaign_id", id)
        .order("created_at", { ascending: false });

      const approvedSubs = (subs ?? []) as any[];
      const submissionIds = approvedSubs.map((s) => s.id);

      if (!submissionIds.length) {
        setLeaderboard([]);
        return;
      }

      const creatorIds = Array.from(new Set(approvedSubs.map((s) => s.creator_id)));
      const { data: earnings } = await (supabase as any)
        .from("public_campaign_creator_earnings")
        .select("creator_id, amount")
        .eq("campaign_id", id);

      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, profile_slug")
        .in("user_id", creatorIds);


      const subCountByCreator = new Map<string, number>();
      for (const s of approvedSubs) subCountByCreator.set(s.creator_id, (subCountByCreator.get(s.creator_id) ?? 0) + 1);

      const earnedByCreator = new Map<string, number>();
      for (const e of (earnings ?? []) as any[]) {
        earnedByCreator.set(e.creator_id, (earnedByCreator.get(e.creator_id) ?? 0) + Number(e.amount ?? 0));
      }

      const profileByUserId = new Map(
        (profiles ?? []).map((p: any) => [p.user_id, (p.profile_slug || p.full_name) as string | null] as const),
      );

      const rows: LeaderboardRow[] = creatorIds.map((creatorId) => {
        const handle = profileByUserId.get(creatorId) ?? null;
        return {
          creatorId,
          creatorLabel: maskCreatorName(handle),
          submissions: subCountByCreator.get(creatorId) ?? 0,
          earned: earnedByCreator.get(creatorId) ?? 0,
        };
      });


      rows.sort((a, b) => (b.earned - a.earned) || (b.submissions - a.submissions) || a.creatorId.localeCompare(b.creatorId));

      setLeaderboard(rows);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!id || !user) return;
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, user]);

  const parsedPostPayload = (): z.infer<typeof submitSchema> | null => {
    const detected = detectSocialPlatformFromUrl(postUrl);
    if (!detected) {
      toast({ title: "Could not detect platform", description: "Use a TikTok, Instagram, YouTube, or X post URL.", variant: "destructive" });
      return null;
    }
    if (supportedPlatforms.length && !supportedPlatforms.some((p) => String(p).toLowerCase() === detected)) {
      toast({
        title: "Platform not accepted",
        description: `This campaign does not accept ${PLATFORM_LABEL[detected] ?? detected} posts.`,
        variant: "destructive",
      });
      return null;
    }
    if (!connectedPlatforms.includes(detected)) {
      toast({
        title: `Verify your ${PLATFORM_LABEL[detected] ?? detected} account`,
        description: "Submissions are only accepted from a connected and verified account.",
        variant: "destructive",
      });
      return null;
    }
    const parsed = submitSchema.safeParse({ platform: detected, post_url: postUrl.trim() });

    if (!parsed.success) {
      toast({ title: "Invalid URL", description: parsed.error.issues[0]?.message ?? "Check the link.", variant: "destructive" });
      return null;
    }
    return parsed.data;
  };

  /** Step 1: open confirmation after URL + detected platform checks */
  const handleSubmitIntent = () => {
    if (!user || !id) return;
    const ok = parsedPostPayload();
    if (!ok) return;
    setPendingSubmitPayload(ok);
    setConfirmSubmitOpen(true);
  };

  /** Step 2: persist after modal confirm */
  const finalizeSubmitPost = async () => {
    if (!user || !id || !pendingSubmitPayload) return;

    setSubmitting(true);
    try {
      if (!joined) {
        await supabase.from("campaign_participants").insert({ campaign_id: id, creator_id: user.id });
        setJoined(true);
      }

      const { error } = await supabase.from("submissions").insert({
        campaign_id: id,
        creator_id: user.id,
        platform: pendingSubmitPayload.platform,
        post_url: pendingSubmitPayload.post_url,
      });

      if (error) throw error;

      setConfirmSubmitOpen(false);
      setPendingSubmitPayload(null);
      setSubmitModalOpen(false);
      setPostUrl("");
      toast({ title: "Submitted!", description: "Processing — your post turns Eligible in a few seconds." });
      navigate(`/activity/${id}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Try again";
      toast({ title: "Submission failed", description: msg, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <CreatorShell>
        <PageContainer>
          <DetailHeader title="Campaign" />
          <div className="space-y-4">
            <div className="skeleton-shimmer h-44 w-full rounded-[20px]" />
            <StatBlockSkeleton />
            <RowListSkeleton count={4} />
          </div>
        </PageContainer>
      </CreatorShell>
    );
  }

  if (!campaign) {
    return (
      <CreatorShell>
        <PageContainer>
          <DetailHeader title="Campaign" />
          <div className="surface-card">
            <EmptyState
              icon={SearchX}
              title="Campaign not found"
              description="This campaign may have ended or been removed."
              actionLabel="Back to Explore"
              actionTo="/discover"
            />
          </div>
        </PageContainer>
      </CreatorShell>
    );
  }

  const heroImage =
    typeof campaign.thumbnail_url === "string" && campaign.thumbnail_url.trim()
      ? campaign.thumbnail_url.trim()
      : "/marketing-campaign-banner-fallback.svg";

  const fmtViews = (n: number) =>
    n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1_000 ? `${(n / 1_000).toFixed(1)}K` : String(n);

  const dash = (v: unknown) => (v === null || v === undefined || v === "" ? "—" : String(v));

  const myEarned = mySubs.reduce(
    (a, s) => a + ((s.earnings ?? []) as any[]).reduce((x, e) => x + Number(e.amount ?? 0), 0),
    0,
  );
  const myViews = mySubs.reduce((a, s) => a + Number(s.manual_views ?? 0), 0);
  const myRejected = mySubs.filter((s) => s.status === "rejected").length;

  /** A titled block separated from its neighbours by a hairline. */
  const Section = ({ title, children }: { title?: string; children: React.ReactNode }) => (
    <section className="space-y-3 border-t border-border/60 pt-5 first:border-0 first:pt-0">
      {title && <h2 className="font-display text-[15px] font-semibold">{title}</h2>}
      {children}
    </section>
  );

  const shareCampaign = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: campaign.title, url });
      else {
        await navigator.clipboard.writeText(url);
        toast({ title: "Link copied" });
      }
    } catch {
      /* dismissed */
    }
  };

  return (
    <CreatorShell>
      <PageContainer>
        <DetailHeader
          title="Campaign Details"
          onBack={() => navigate("/discover")}
          action={
            <button type="button" onClick={() => void shareCampaign()} aria-label="Share campaign" className="icon-pill h-10 w-10">
              <Share2 className="h-[18px] w-[18px]" />
            </button>
          }
        />

        {/* Campaign identity */}
        <div className="surface-card flex items-start gap-3.5 p-4">
          <img
            src={heroImage}
            alt=""
            className="h-[72px] w-[72px] shrink-0 rounded-2xl border border-border object-cover"
          />
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-[18px] font-semibold leading-snug">{campaign.title}</h1>
            {campaign.category && (
              <div className="mt-1 text-[12.5px] font-semibold capitalize text-primary">{campaign.category}</div>
            )}
            {joined && (
              <span className="status-pill mt-2 border-primary/35 bg-primary/[0.14] text-primary">
                <Check className="h-3.5 w-3.5" /> Joined
              </span>
            )}
          </div>
        </div>

        {/* Tabs */}
        <UnderlineTabs
          className="mt-5"
          value={tab}
          onChange={setTab}
          options={[
            { value: "details", label: "Details" },
            { value: "activity", label: "Activity", count: mySubs.length || undefined },
            { value: "leaderboard", label: "Leaderboard" },
          ]}
        />

        <div className="mt-5 space-y-5">
          {tab === "details" && (
            <>
              <Section>
                <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  <span>Paid out</span>
                  <span>Rate</span>
                </div>
                <ProgressRate
                  percent={usedPct}
                  totalLabel={`$${totalBudget.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
                  rateLabel={formatCurrency(ratePerMillion)}
                />
              </Section>

              <Section>
                <div className="divide-y divide-border/50">
                  <DataRow
                    label="Platforms"
                    value={
                      supportedPlatforms.length ? (
                        <PlatformRow platforms={supportedPlatforms} size={17} className="justify-end" />
                      ) : (
                        "—"
                      )
                    }
                  />
                  <DataRow
                    label="Cap per Post"
                    value={(() => {
                      const n = getFirstDefinedNumber(campaign, ["max_earnings_per_post"]);
                      return n === null ? "—" : formatCurrency(n);
                    })()}
                  />
                  <DataRow
                    label="Cap per Profile"
                    value={(() => {
                      const n = getFirstDefinedNumber(campaign, ["max_earnings_per_creator"]);
                      return n === null ? "—" : formatCurrency(n);
                    })()}
                  />
                  <DataRow label="Min. Duration" value={dash(campaign.min_duration ?? null)} />
                </div>
              </Section>

              {(campaign.description || campaign.instructions) && (
                <Section title="About">
                  <p className="whitespace-pre-wrap text-[14px] leading-relaxed text-muted-foreground">
                    {campaign.description || campaign.instructions}
                  </p>
                </Section>
              )}

              <Section title="Requirements">
                <p className="text-[13.5px] leading-snug text-muted-foreground">
                  Your account audience must match this campaign. Submissions from accounts that don't fit the
                  requirements below will not be eligible for payout.
                </p>

                {contentRequirements && (
                  <p className="whitespace-pre-wrap text-[14px] leading-relaxed text-muted-foreground">
                    {contentRequirements}
                  </p>
                )}

                <div className="space-y-2.5">
                  {[
                    ...allowedNichesPages.map((t) => ({ text: t, allowed: true })),
                    ...requirementsChecklist,
                    ...notAllowedList.map((t) => ({ text: t, allowed: false })),
                  ].map((req, idx) => (
                    <div key={`${req.text}-${idx}`} className="flex items-start gap-2.5 text-[14px] leading-snug">
                      {req.allowed ? (
                        <Check className="mt-0.5 h-[17px] w-[17px] shrink-0 text-primary" />
                      ) : (
                        <X className="mt-0.5 h-[17px] w-[17px] shrink-0 text-destructive" />
                      )}
                      <span className="text-muted-foreground">{req.text}</span>
                    </div>
                  ))}
                  {allowedNichesPages.length + requirementsChecklist.length + notAllowedList.length === 0 && (
                    <div className="text-[14px] text-muted-foreground">—</div>
                  )}
                </div>

                {communityLink && (
                  <a href={communityLink} target="_blank" rel="noreferrer" className="btn-outline-pill mt-1">
                    Campaign Discord
                  </a>
                )}
              </Section>

              {(exampleAds.length > 0 || songLink) && (
                <Section title={`Examples (${exampleAds.length + (songLink ? 1 : 0)})`}>
                  <div className="space-y-2">
                    {songLink && (
                      <a
                        href={songLink}
                        target="_blank"
                        rel="noreferrer"
                        className="press-row focus-ring surface-inset flex items-center gap-3 px-4 py-3"
                      >
                        <Music className="h-[17px] w-[17px] shrink-0 text-primary" />
                        <span className="min-w-0 flex-1 truncate text-[14px]">Song link</span>
                        <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground" />
                      </a>
                    )}
                    {exampleAds.map((url, idx) => (
                      <a
                        key={`${url}-${idx}`}
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        className="press-row focus-ring surface-inset flex items-center gap-3 px-4 py-3"
                      >
                        <span className="min-w-0 flex-1 truncate text-[14px]">Example {idx + 1}</span>
                        <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground" />
                      </a>
                    ))}
                  </div>
                </Section>
              )}

              {soundRows.length > 0 && (
                <Section title={`Available sounds (${soundRows.length})`}>
                  <div className="space-y-2">
                    {soundRows.map((s: { name: string; artist: string; url: string }, idx: number) => (
                      <a
                        key={`${s.name}-${idx}`}
                        href={s.url}
                        target="_blank"
                        rel="noreferrer"
                        className="press-row focus-ring surface-inset flex items-center gap-3 px-4 py-3"
                      >
                        <Music className="h-[17px] w-[17px] shrink-0 text-primary" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[14px] font-semibold">{s.name}</span>
                          <span className="block truncate text-[12.5px] text-muted-foreground">
                            {s.artist || "Unknown artist"}
                          </span>
                        </span>
                        <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground" />
                      </a>
                    ))}
                  </div>
                </Section>
              )}

              <Section title="Campaign parameters">
                <div className="divide-y divide-border/50">
                  <DataRow
                    label="Max Submissions per Social Account"
                    value={dash(getFirstDefinedNumber(campaign, ["max_submissions_per_account"]))}
                  />
                  <DataRow
                    label="Max Submissions per Day per Social Account"
                    value={dash(getFirstDefinedNumber(campaign, ["max_submissions_per_day"]))}
                  />
                  <DataRow
                    label="Min Followers per Social Account"
                    value={dash(getFirstDefinedNumber(campaign, ["min_followers"]))}
                  />
                  <DataRow
                    label="Min Views for Earnings"
                    value={dash(getFirstDefinedNumber(campaign, ["min_views_for_earnings"]))}
                  />
                  <DataRow
                    label="Min Engagement Rate"
                    value={dash(getFirstDefinedNumber(campaign, ["min_engagement_rate"]))}
                  />
                </div>
                <p className="text-[12.5px] leading-snug text-muted-foreground">
                  Submissions that break these parameters, use bought engagement or re-upload other creators' work are
                  removed and are not paid out.
                </p>
              </Section>
            </>
          )}

          {tab === "activity" &&
            (mySubs.length === 0 ? (
              <div className="surface-card">
                <EmptyState
                  icon={Info}
                  title="No activity yet"
                  description="Your activity will show up here once you submit content."
                />
              </div>
            ) : (
              <>
                <div className="surface-card p-5">
                  <div className="text-[12.5px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Your earnings
                  </div>
                  <div className="display-figure mt-1.5 text-[32px] leading-none text-primary">
                    {formatCurrency(myEarned)}
                  </div>
                  <div className="mt-5 border-t border-border/60 pt-4">
                    <StatTrio
                      items={[
                        { value: mySubs.length, label: "Submissions" },
                        { value: fmtViews(myViews), label: "Total Views" },
                        { value: myRejected, label: "Rejected" },
                      ]}
                    />
                  </div>
                </div>

                <RowGroup>
                  {mySubs.map((s) => (
                    <SubmissionRow
                      key={s.id}
                      to={`/submissions/${s.id}`}
                      compact
                      title=""
                      platform={String(s.platform)}
                      status={String(s.status)}
                      views={Number((s as any).total_views ?? s.manual_views ?? 0)}
                      amount={((s.earnings ?? []) as any[]).reduce((x, e) => x + Number(e.amount ?? 0), 0)}
                      createdAt={s.created_at}
                    />
                  ))}
                </RowGroup>

              </>
            ))}

          {tab === "leaderboard" &&
            (leaderboardEmpty ? (
              <div className="surface-card">
                <EmptyState
                  icon={Trophy}
                  title="No submissions yet"
                  description="Be the first creator to post for this campaign."
                />
              </div>
            ) : (
              <div className="surface-card divide-y divide-border/60 overflow-hidden">
                {leaderboard.slice(0, 25).map((row, idx) => {
                  const rank = idx + 1;
                  return (
                    <div key={row.creatorId} className="flex items-center gap-3 px-4 py-3.5">
                      <span
                        className={cn(
                          "display-figure flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-[14px]",
                          rank <= 3
                            ? "border-primary/35 bg-primary/[0.14] text-primary"
                            : "border-border bg-surface-raised text-muted-foreground",
                        )}
                      >
                        {rank <= 3 ? <Medal className="h-[18px] w-[18px]" /> : rank}
                      </span>
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-raised text-[13px] font-semibold uppercase text-muted-foreground">
                        {row.creatorLabel[0]}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[14.5px] font-semibold">{row.creatorLabel}</div>
                        <div className="flex items-center gap-1 text-[12.5px] text-muted-foreground">
                          <Repeat2 className="h-3.5 w-3.5" />
                          {row.submissions} clip{row.submissions === 1 ? "" : "s"}
                        </div>
                      </div>
                      <div className="display-figure text-[15px] tabular-nums">{formatCurrency(row.earned)}</div>
                    </div>
                  );
                })}
              </div>
            ))}
        </div>

        {/* Sticky submit bar */}
        <div className="sticky-action-bar mt-6">
          <div className="mx-auto flex max-w-[1400px] items-center gap-3">
            <div className="hidden min-w-0 flex-1 md:block">
              <div className="text-[12.5px] text-muted-foreground">Rate per 1M views</div>
              <div className="display-figure text-[18px] text-primary">{formatCurrency(ratePerMillion)}</div>
            </div>
            <button
              type="button"
              onClick={() => {
                setPostUrl("");
                setSubmitModalOpen(true);
              }}
              className="btn-primary-pill md:w-auto md:px-8"
            >
              Submit Content
            </button>
          </div>
        </div>
      </PageContainer>

      {/* Submit sheet */}
      <Sheet
        open={submitModalOpen}
        onOpenChange={(open) => {
          setSubmitModalOpen(open);
          if (!open) {
            setPostUrl("");
            setConfirmSubmitOpen(false);
          }
        }}
      >
        <SheetContent side="bottom" className="rounded-t-[28px] border-border bg-surface pb-8">
          <SheetHeader className="text-left">
            <SheetTitle className="font-display text-[20px]">Submit Content</SheetTitle>
          </SheetHeader>
          <p className="mt-1 text-[13.5px] text-muted-foreground">
            Carefully review requirements before your submission.
          </p>

          <div className="mt-5 space-y-3">
            <input
              value={postUrl}
              onChange={(e) => setPostUrl(e.target.value)}
              placeholder="Paste your post link…"
              inputMode="url"
              aria-label="Post link"
              maxLength={500}
              className="focus-ring h-12 w-full rounded-full border border-border bg-surface-raised px-4 text-[15px] text-foreground placeholder:text-muted-foreground"
            />
            <div className="flex items-start gap-2 text-[12.5px] text-muted-foreground">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span>
                We detect the platform from your link. It must be accepted by this campaign and connected to your
                profile.
              </span>
            </div>
            <button
              type="button"
              className="btn-primary-pill"
              disabled={submitting || !postUrl.trim()}
              onClick={() => handleSubmitIntent()}
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Send
            </button>
          </div>
        </SheetContent>
      </Sheet>

      <Dialog
        open={confirmSubmitOpen}
        onOpenChange={(open) => {
          setConfirmSubmitOpen(open);
          if (!open) setPendingSubmitPayload(null);
        }}
      >
        <DialogContent className="rounded-3xl sm:max-w-md">
          <DialogHeader className="text-left">
            <DialogTitle className="font-display text-[18px]">Confirm submission</DialogTitle>
            <DialogDescription className="pt-2 text-[13.5px]">
              Detected{" "}
              <span className="font-medium text-foreground">
                {pendingSubmitPayload?.platform ? PLATFORM_LABEL[pendingSubmitPayload.platform] : "—"}
              </span>{" "}
              from this URL. Proceed?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col-reverse gap-2 sm:flex-row">
            <button type="button" className="btn-outline-pill" onClick={() => setConfirmSubmitOpen(false)}>
              Cancel
            </button>
            <button
              type="button"
              className="btn-primary-pill"
              disabled={submitting}
              onClick={() => void finalizeSubmitPost()}
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Submit
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </CreatorShell>
  );
}

