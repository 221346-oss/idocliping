import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { CreatorShell, PageContainer, DetailHeader } from "@/components/shell/CreatorShell";
import { UnderlineTabs } from "@/components/ui-kit/Pills";
import { ProgressRate, DataRow, ListSection } from "@/components/ui-kit/DataBits";
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
  const [tab, setTab] = useState("details");


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
          .select("id, platform, post_url, status, manual_views, created_at, earnings(amount)")
          .eq("campaign_id", id)
          .eq("creator_id", user.id)
          .order("created_at", { ascending: false }),
        supabase.from("social_accounts").select("platform").eq("user_id", user.id),
      ]);
      setMySubs((mine ?? []) as any[]);
      setConnectedPlatforms(((socials ?? []) as any[]).map((s) => String(s.platform).toLowerCase()));



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
              actionTo="/creator/campaigns"
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

  const platformEmoji = (p: string) =>
    p === "tiktok" ? "🎵" : p === "youtube" ? "▶️" : p === "instagram" ? "📸" : "𝕏";

  const Bullets = ({ items }: { items: string[] }) =>
    items.length ? (
      <ul className="space-y-1.5">
        {items.map((t, i) => (
          <li key={`${t}-${i}`} className="flex gap-2 text-[14px] leading-snug text-muted-foreground">
            <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-muted-foreground/60" />
            <span>{t}</span>
          </li>
        ))}
      </ul>
    ) : (
      <div className="text-[14px] text-muted-foreground">—</div>
    );

  const SectionCard = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <section className="surface-card space-y-3 p-5">
      <h2 className="font-display text-[15px] font-semibold">{title}</h2>
      {children}
    </section>
  );

  return (
    <CreatorShell>
      <PageContainer>
        <DetailHeader title={campaign.brands?.name ?? "Campaign"} onBack={() => navigate("/creator/campaigns")} />

        {/* Hero */}
        <div className="surface-card relative overflow-hidden">
          <div className="relative aspect-[16/9] max-h-[280px] w-full">
            <img src={heroImage} alt="" className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-background/10" />
            <div className="absolute inset-x-0 bottom-0 p-5">
              {joined && (
                <span className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-primary/20 px-2.5 py-1 text-[12px] font-semibold text-primary">
                  <Check className="h-3.5 w-3.5" /> Joined
                </span>
              )}
              <h1 className="font-display text-[22px] font-semibold leading-tight tracking-tight md:text-[28px]">
                {campaign.title}
              </h1>
            </div>
          </div>

          <div className="space-y-4 p-5">
            <div className="flex items-end justify-between gap-3">
              <div>
                <div className="text-[12.5px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Rate per 1M views
                </div>
                <div className="display-figure mt-1 text-[30px] leading-none text-primary">
                  {formatCurrency(ratePerMillion)}
                </div>
              </div>
              <div className="flex flex-wrap justify-end gap-1.5">
                {supportedPlatforms.map((p) => (
                  <span key={p} className="chip pointer-events-none h-8 px-3">
                    <span>{platformEmoji(p)}</span>
                    {PLATFORM_LABEL[p] ?? p}
                  </span>
                ))}
              </div>
            </div>

            <ProgressRate
              percent={usedPct}
              totalLabel={`$${totalBudget.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
              leftCaption="Budget used"
              rightCaption={`$${usedBudget.toFixed(2)} paid out`}
            />
          </div>
        </div>

        {/* Tabs */}
        <UnderlineTabs
          className="mt-5"
          value={tab}
          onChange={setTab}
          options={[
            { value: "details", label: "Details" },
            { value: "sounds", label: "Sounds", count: soundRows.length },
            { value: "leaderboard", label: "Leaderboard", count: leaderboard.length },
          ]}
        />

        <div className="mt-4 space-y-4 lg:grid lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start lg:gap-6 lg:space-y-0">
          <div className="min-w-0 space-y-4">
            {tab === "details" && (
              <>
                <SectionCard title="Description">
                  <p className="whitespace-pre-wrap text-[14px] leading-relaxed text-muted-foreground">
                    {campaign.description || "—"}
                  </p>
                </SectionCard>

                <SectionCard title="Instructions">
                  <p className="whitespace-pre-wrap text-[14px] leading-relaxed text-muted-foreground">
                    {campaign.instructions || "—"}
                  </p>
                </SectionCard>

                <SectionCard title="Allowed niches & pages">
                  <Bullets items={allowedNichesPages} />
                </SectionCard>

                <SectionCard title="Not allowed">
                  <Bullets items={notAllowedList} />
                </SectionCard>

                {contentRequirements && (
                  <SectionCard title="Content requirements">
                    <p className="whitespace-pre-wrap text-[14px] leading-relaxed text-muted-foreground">
                      {contentRequirements}
                    </p>
                  </SectionCard>
                )}

                {requirementsChecklist.length > 0 && (
                  <SectionCard title="Requirements">
                    <div className="space-y-2.5">
                      {requirementsChecklist.map((req, idx) => (
                        <div key={`${req.text}-${idx}`} className="flex items-start gap-2.5 text-[14px] leading-snug">
                          {req.allowed ? (
                            <Check className="mt-0.5 h-[17px] w-[17px] shrink-0 text-primary" />
                          ) : (
                            <X className="mt-0.5 h-[17px] w-[17px] shrink-0 text-destructive" />
                          )}
                          <span className="text-muted-foreground">{req.text}</span>
                        </div>
                      ))}
                    </div>
                  </SectionCard>
                )}

                {(songLink || exampleAds.length > 0) && (
                  <SectionCard title="Resources">
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
                          <span className="min-w-0 flex-1 truncate text-[14px]">Example ad {idx + 1}</span>
                          <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground" />
                        </a>
                      ))}
                    </div>
                  </SectionCard>
                )}

                {communityLink && (
                  <a href={communityLink} target="_blank" rel="noreferrer" className="btn-outline-pill">
                    Join the community
                  </a>
                )}
              </>
            )}

            {tab === "sounds" &&
              (soundRows.length ? (
                <ListSection title="Available sounds">
                  {soundRows.map((s: { name: string; artist: string; url: string }, idx: number) => (
                    <a
                      key={`${s.name}-${idx}`}
                      href={s.url}
                      target="_blank"
                      rel="noreferrer"
                      className="press-row focus-ring flex items-center gap-3 px-4 py-3.5"
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-raised text-primary">
                        <Music className="h-[18px] w-[18px]" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[14.5px] font-semibold">{s.name}</span>
                        <span className="block truncate text-[12.5px] text-muted-foreground">
                          {s.artist || "Unknown artist"}
                        </span>
                      </span>
                      <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground" />
                    </a>
                  ))}
                </ListSection>
              ) : (
                <div className="surface-card">
                  <EmptyState icon={Music} title="No sounds yet" description="This campaign has no attached sounds." />
                </div>
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
                  {leaderboard.slice(0, 20).map((row, idx) => {
                    const rank = idx + 1;
                    return (
                      <div key={row.creatorId} className="flex items-center gap-3 px-4 py-3.5">
                        <span
                          className={cn(
                            "display-figure flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[14px]",
                            rank <= 3 ? "bg-primary/15 text-primary" : "bg-surface-raised text-muted-foreground",
                          )}
                        >
                          {rank <= 3 ? <Medal className="h-[18px] w-[18px]" /> : rank}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-[14.5px] font-semibold">{row.creatorLabel}</div>
                          <div className="text-[12.5px] text-muted-foreground">
                            {row.submissions} submission{row.submissions === 1 ? "" : "s"}
                          </div>
                        </div>
                        <div className="display-figure text-[15px] tabular-nums">{formatCurrency(row.earned)}</div>
                      </div>
                    );
                  })}
                </div>
              ))}
          </div>

          {/* Meta rail */}
          <ListSection title="Campaign details" className="lg:sticky lg:top-24">
            <div className="px-4 py-1">
              <DataRow
                label="Max submissions"
                value={
                  getFirstDefinedNumber(campaign, [
                    "max_submissions_per_account",
                    "max_submissions",
                    "max_submissions_per_social",
                  ]) ?? "—"
                }
              />
              <DataRow
                label="Max earnings / creator"
                value={(() => {
                  const n = getFirstDefinedNumber(campaign, [
                    "max_earnings_per_creator",
                    "max_earnings",
                    "max_creator_earnings",
                  ]);
                  return n === null ? "—" : formatCurrency(n);
                })()}
              />
              <DataRow
                label="Max earnings / post"
                value={(() => {
                  const n = getFirstDefinedNumber(campaign, [
                    "max_earnings_per_post",
                    "max_earnings_per_submission",
                    "max_post_earnings",
                  ]);
                  return n === null ? "—" : formatCurrency(n);
                })()}
              />
              <DataRow label="Budget remaining" value={formatCurrency(remainingBudget)} />
            </div>
          </ListSection>
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
              Submit content
            </button>
          </div>
        </div>
      </PageContainer>

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
        <DialogContent className="rounded-3xl sm:max-w-md">
          <DialogHeader className="space-y-1 text-left">
            <DialogTitle className="font-display text-[18px]">Submit a post</DialogTitle>
            <DialogDescription className="text-[13px] text-muted-foreground">
              Submitting auto-joins this campaign.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label className="text-[13px] text-muted-foreground">Post URL</Label>
            <Textarea
              value={postUrl}
              onChange={(e) => setPostUrl(e.target.value)}
              placeholder="https://…"
              className="min-h-[96px] resize-none rounded-2xl border-border/70 bg-surface-raised text-[14px]"
            />
            <div className="flex items-start gap-2 pt-1 text-[12px] text-muted-foreground">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span>Views after submission count toward earnings — submit as soon as you post.</span>
            </div>
          </div>
          <DialogFooter className="flex-col-reverse gap-2 sm:flex-row">
            <button type="button" className="btn-outline-pill" onClick={() => setSubmitModalOpen(false)}>
              Cancel
            </button>
            <button
              type="button"
              className="btn-primary-pill"
              disabled={submitting}
              onClick={() => void handleSubmitIntent()}
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Submit for review
            </button>
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
          <p className="flex items-start gap-2 text-[12.5px] text-muted-foreground">
            <Info className="mt-0.5 h-4 w-4 shrink-0" />
            Paste only the URL to the clip on the detected platform — wrong-platform links cannot be credited.
          </p>
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
