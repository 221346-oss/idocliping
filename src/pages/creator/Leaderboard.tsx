import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { CreatorShell, PageContainer, PageTitle } from "@/components/shell/CreatorShell";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import type { Enums } from "@/integrations/supabase/types";
import { cn } from "@/lib/utils";
import { nextUtcMondayReset, nextUtcMonthReset, formatResetCountdown, type PeriodFilter } from "@/lib/leaderboard-compute";
import { maskUsernameMiddle } from "@/lib/username-mask";
import {
  fetchSubmissionsForScope,
  fetchLifetimeEarningsByCreator,
  fetchLeaderboardDisplayMaps,
  buildLeaderboard,
  type Scope,
  type LeaderboardEntry,
} from "@/pages/creator/leaderboardData";
import { RankTrophy, rankRowTint } from "@/components/leaderboard/RankTrophy";
import { EarningsTierBadge } from "@/components/leaderboard/EarningsTierBadge";
import { tierRingClass } from "@/components/leaderboard/tierStyles";
import { LeaderboardRowsSkeleton } from "@/components/leaderboard/LeaderboardSkeletons";
import { LeaderboardProfilePanel, type PanelEntry } from "@/components/leaderboard/LeaderboardProfilePanel";
import { ExternalLink, Info } from "lucide-react";
import type { EarningsTier } from "@/lib/leaderboard-compute";

/** Avatar (left) + wide banner strip (right) — name + tier on banner overlay */
function LeaderboardCreatorStrip({
  avatarUrl,
  bannerUrl,
  displayName,
  tier,
  subtitle,
}: {
  avatarUrl: string | null;
  bannerUrl: string | null;
  displayName: string;
  tier: EarningsTier;
  subtitle?: string | null;
}) {
  const masked = maskUsernameMiddle(displayName || "Creator");
  return (
    <div className="flex items-stretch gap-2.5 min-w-0 py-0.5">
      <div
        className={cn(
          "h-14 w-14 shrink-0 rounded-full overflow-hidden bg-muted border-2 border-border shadow-sm",
          tierRingClass(tier),
        )}
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full flex items-center justify-center text-[14px] font-semibold text-muted-foreground">{masked.slice(0, 1)}</div>
        )}
      </div>
      <div className="relative flex-1 min-w-0 rounded-md border border-border/70 overflow-hidden min-h-[56px] bg-muted/50">
        {bannerUrl ? (
          <>
            <img src={bannerUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/45 to-black/20" />
          </>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-r from-muted via-muted/70 to-muted/40" />
        )}
        <div className="relative z-10 flex h-full min-h-[56px] items-center justify-between gap-2 px-3">
          <div className="min-w-0 flex-1">
            <div className="font-semibold text-[13px] md:text-[14px] text-foreground truncate drop-shadow-[0_1px_2px_rgba(0,0,0,0.85)]">{masked}</div>
            {subtitle ? (
              <div
                className={cn(
                  "text-[10px] mt-0.5 truncate",
                  bannerUrl
                    ? "text-foreground/90 drop-shadow-[0_1px_2px_rgba(0,0,0,0.75)]"
                    : "text-muted-foreground",
                )}
              >
                {subtitle}
              </div>
            ) : null}
          </div>
          <div className="shrink-0">
            <EarningsTierBadge tier={tier} compact />
          </div>
        </div>
      </div>
    </div>
  );
}

const PLATFORM_LABEL: Record<string, string> = {
  tiktok: "TikTok",
  instagram: "Instagram",
  youtube: "YouTube",
  x: "X",
};

const CATEGORY_OPTIONS: { value: string; label: string }[] = [
  { value: "music", label: "Music" },
  { value: "gaming", label: "Gaming" },
  { value: "ugc", label: "UGC" },
  { value: "clipping", label: "Clipping" },
  { value: "anime", label: "Anime" },
  { value: "logo", label: "Logo" },
];

async function getCommunityLink(): Promise<string | null> {
  const keys = ["community_link", "discord_link"];
  for (const k of keys) {
    const { data } = await supabase.from("app_settings").select("value").eq("key", k).maybeSingle();
    if (data?.value) return String(data.value);
  }
  return null;
}

