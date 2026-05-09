import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import type { Enums } from "@/integrations/supabase/types";
import { cn } from "@/lib/utils";
import { nextUtcMondayReset, nextUtcMonthReset, formatResetCountdown, type PeriodFilter } from "@/lib/leaderboard-compute";
import { maskUsernameMiddle } from "@/lib/username-mask";
import { formatViewCount } from "@/lib/format-views";
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

  return (
    <AppLayout>
      <div className="flex flex-col min-h-0">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 md:px-6 h-11 border-b border-border shrink-0">
          <h1 className="text-[13px] font-medium">Leaderboard</h1>
          {communityLink ? (
            <Button variant="outline" size="sm" className="h-7 text-[11px]" asChild>
              <a href={communityLink} target="_blank" rel="noreferrer">
                Community <ExternalLink className="h-3 w-3 ml-1" />
              </a>
            </Button>
          ) : null}
        </div>

        <div className="flex-1 overflow-auto px-4 md:px-6 py-4 space-y-4">
          {/* Filter bar */}
          <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between border border-border rounded-lg bg-muted/15 p-3">
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground w-full xl:w-auto">Scope</span>
              {(["platform", "campaign", "category"] as Scope[]).map((s) => (
                <Button
                  key={s}
                  type="button"
                  variant={scope === s ? "default" : "outline"}
                  size="sm"
                  className={cn("h-7 text-[11px] px-3", scope === s ? "" : "bg-transparent")}
                  onClick={() => setScope(s)}
                >
                  {s === "campaign" ? "Per Campaign" : s === "category" ? "Per Category" : "Platform"}
                </Button>
              ))}
              {scope === "campaign" ? (
                <Select value={campaignId || undefined} onValueChange={setCampaignId}>
                  <SelectTrigger className="h-7 w-[min(100%,220px)] text-[11px]">
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
                  <SelectTrigger className="h-7 w-[160px] text-[11px]">
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
                  <SelectTrigger className="h-7 w-[130px] text-[11px]">
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

            <div className="flex flex-wrap gap-2 items-center xl:justify-end">
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Time</span>
              {(["week", "month", "all"] as PeriodFilter[]).map((p) => (
                <Button
                  key={p}
                  type="button"
                  variant={period === p ? "secondary" : "ghost"}
                  size="sm"
                  className="h-7 text-[11px] px-3"
                  onClick={() => setPeriod(p)}
                >
                  {p === "week" ? "This Week" : p === "month" ? "This Month" : "All Time"}
                </Button>
              ))}
              {period !== "all" && resetLabel ? (
                <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                  Resets in <span className="text-foreground font-medium">{resetLabel}</span>
                </span>
              ) : null}
            </div>
          </div>

          <p className="text-[11px] text-muted-foreground flex gap-2 items-start">
            <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            <span>{filterHint} Points = ⌊views/1000⌋ + 50 per approved post in period + campaign bonuses in lifetime totals. Tier badge uses all-time earnings.</span>
          </p>

          <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 lg:items-start">
            {/* Left ~65% */}
            <div className="w-full lg:w-[65%] lg:flex-shrink-0 min-w-0 space-y-3">
              {loading ? (
                <LeaderboardRowsSkeleton rows={10} />
              ) : top100.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border py-16 text-center text-[13px] text-muted-foreground">
                  No ranked creators for these filters yet.
                </div>
              ) : (
                <div className="rounded-lg border border-border overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-[13px] min-w-[720px]">
                      <thead className="bg-muted/40 text-muted-foreground text-[10px] uppercase tracking-wide border-b border-border">
                        <tr>
                          <th className="text-left p-2 w-12 font-bold">Rank</th>
                          <th className="text-left p-2 font-bold">Creator</th>
                          <th className="text-left p-2 font-bold">Tier</th>
                          <th className="text-right p-2 font-bold">Submissions</th>
                          <th className="text-right p-2 font-bold hidden sm:table-cell">Views</th>
                          <th className="text-right p-2 font-bold">Points</th>
                        </tr>
                      </thead>
                      <tbody>
                        {top100.map((e) => (
                          <tr
                            key={e.creatorId}
                            className={cn(
                              "border-t border-border cursor-pointer transition-colors hover:bg-muted/30",
                              rankRowTint(e.rank),
                              user?.id === e.creatorId && "ring-1 ring-inset ring-primary/25",
                            )}
                            onMouseEnter={() => isMd && setHoverId(e.creatorId)}
                            onMouseLeave={() => isMd && setHoverId(null)}
                            onClick={() => {
                              setLockId(e.creatorId);
                              if (!isMd) setMobileSheetOpen(true);
                            }}
                          >
                            <td className="p-2.5 align-middle">
                              <RankTrophy rank={e.rank} />
                            </td>
                            <td className="p-2.5 align-middle">
                              <div className="flex items-center gap-2 min-w-0">
                                <div
                                  className={cn(
                                    "h-10 w-10 rounded-full overflow-hidden shrink-0 bg-muted",
                                    tierRingClass(e.tier),
                                  )}
                                >
                                  {e.avatarUrl ? (
                                    <img src={e.avatarUrl} alt="" className="h-full w-full object-cover" />
                                  ) : (
                                    <div className="h-full w-full flex items-center justify-center text-[11px] text-muted-foreground">
                                      {maskUsernameMiddle(e.displayName).slice(0, 1)}
                                    </div>
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <div className="font-medium truncate">{maskUsernameMiddle(e.displayName)}</div>
                                  {e.bannerUrl ? (
                                    <div className="mt-1 h-[18px] w-16 rounded overflow-hidden border border-border/60">
                                      <img src={e.bannerUrl} alt="" className="h-full w-full object-cover" />
                                    </div>
                                  ) : null}
                                </div>
                              </div>
                            </td>
                            <td className="p-2.5 align-middle">
                              <EarningsTierBadge tier={e.tier} compact />
                            </td>
                            <td className="p-2.5 text-right tabular-nums text-muted-foreground">{e.submissions}</td>
                            <td className="p-2.5 text-right tabular-nums text-muted-foreground hidden sm:table-cell">
                              {formatViewCount(e.views)}
                            </td>
                            <td className="p-2.5 text-right font-semibold tabular-nums">{Math.round(e.points)}</td>
                          </tr>
                        ))}
                      </tbody>
                      {user ? (
                        <tbody>
                          <tr className="border-t-2 border-border bg-muted/25">
                            <td colSpan={6} className="p-1.5 px-2">
                              <span className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">You</span>
                            </td>
                          </tr>
                          <tr className="bg-muted/35 border-t border-border">
                            <td className="p-2.5 align-middle">
                              {userRank && userRank <= 100 ? (
                                <RankTrophy rank={userRank} />
                              ) : (
                                <Badge variant="outline" className="text-[9px] font-normal">
                                  &lt; 100
                                </Badge>
                              )}
                            </td>
                            <td className="p-2.5">
                              <div className="flex items-center gap-2">
                                <div className="h-10 w-10 rounded-full bg-muted overflow-hidden ring-2 ring-primary/40 shrink-0">
                                  {(userEntry?.avatarUrl ?? profile?.avatar_url) ? (
                                    <img src={userEntry?.avatarUrl ?? profile?.avatar_url ?? ""} alt="" className="h-full w-full object-cover" />
                                  ) : (
                                    <div className="h-full w-full flex items-center justify-center text-[11px]">Me</div>
                                  )}
                                </div>
                                <div>
                                  <div className="font-medium">{maskUsernameMiddle(userEntry?.displayName ?? profile?.full_name ?? "")}</div>
                                  {notOnBoard ? (
                                    <span className="text-[10px] text-muted-foreground">Not on leaderboard</span>
                                  ) : null}
                                </div>
                              </div>
                            </td>
                            <td className="p-2.5">
                              {userEntry ? <EarningsTierBadge tier={userEntry.tier} compact /> : <span className="text-muted-foreground">—</span>}
                            </td>
                            <td className="p-2.5 text-right tabular-nums">{userEntry?.submissions ?? 0}</td>
                            <td className="p-2.5 text-right tabular-nums hidden sm:table-cell">{userEntry ? formatViewCount(userEntry.views) : "—"}</td>
                            <td className="p-2.5 text-right font-semibold">{userEntry ? Math.round(userEntry.points) : 0}</td>
                          </tr>
                        </tbody>
                      ) : null}
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Right ~35% sticky desktop */}
            <div className="hidden lg:block w-full lg:w-[35%] lg:flex-shrink-0 lg:sticky lg:top-4 lg:self-start max-h-[calc(100vh-6rem)] overflow-y-auto">
              <LeaderboardProfilePanel entry={panelEntry} />
            </div>
          </div>
        </div>
      </div>

      <Sheet open={mobileSheetOpen} onOpenChange={(o) => {
        setMobileSheetOpen(o);
        if (!o) setLockId(null);
      }}>
        <SheetContent side="bottom" className="h-[85vh] overflow-y-auto pt-6">
          <LeaderboardProfilePanel entry={panelEntry} compact />
        </SheetContent>
      </Sheet>
    </AppLayout>
  );
}
