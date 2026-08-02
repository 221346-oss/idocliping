import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
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
  ExternalLink,
  Info,
  Loader2,
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

function maskCreatorName(fullName: string | null | undefined) {
  const parts = (fullName ?? "").trim().split(/\s+/).filter(Boolean);
  const first = parts[0] ?? "User";
  const c0 = first[0]?.toUpperCase() ?? "U";
  return `${c0}••••`;
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
        .select("user_id, full_name")
        .in("user_id", creatorIds);

      const subCountByCreator = new Map<string, number>();
      for (const s of approvedSubs) subCountByCreator.set(s.creator_id, (subCountByCreator.get(s.creator_id) ?? 0) + 1);

      const earnedByCreator = new Map<string, number>();
      for (const e of (earnings ?? []) as any[]) {
        earnedByCreator.set(e.creator_id, (earnedByCreator.get(e.creator_id) ?? 0) + Number(e.amount ?? 0));
      }

      const profileByUserId = new Map((profiles ?? []).map((p: any) => [p.user_id, p.full_name] as const));

      const rows: LeaderboardRow[] = creatorIds.map((creatorId) => {
        const fullName = profileByUserId.get(creatorId) ?? null;
        return {
          creatorId,
          creatorLabel: maskCreatorName(fullName),
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
      toast({ title: "Submitted!", description: "Admin will verify your post shortly." });
      navigate(`/creator/submissions/${id}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Try again";
      toast({ title: "Submission failed", description: msg, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const CreatorCampaignDetailSkeleton = () => (
    <div className="p-6 space-y-6">
      <Skeleton className="h-52 w-full rounded-lg" />

      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-1 flex flex-col lg:flex-row gap-6">
          <div className="w-full lg:flex-[0_0_65%] space-y-4 order-2 lg:order-1">
            <div className="border border-border bg-card rounded-md p-4">
              <Skeleton className="h-4 w-24 mb-3" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-5/6 mt-2" />
            </div>
            <div className="border border-border bg-card rounded-md p-4">
              <Skeleton className="h-4 w-24 mb-3" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-2/3 mt-2" />
            </div>
            <div className="border border-border bg-card rounded-md p-4 space-y-3">
              <Skeleton className="h-4 w-44" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-4/5" />
              <Skeleton className="h-3 w-3/4" />
              <Skeleton className="h-9 w-full mt-2" />
            </div>
            <div className="border border-border bg-card rounded-md p-4 space-y-3">
              <Skeleton className="h-4 w-44" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="border border-border bg-card rounded-md p-4">
              <Skeleton className="h-4 w-56 mb-3" />
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-6 w-6 rounded-md" />
                    <Skeleton className="h-3 w-[45%]" />
                    <Skeleton className="h-3 w-[15%]" />
                    <Skeleton className="h-3 w-[20%] ml-auto" />
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="w-full lg:flex-[0_0_35%] space-y-4 order-1 lg:order-2">
            <div className="border border-border bg-card rounded-md p-4 space-y-3">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-8 w-2/3" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-10 w-full mt-3" />
            </div>
            <div className="border border-border bg-card rounded-md p-4 space-y-3">
              <Skeleton className="h-4 w-44" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-2 w-full" />
            </div>
            <div className="border border-border bg-card rounded-md p-4 space-y-3">
              <Skeleton className="h-4 w-44" />
              <div className="grid grid-cols-2 gap-3">
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full col-span-2" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <AppLayout>
        <CreatorCampaignDetailSkeleton />
      </AppLayout>
    );
  }

  if (!campaign) {
    return (
      <AppLayout>
        <EmptyState
          icon={SearchX}
          title="Campaign not found"
          description="This campaign may have ended or been removed."
          actionLabel="Back to Explore"
          actionTo="/creator/campaigns"
        />
      </AppLayout>
    );
  }

  const allowedPrefix = (emoji: string, text: string) => (
    <div className="flex items-center gap-2 text-[12px] font-medium text-muted-foreground">
      <span className="text-destructive">{emoji}</span>
      {text}
    </div>
  );

  const heroImage =
    typeof campaign.thumbnail_url === "string" && campaign.thumbnail_url.trim()
      ? campaign.thumbnail_url.trim()
      : "/marketing-campaign-banner-fallback.svg";

  return (
    <AppLayout>
      <div className="px-6 pt-4 pb-6 space-y-6">
        {/* Campaign hero */}
        <div className="relative w-full rounded-lg overflow-hidden border border-border min-h-[176px] sm:min-h-[220px] max-h-[340px]">
          <img
            src={heroImage}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/58" />

          <div className="relative z-10 flex flex-col gap-6 p-5 sm:p-7 min-h-[176px] sm:min-h-[220px]">
            <div className="flex items-start justify-between gap-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0 border-border bg-background/80 backdrop-blur-sm"
                onClick={() => navigate("/creator/campaigns")}
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Back
              </Button>
              {campaign.brands?.name ? (
                <span className="text-[12px] text-white/85 text-right max-w-[240px] line-clamp-2">
                  {campaign.brands.name}
                </span>
              ) : null}
            </div>

            <div className="flex-1 flex items-center justify-center px-4">
              <div className="max-w-[min(100%,640px)] w-full px-6 py-2.5 sm:py-3 rounded-full bg-black/72 border border-white/25 backdrop-blur-sm">
                <h1 className="text-center text-[16px] sm:text-[clamp(17px,2.4vw,22px)] font-semibold text-white tracking-tight leading-snug">
                  {campaign.title}
                </h1>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
            {/* Left column (≈65%) */}
            <div className="w-full lg:flex-[0_0_65%] space-y-4 order-2 lg:order-1">
              {/* Section: Description */}
              <section id="description" className="scroll-mt-28">
                <div className="border border-border bg-card rounded-md p-4">
                  <div className="text-[12px] font-medium text-muted-foreground mb-3">Description</div>
                  <p className="text-[13px] text-muted-foreground whitespace-pre-wrap">{campaign.description || "—"}</p>
                </div>
              </section>

              {/* Section: Instructions */}
              <section id="instructions" className="scroll-mt-28">
                <div className="border border-border bg-card rounded-md p-4">
                  <div className="text-[12px] font-medium text-muted-foreground mb-3">Instructions</div>
                  <p className="text-[13px] text-muted-foreground whitespace-pre-wrap">{campaign.instructions || "—"}</p>
                </div>
              </section>

              {/* Section: Campaign Description (rich) */}
              <section id="campaign-description" className="scroll-mt-28">
                <div className="border border-border bg-card rounded-md p-4 space-y-4">
                  <div className="space-y-2">
                    {allowedPrefix("🎯", "Allowed Niches / Pages")}
                    {allowedNichesPages.length ? (
                      <ul className="list-disc pl-5 text-[13px] text-muted-foreground space-y-1">
                        {allowedNichesPages.map((t, i) => (
                          <li key={`${t}-${i}`}>{t}</li>
                        ))}
                      </ul>
                    ) : (
                      <div className="text-[13px] text-muted-foreground">—</div>
                    )}
                  </div>

                  <div className="space-y-2">
                    {allowedPrefix("🚫", "Not Allowed")}
                    {notAllowedList.length ? (
                      <ul className="list-disc pl-5 text-[13px] text-muted-foreground space-y-1">
                        {notAllowedList.map((t, i) => (
                          <li key={`${t}-${i}`}>{t}</li>
                        ))}
                      </ul>
                    ) : (
                      <div className="text-[13px] text-muted-foreground">—</div>
                    )}
                  </div>

                  {contentRequirements ? (
                    <div className="space-y-2">
                      {allowedPrefix("📌", "Content Requirements")}
                      <p className="text-[13px] text-muted-foreground whitespace-pre-wrap">{contentRequirements}</p>
                    </div>
                  ) : null}

                  {songLink ? (
                    <div className="space-y-2">
                      {allowedPrefix("🎵", "Song Link")}
                      <a
                        href={songLink}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[13px] text-primary underline underline-offset-4 hover:opacity-90"
                      >
                        {songLink}
                      </a>
                    </div>
                  ) : null}

                  <div className="space-y-2">
                    {allowedPrefix("🧾", "Example Ads")}
                    {exampleAds.length ? (
                      <ul className="list-disc pl-5 text-[13px] text-muted-foreground space-y-1">
                        {exampleAds.map((url, idx) => (
                          <li key={`${url}-${idx}`}>
                            <a
                              href={url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-primary underline underline-offset-4 hover:opacity-90"
                            >
                              {url}
                            </a>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="text-[13px] text-muted-foreground">—</div>
                    )}
                  </div>

                  <div className="space-y-2">
                    {allowedPrefix("✅/❌", "Requirements")}
                    {requirementsChecklist.length ? (
                      <div className="space-y-2">
                        {requirementsChecklist.map((req, idx) => (
                          <div key={`${req.text}-${idx}`} className="flex items-start gap-2 text-[13px]">
                            {req.allowed ? (
                              <Check className="h-4 w-4 text-success mt-0.5" />
                            ) : (
                              <X className="h-4 w-4 text-destructive mt-0.5" />
                            )}
                            <span className={req.allowed ? "text-muted-foreground" : "text-muted-foreground"}>
                              {req.text}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-[13px] text-muted-foreground">—</div>
                    )}
                  </div>

                  <div className="pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full border-destructive/60 text-destructive hover:bg-destructive/10 hover:text-destructive"
                      asChild={!!communityLink}
                    >
                      {communityLink ? (
                        <a href={communityLink} target="_blank" rel="noreferrer">
                          Join Discord Server
                        </a>
                      ) : (
                        <span>Join Discord Server</span>
                      )}
                    </Button>
                  </div>
                </div>
              </section>

              {/* Section: Available Sounds */}
              <section id="available-sounds" className="scroll-mt-28">
                <div className="border border-border bg-card rounded-md p-4 space-y-3">
                  <div className="text-[14px] font-semibold text-foreground">Available Sounds</div>
                  {soundRows.length ? (
                    <div className="space-y-2">
                      {soundRows.slice(0, 6).map((s, idx) => (
                        <a
                          key={`${s.name}-${idx}`}
                          href={s.url!}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-3 text-[13px] text-muted-foreground border border-border rounded-md p-3 hover:border-primary/40 hover:text-foreground transition-colors"
                        >
                          <Music className="h-4 w-4 shrink-0 text-muted-foreground" />
                          <div className="min-w-0 flex-1 truncate">
                            <span className="text-foreground font-medium">{s.name}</span>
                            <span className="text-muted-foreground"> — {s.artist || "Unknown artist"}</span>
                          </div>
                          <ExternalLink className="h-4 w-4 shrink-0" />
                        </a>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center text-center py-10">
                      <div className="h-12 w-12 rounded-full border border-border bg-muted flex items-center justify-center">
                        <Music className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="mt-3 text-[13px] text-muted-foreground font-medium">
                        No sounds attached to this campaign
                      </div>
                    </div>
                  )}
                </div>
              </section>

              {/* Section: Leaderboard (not in sub-sidebar) */}
              <section id="creator-leaderboard" className="scroll-mt-28">
                <div className="border border-border bg-card rounded-md p-4 space-y-3">
                  <div className="text-[14px] font-semibold text-destructive">Creator Leaderboard</div>

                  {leaderboardEmpty ? (
                    <div className="flex flex-col items-center justify-center text-center py-10">
                      <div className="h-12 w-12 rounded-full border border-border bg-muted flex items-center justify-center">
                        <Trophy className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="mt-3 text-[13px] text-muted-foreground font-medium">
                        No submissions yet. Be the first!
                      </div>
                    </div>
                  ) : (
                    <div className="border border-border rounded-md overflow-hidden">
                      <table className="w-full text-[13px]">
                        <thead className="bg-muted/30 text-muted-foreground text-[11px] uppercase tracking-wide">
                          <tr>
                            <th className="text-left p-3 w-14">#</th>
                            <th className="text-left p-3">Creator</th>
                            <th className="text-left p-3 w-28">Submissions</th>
                            <th className="text-right p-3 w-28">Earned</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {leaderboard.slice(0, 10).map((row, idx) => {
                            const rank = idx + 1;
                            const rankIcon =
                              rank === 1 ? (
                                <Trophy className="h-4 w-4 text-destructive" />
                              ) : rank === 2 ? (
                                <Medal className="h-4 w-4 text-destructive" />
                              ) : rank === 3 ? (
                                <Medal className="h-4 w-4 text-destructive" />
                              ) : null;

                            return (
                              <tr key={row.creatorId}>
                                <td className="p-3 text-muted-foreground">
                                  {rankIcon ? (
                                    <div className="flex items-center gap-2">
                                      {rankIcon}
                                    </div>
                                  ) : (
                                    rank
                                  )}
                                </td>
                                <td className="p-3">
                                  <div className="text-muted-foreground font-medium">{row.creatorLabel}</div>
                                </td>
                                <td className="p-3 text-muted-foreground">{row.submissions}</td>
                                <td className="p-3 text-right text-muted-foreground">{formatCurrency(row.earned)}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </section>
            </div>

            {/* Right column (≈35%) */}
            <div className="w-full lg:flex-[0_0_35%] space-y-4 order-1 lg:order-2">
              {/* Rate per Million Views */}
              <section>
                <div className="border border-border bg-card rounded-md p-4 space-y-3">
                  <div className="text-[13px] font-semibold text-destructive">Rate per Million Views</div>
                  <div className="text-[28px] font-semibold text-destructive">{formatCurrency(ratePerMillion)}</div>
                  <div className="text-[13px] text-muted-foreground">Per million views across all supported platforms</div>
                  <Button
                    variant="destructive"
                    className="w-full transition-transform duration-300 active:scale-[0.99]"
                    type="button"
                    onClick={() => {
                      setPostUrl("");
                      setSubmitModalOpen(true);
                    }}
                  >
                    Submit Content
                  </Button>
                </div>
              </section>

              {/* Campaign Progress */}
              <section>
                <div className="border border-border bg-card rounded-md p-4 space-y-3">
                  <div className="text-[13px] font-semibold text-destructive">Campaign Progress</div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[13px]">
                      <span className="text-muted-foreground">Total Budget:</span>
                      <span className="font-medium">
                        ${totalBudget.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[13px]">
                      <span className="text-muted-foreground">Used:</span>
                      <span className="font-medium">
                        ${usedBudget.toFixed(2)} — {usedPct}% Complete
                      </span>
                    </div>
                  </div>

                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-destructive" style={{ width: `${usedPct}%` }} />
                  </div>
                </div>
              </section>

              {/* Campaign Details */}
              <section>
                <div className="border border-border bg-card rounded-md p-4 space-y-3">
                  <div className="text-[13px] font-semibold text-foreground flex items-center justify-between">
                    <span>Campaign Details</span>
                    {joined ? (
                      <div className="text-[12px] text-success font-medium">
                        ✓ Joined
                      </div>
                    ) : null}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2 space-y-1">
                      <div className="text-[12px] uppercase tracking-wide text-muted-foreground">Supported Platforms</div>
                      <div className="flex flex-wrap gap-2">
                        {supportedPlatforms.map((p) => (
                          <div
                            key={p}
                            className="border border-border rounded-md px-2.5 py-1 text-[12px] text-muted-foreground flex items-center gap-2"
                          >
                            <span className="text-[12px]">{p === "tiktok" ? "🎵" : p === "youtube" ? "▶️" : p === "instagram" ? "📸" : "𝕏"}</span>
                            <span className="font-medium text-foreground">{PLATFORM_LABEL[p] ?? p}</span>
                          </div>
                        ))}
                        {!supportedPlatforms.length ? <div className="text-muted-foreground text-[13px]">—</div> : null}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="text-[12px] uppercase tracking-wide text-muted-foreground">Max Submissions</div>
                      <div className="text-[13px] font-medium">
                        {getFirstDefinedNumber(campaign, ["max_submissions_per_account", "max_submissions", "max_submissions_per_social"]) ?? "—"}{" "}
                        <span className="text-muted-foreground font-normal">per social media account</span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="text-[12px] uppercase tracking-wide text-muted-foreground">Max Earnings</div>
                      <div className="text-[13px] font-medium">
                        {(() => {
                          const n = getFirstDefinedNumber(campaign, ["max_earnings_per_creator", "max_earnings", "max_creator_earnings"]);
                          return n === null ? "—" : formatCurrency(n);
                        })()}{" "}
                        <span className="text-muted-foreground font-normal">per creator</span>
                      </div>
                    </div>

                    <div className="col-span-2 space-y-1">
                      <div className="text-[12px] uppercase tracking-wide text-muted-foreground">Max Earnings per Post</div>
                      <div className="text-[13px] font-medium">
                        {(() => {
                          const n = getFirstDefinedNumber(campaign, ["max_earnings_per_post", "max_earnings_per_submission", "max_post_earnings"]);
                          return n === null ? "—" : formatCurrency(n);
                        })()}{" "}
                        <span className="text-muted-foreground font-normal">per post</span>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            </div>
          </div>
      </div>

      <Dialog
        open={submitModalOpen}
        onOpenChange={(open) => {
          setSubmitModalOpen(open);
          if (!open) {
            setPostUrl("");
            setConfirmSubmitOpen(false);
          }
        }}
      >
        <DialogContent className="sm:max-w-md [&>button]:hidden">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-[15px]">Submit a post</DialogTitle>
            <DialogDescription className="text-[13px] text-muted-foreground">
              Submitting auto-joins this campaign.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label className="text-[12px]">Post URL</Label>
            <Textarea
              value={postUrl}
              onChange={(e) => setPostUrl(e.target.value)}
              placeholder="https://…"
              className="min-h-[108px] text-[13px] resize-none border-primary/40 focus-visible:border-success focus-visible:ring-success/25"
            />
            <div className="flex gap-2 text-[11px] text-muted-foreground items-start pt-1">
              <Info className="h-4 w-4 shrink-0 mt-0.5 text-success" />
              <span>Views after submission count toward earnings — submit as soon as you post.</span>
            </div>
          </div>
          <DialogFooter className="flex-col-reverse sm:flex-row gap-2 sm:justify-between">
            <Button type="button" variant="outline" size="sm" onClick={() => setSubmitModalOpen(false)}>
              Cancel
            </Button>
            <Button type="button" variant="destructive" size="sm" disabled={submitting} onClick={() => void handleSubmitIntent()}>
              {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : null}
              Submit for review
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={confirmSubmitOpen}
        onOpenChange={(open) => {
          setConfirmSubmitOpen(open);
          if (!open) setPendingSubmitPayload(null);
        }}
      >
        <DialogContent className="sm:max-w-md [&>button]:hidden">
          <DialogHeader>
            <DialogTitle className="text-[15px]">Confirm submission</DialogTitle>
            <DialogDescription className="text-[13px] text-left pt-2">
              Detected{" "}
              <span className="text-foreground font-medium">
                {pendingSubmitPayload?.platform ? PLATFORM_LABEL[pendingSubmitPayload.platform] : "—"}
              </span>{" "}
              from this URL. Proceed?
            </DialogDescription>
          </DialogHeader>
          <p className="text-[12px] text-muted-foreground flex items-start gap-2">
            <Info className="h-4 w-4 shrink-0 mt-0.5" />
            Paste only the URL to the clip on the detected platform — wrong-platform links cannot be credited.
          </p>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" size="sm" onClick={() => setConfirmSubmitOpen(false)}>
              Cancel
            </Button>
            <Button type="button" variant="destructive" size="sm" disabled={submitting} onClick={() => void finalizeSubmitPost()}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