export default function CreatorLeaderboard() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const [scope, setScope] = useState<Scope>(() => {
    const s = searchParams.get("scope");
    if (s === "campaign" || s === "category") return s;
    return "platform";
  });
  const [period, setPeriod] = useState<PeriodFilter>(() => {
    const p = searchParams.get("period");
    if (p === "week" || p === "month" || p === "all") return p;
    return "week";
  });

  const [campaignId, setCampaignId] = useState(() => searchParams.get("campaign") ?? "");
  const [platformFilter, setPlatformFilter] = useState(() => searchParams.get("platform") ?? "tiktok");
  const [categoryFilter, setCategoryFilter] = useState(() => searchParams.get("category") ?? "music");

  const [campaignOptions, setCampaignOptions] = useState<{ id: string; title: string }[]>([]);
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [communityLink, setCommunityLink] = useState<string | null>(null);

  const [hoverId, setHoverId] = useState<string | null>(null);
  const [lockId, setLockId] = useState<string | null>(null);
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
  const [isMd, setIsMd] = useState(true);

  const displayProfileId = lockId ?? hoverId;

  useEffect(() => {
    const fn = () => setIsMd(window.innerWidth >= 768);
    fn();
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, []);

  useEffect(() => {
    void getCommunityLink().then(setCommunityLink);
  }, []);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("campaigns")
        .select("id, title")
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(100);
      const opts = (data ?? []).map((c: any) => ({ id: c.id, title: c.title ?? "Campaign" }));
      setCampaignOptions(opts);
      setCampaignId((prev) => (prev && opts.some((o) => o.id === prev) ? prev : opts[0]?.id ?? ""));
    })();
  }, []);

  useEffect(() => {
    const next = new URLSearchParams();
    next.set("scope", scope);
    next.set("period", period);
    if (scope === "campaign" && campaignId) next.set("campaign", campaignId);
    if (scope === "platform") next.set("platform", platformFilter);
    if (scope === "category") next.set("category", categoryFilter);
    setSearchParams(next, { replace: true });
  }, [scope, period, campaignId, platformFilter, categoryFilter, setSearchParams]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const subs = await fetchSubmissionsForScope(scope, campaignId, platformFilter, categoryFilter as any);
      const aggIds = [...new Set(subs.map((s) => s.creator_id))];
      const [earnMap, maps] = await Promise.all([
        fetchLifetimeEarningsByCreator(aggIds),
        fetchLeaderboardDisplayMaps(aggIds),
      ]);
      const built = buildLeaderboard(subs, period, earnMap, maps.profiles, maps.cosmetics);
      setEntries(built);
    } catch (e: unknown) {
      toast({
        title: "Leaderboard unavailable",
        description: e instanceof Error ? e.message : "Try again.",
        variant: "destructive",
      });
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [scope, campaignId, platformFilter, categoryFilter, period, toast]);

  useEffect(() => {
    if (!user) return;
    void load();
  }, [user, load]);

  const rankedFull = entries;
  const top100 = useMemo(() => rankedFull.slice(0, 100), [rankedFull]);

  const userEntry = useMemo(() => {
    if (!user) return null;
    return rankedFull.find((e) => e.creatorId === user.id) ?? null;
  }, [rankedFull, user]);

  const userRank = userEntry?.rank ?? null;
  const notOnBoard = userEntry === null || (userRank !== null && userRank > 100);

  const panelEntry: PanelEntry | null = useMemo(() => {
    if (!displayProfileId) return null;
    const e = rankedFull.find((x) => x.creatorId === displayProfileId);
    if (!e) return null;
    return {
      creatorId: e.creatorId,
      displayName: e.displayName,
      avatarUrl: e.avatarUrl,
      bannerUrl: e.bannerUrl,
      tier: e.tier,
      lifetimeEarningsUsd: e.lifetimeEarningsUsd,
    };
  }, [displayProfileId, rankedFull]);

  const resetLabel = useMemo(() => {
    if (period === "all") return null;
    const target = period === "week" ? nextUtcMondayReset() : nextUtcMonthReset();
    return formatResetCountdown(target);
  }, [period]);

  const filterHint = useMemo(() => {
    if (scope === "campaign") return "Rankings for one campaign.";
    if (scope === "platform") return "All campaigns — filtered by platform.";
    return "Filtered by campaign category.";
  }, [scope]);

  const RowCard = ({
    rank,
    rankNode,
    avatarUrl,
    bannerUrl,
    displayName,
    tier,
    subtitle,
    points,
    pointsCaption,
    mine,
    onSelect,
    onHover,
  }: {
    rank?: number;
    rankNode?: React.ReactNode;
    avatarUrl: string | null;
    bannerUrl: string | null;
    displayName: string;
    tier: EarningsTier;
    subtitle?: string | null;
    points: number;
    pointsCaption?: string;
    mine?: boolean;
    onSelect?: () => void;
    onHover?: (v: boolean) => void;
  }) => (
    <div
      role="button"
      tabIndex={0}
      onMouseEnter={() => onHover?.(true)}
      onMouseLeave={() => onHover?.(false)}
      onClick={onSelect}
      onKeyDown={(ev) => {
        if (ev.key === "Enter" || ev.key === " ") {
          ev.preventDefault();
          onSelect?.();
        }
      }}
      className={cn(
        "focus-ring flex cursor-pointer items-center gap-3 px-3 py-3 transition-colors hover:bg-muted/35 sm:px-4",
        rank ? rankRowTint(rank) : undefined,
        rank === 1 && "ring-1 ring-inset ring-warning/35",
        mine && "bg-muted/40 ring-1 ring-inset ring-primary/30",
      )}
    >
      <div className="w-[54px] shrink-0 sm:w-[80px]">
        {rankNode ?? <RankTrophy rank={rank ?? 0} className="origin-left sm:scale-110" />}
      </div>
      <div className="min-w-0 flex-1">
        <LeaderboardCreatorStrip
          avatarUrl={avatarUrl}
          bannerUrl={bannerUrl}
          displayName={displayName}
          tier={tier}
          subtitle={subtitle}
        />
      </div>
      <div className="flex shrink-0 flex-col items-end gap-0.5 text-right">
        <span className="display-figure text-[17px] tabular-nums sm:text-[20px]">{Math.round(points)}</span>
        <span className="text-[9px] uppercase tracking-wide text-muted-foreground">
          {pointsCaption ?? "pts"}
        </span>
      </div>
    </div>
  );

  return (
    <CreatorShell>
      <PageContainer className="pb-10">
        <PageTitle
          action={
            communityLink ? (
              <a href={communityLink} target="_blank" rel="noreferrer" className="btn-outline-pill h-10 gap-1.5 px-4 text-[13px]">
                Community <ExternalLink className="h-3.5 w-3.5" />
              </a>
            ) : undefined
          }
        >
          Leaderboard
        </PageTitle>

        <div className="space-y-4">
          {/* Filter bar */}
          <div className="surface-card flex flex-col gap-3 p-3 xl:flex-row xl:items-end xl:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <span className="w-full text-[10px] uppercase tracking-wide text-muted-foreground xl:w-auto">Scope</span>
              {(["platform", "campaign", "category"] as Scope[]).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setScope(s)}
                  data-active={scope === s}
                  className="chip"
                >
                  {s === "campaign" ? "Per Campaign" : s === "category" ? "Per Category" : "Platform"}
                </button>
              ))}
              {scope === "campaign" ? (
                <Select value={campaignId || undefined} onValueChange={setCampaignId}>
                  <SelectTrigger className="h-9 w-[min(100%,220px)] rounded-full text-[12px]">
                    <SelectValue placeholder="Campaign" />
                  </SelectTrigger>
                  <SelectContent>
                    {campaignOptions.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : null}
              {scope === "category" ? (
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="h-9 w-[160px] rounded-full text-[12px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORY_OPTIONS.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : null}
              {scope === "platform" ? (
                <Select value={platformFilter} onValueChange={setPlatformFilter}>
                  <SelectTrigger className="h-9 w-[140px] rounded-full text-[12px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(PLATFORM_LABEL).map(([k, label]) => (
                      <SelectItem key={k} value={k}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center gap-2 xl:justify-end">
              <span className="w-full text-[10px] uppercase tracking-wide text-muted-foreground xl:w-auto">Time</span>
              {(["week", "month", "all"] as PeriodFilter[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPeriod(p)}
                  data-active={period === p}
                  className="chip"
                >
                  {p === "week" ? "This Week" : p === "month" ? "This Month" : "All Time"}
                </button>
              ))}
              {period !== "all" && resetLabel ? (
                <span className="whitespace-nowrap text-[11px] text-muted-foreground">
                  Resets in <span className="font-medium text-foreground">{resetLabel}</span>
                </span>
              ) : null}
            </div>
          </div>

          <p className="flex items-start gap-2 text-[11.5px] text-muted-foreground">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>
              {filterHint} Points = ⌊views/1000⌋ + 50 per approved post in period + campaign bonuses in lifetime
              totals. Tier badge uses all-time earnings.
            </span>
          </p>

          <div className="grid w-full min-w-0 max-w-full grid-cols-1 items-start gap-6 overflow-x-hidden lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <div className="min-w-0 max-w-full space-y-3">
              {loading ? (
                <LeaderboardRowsSkeleton rows={10} />
              ) : top100.length === 0 ? (
                <div className="surface-card py-16 text-center text-[13px] text-muted-foreground">
                  No ranked creators for these filters yet.
                </div>
              ) : (
                <div className="surface-card divide-y divide-border/60 overflow-hidden">
                  {top100.map((e) => (
                    <RowCard
                      key={e.creatorId}
                      rank={e.rank}
                      avatarUrl={e.avatarUrl}
                      bannerUrl={e.bannerUrl}
                      displayName={e.displayName}
                      tier={e.tier}
                      points={e.points}
                      mine={user?.id === e.creatorId}
                      onHover={(v) => isMd && setHoverId(v ? e.creatorId : null)}
                      onSelect={() => {
                        setLockId(e.creatorId);
                        if (!isMd) setMobileSheetOpen(true);
                      }}
                    />
                  ))}

                  {user ? (
                    <>
                      <div className="bg-muted/30 px-4 py-1.5">
                        <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                          You
                        </span>
                      </div>
                      <RowCard
                        rank={userRank && userRank <= 100 ? userRank : undefined}
                        rankNode={
                          userRank && userRank <= 100 ? undefined : (
                            <Badge variant="outline" className="w-fit px-1.5 py-0.5 font-mono text-[10px] font-normal">
                              &lt; 100
                            </Badge>
                          )
                        }
                        avatarUrl={userEntry?.avatarUrl ?? profile?.avatar_url ?? null}
                        bannerUrl={userEntry?.bannerUrl ?? null}
                        displayName={userEntry?.displayName ?? profile?.full_name ?? "You"}
                        tier={userEntry?.tier ?? "rookie"}
                        subtitle={notOnBoard ? "Not on leaderboard" : undefined}
                        points={userEntry ? userEntry.points : 0}
                        pointsCaption="This period"
                        mine
                        onSelect={() => {
                          if (user) setLockId(user.id);
                          if (!isMd) setMobileSheetOpen(true);
                        }}
                      />
                    </>
                  ) : null}
                </div>
              )}
            </div>

            <aside className="hidden min-w-0 max-w-full overflow-y-auto overflow-x-hidden lg:sticky lg:top-4 lg:block lg:max-h-[calc(100vh-8rem)] lg:self-start">
              <LeaderboardProfilePanel entry={panelEntry} />
            </aside>
          </div>
        </div>
      </PageContainer>

      <Sheet
        open={mobileSheetOpen}
        onOpenChange={(o) => {
          setMobileSheetOpen(o);
          if (!o) setLockId(null);
        }}
      >
        <SheetContent side="bottom" className="h-[85vh] overflow-y-auto pt-6">
          <LeaderboardProfilePanel entry={panelEntry} compact />
        </SheetContent>
      </Sheet>
    </CreatorShell>
  );
}

