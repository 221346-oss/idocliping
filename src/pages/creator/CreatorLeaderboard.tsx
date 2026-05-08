import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams, useNavigate, useParams, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import type { LeaderboardBadgeTier } from "@/lib/leaderboard-badges";
import { formatPerkLines, resolveEffectiveTier } from "@/lib/leaderboard-badges";
import { Constants } from "@/integrations/supabase/types";
import type { Enums } from "@/integrations/supabase/types";
import { cn } from "@/lib/utils";
import { ExternalLink, Info, Loader2, Medal, Trophy, X, Megaphone, Smartphone, Layers } from "lucide-react";

const PLATFORM_LABEL: Record<string, string> = {
  tiktok: "TikTok",
  instagram: "Instagram",
  youtube: "YouTube",
  x: "X",
};

const CATEGORY_LABEL: Record<Enums<"campaign_category">, string> = {
  music: "Music",
  clipping: "Logo / clipping",
  gaming: "Gaming",
  logo: "Logo",
  ugc: "UGC",
  other: "Other",
};

const CHUNK = 120;

type Scope = "campaign" | "platform" | "category";

type LeaderboardRow = {
  creatorId: string;
  creatorLabel: string;
  submissions: number;
  earned: number;
  campaignsParticipated: number;
};

function maskCreatorName(fullName: string | null | undefined) {
  const parts = (fullName ?? "").trim().split(/\s+/).filter(Boolean);
  const first = parts[0] ?? "Creator";
  const c0 = first[0]?.toUpperCase() ?? "C";
  return `${c0}••••`;
}

function formatCurrency(value: number) {
  if (!Number.isFinite(value)) return "—";
  return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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

async function loadEarningsForSubmissionIds(submissionIds: string[]) {
  const rows: { creator_id: string; amount: number | string | null }[] = [];
  for (let i = 0; i < submissionIds.length; i += CHUNK) {
    const slice = submissionIds.slice(i, i + CHUNK);
    const { data, error } = await supabase
      .from("earnings")
      .select("creator_id, amount, submission_id")
      .eq("type", "campaign")
      .in("submission_id", slice);
    if (error) throw error;
    for (const e of data ?? []) rows.push({ creator_id: e.creator_id, amount: e.amount });
  }
  return rows;
}

async function buildRowsFromApprovedSubs(
  subs: { id: string; creator_id: string; campaign_id: string }[],
): Promise<LeaderboardRow[]> {
  if (!subs.length) return [];
  const submissionIds = subs.map((s) => s.id);
  const earningsRows = await loadEarningsForSubmissionIds(submissionIds);

  const subCountByCreator = new Map<string, number>();
  const campaignsByCreator = new Map<string, Set<string>>();
  for (const s of subs) {
    subCountByCreator.set(s.creator_id, (subCountByCreator.get(s.creator_id) ?? 0) + 1);
    if (!campaignsByCreator.has(s.creator_id)) campaignsByCreator.set(s.creator_id, new Set());
    campaignsByCreator.get(s.creator_id)!.add(s.campaign_id);
  }

  const earnedByCreator = new Map<string, number>();
  for (const e of earningsRows) {
    earnedByCreator.set(e.creator_id, (earnedByCreator.get(e.creator_id) ?? 0) + Number(e.amount ?? 0));
  }

  const creatorIds = [...new Set(subs.map((s) => s.creator_id))];
  const { data: profiles } = await supabase.from("profiles").select("user_id, full_name").in("user_id", creatorIds);

  const profileByUserId = new Map((profiles ?? []).map((p: any) => [p.user_id, p.full_name] as const));

  const rows: LeaderboardRow[] = creatorIds.map((creatorId) => ({
    creatorId,
    creatorLabel: maskCreatorName(profileByUserId.get(creatorId) ?? null),
    submissions: subCountByCreator.get(creatorId) ?? 0,
    earned: earnedByCreator.get(creatorId) ?? 0,
    campaignsParticipated: campaignsByCreator.get(creatorId)?.size ?? 0,
  }));

  rows.sort((a, b) => b.earned - a.earned || b.submissions - a.submissions || a.creatorId.localeCompare(b.creatorId));
  return rows;
}

const PROFILE_DRAWER_MS = 320;

function fallbackTierLabel(rank: number, total: number): string | null {
  if (total === 0) return null;
  if (rank === 1) return "Champion";
  if (rank === 2) return "Runner-up";
  if (rank === 3) return "Podium";
  const pct = rank / total;
  if (pct <= 0.05) return "Elite 5%";
  if (pct <= 0.15) return "Top 15%";
  if (pct <= 0.33) return "Rising";
  return null;
}

function TopEarnersPodium({ ranked }: { ranked: { row: LeaderboardRow; rank: number }[] }) {
  const top = ranked.slice(0, 10);
  if (!top.length) return null;
  const maxEarned = Math.max(top[0].row.earned, 1e-6);
  const p1 = top[0];
  const p2 = top[1];
  const p3 = top[2];
  const rest = top.slice(3);

  const Slot = ({
    entry,
    place,
    heightClass,
    glow,
  }: {
    entry?: { row: LeaderboardRow; rank: number };
    place: number;
    heightClass: string;
    glow?: boolean;
  }) => {
    if (!entry) return <div className={cn("w-[30%] max-w-[140px] opacity-0 pointer-events-none", heightClass)} />;
    const pct = Math.min(100, Math.round((entry.row.earned / maxEarned) * 100));
    return (
      <div className={cn("w-[30%] max-w-[140px] flex flex-col items-center gap-2", glow && "z-10")}>
        <div
          className={cn(
            "w-full rounded-t-lg border flex flex-col justify-end px-2 pt-3 pb-2 text-center transition-transform duration-300",
            heightClass,
            glow
              ? "border-destructive/70 bg-gradient-to-b from-destructive/35 via-destructive/10 to-background shadow-[0_0_28px_-4px_hsl(var(--destructive)/0.45)]"
              : "border-border/80 bg-gradient-to-b from-muted/90 to-background",
          )}
        >
          <div className="text-[10px] font-bold text-destructive tabular-nums">#{entry.rank}</div>
          <div className="text-[11px] font-semibold text-foreground truncate w-full">{entry.row.creatorLabel}</div>
          <div className="text-[12px] font-bold text-success tabular-nums">${entry.row.earned.toFixed(0)}</div>
        </div>
        <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden border border-border/50">
          <div
            className={cn("h-full rounded-full transition-all duration-500", glow ? "bg-destructive shadow-[0_0_12px_hsl(var(--destructive)/0.5)]" : "bg-success/90")}
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="text-[9px] uppercase tracking-wider text-muted-foreground">{place === 1 ? "MVP" : place === 2 ? "Runner" : "Podium"}</span>
      </div>
    );
  };

  return (
    <div className="rounded-xl border border-border bg-gradient-to-b from-card via-card to-muted/25 overflow-hidden">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between gap-2 bg-muted/20">
        <div>
          <div className="text-[13px] font-semibold text-destructive tracking-tight">Boss leaderboard</div>
          <div className="text-[10px] text-muted-foreground">Top 10 earners · arcade snapshot</div>
        </div>
        <Badge variant="outline" className="text-[10px] border-success/40 text-success shrink-0">
          LIVE
        </Badge>
      </div>

      <div className="relative px-4 pt-8 pb-6">
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-[radial-gradient(ellipse_80%_100%_at_50%_100%,hsl(var(--destructive)/0.14),transparent)]"
          aria-hidden
        />
        <div className="relative flex items-end justify-center gap-3 md:gap-5">
          <Slot entry={p2} place={2} heightClass="min-h-[132px] md:min-h-[148px]" />
          <Slot entry={p1} place={1} heightClass="min-h-[168px] md:min-h-[188px]" glow />
          <Slot entry={p3} place={3} heightClass="min-h-[112px] md:min-h-[124px]" />
        </div>

        {rest.length > 0 ? (
          <div className="mt-8 space-y-2 border-t border-border/60 pt-4">
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground px-1">Challengers</div>
            {rest.map(({ row, rank }) => {
              const pct = Math.min(100, Math.round((row.earned / maxEarned) * 100));
              return (
                <div key={row.creatorId} className="flex items-center gap-3 rounded-lg border border-border/60 bg-background/60 px-3 py-2">
                  <span className="text-[11px] text-muted-foreground tabular-nums w-6">{rank}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[12px] font-medium truncate">{row.creatorLabel}</span>
                      <span className="text-[11px] text-success font-semibold tabular-nums">${row.earned.toFixed(2)}</span>
                    </div>
                    <div className="mt-1.5 h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-success/40 via-success to-success/70 shadow-[0_0_8px_hsl(var(--success)/0.35)]"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function CreatorLeaderboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const { creatorId: routeCreatorId } = useParams<{ creatorId?: string }>();
  const [searchParams, setSearchParams] = useSearchParams();

  const categories = Constants.public.Enums.campaign_category;

  const [scope, setScope] = useState<Scope>(() => {
    const s = searchParams.get("scope");
    if (s === "campaign" || s === "platform" || s === "category") return s;
    return "platform";
  });
  const [campaignId, setCampaignId] = useState<string>(() => searchParams.get("campaign") ?? "");
  const [platformFilter, setPlatformFilter] = useState<string>(() => searchParams.get("platform") ?? "tiktok");
  const [categoryFilter, setCategoryFilter] = useState<Enums<"campaign_category">>(() => {
    const c = searchParams.get("category") as Enums<"campaign_category"> | null;
    return c && categories.includes(c) ? c : "music";
  });

  const [campaignOptions, setCampaignOptions] = useState<{ id: string; title: string }[]>([]);
  const [rows, setRows] = useState<LeaderboardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [communityLink, setCommunityLink] = useState<string | null>(null);
  /** Keeps drawer content visible while exit animation runs after navigate delay */
  const [closingSnapshot, setClosingSnapshot] = useState<{ row: LeaderboardRow; rank: number } | null>(null);
  const [panelEntered, setPanelEntered] = useState(false);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [badgeTiers, setBadgeTiers] = useState<LeaderboardBadgeTier[]>([]);
  const [badgeOverrideTier, setBadgeOverrideTier] = useState<Map<string, number>>(new Map());
  const [badgeOverrideNote, setBadgeOverrideNote] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    void getCommunityLinkFromAppSettings().then(setCommunityLink);
  }, []);

  useEffect(() => {
    void (async () => {
      const { data, error } = await (supabase as any)
        .from("leaderboard_badge_tiers")
        .select("tier_order, slug, title, rank_from, rank_to, perks")
        .order("tier_order", { ascending: false });
      if (!error && data) setBadgeTiers(data as LeaderboardBadgeTier[]);
    })();
  }, []);

  useEffect(() => {
    const ids = rows.map((r) => r.creatorId);
    if (!ids.length) {
      setBadgeOverrideTier(new Map());
      setBadgeOverrideNote(new Map());
      return;
    }
    void (async () => {
      const { data } = await (supabase as any).from("creator_badge_overrides").select("creator_id, tier_order, admin_note").in("creator_id", ids);
      const tm = new Map<string, number>();
      const nm = new Map<string, string>();
      for (const r of data ?? []) {
        tm.set(r.creator_id, r.tier_order);
        nm.set(r.creator_id, r.admin_note ?? "");
      }
      setBadgeOverrideTier(tm);
      setBadgeOverrideNote(nm);
    })();
  }, [rows]);

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
      setCampaignId((prev) => {
        if (prev && opts.some((o) => o.id === prev)) return prev;
        return opts[0]?.id ?? "";
      });
    })();
  }, []);

  useEffect(() => {
    const next = new URLSearchParams();
    next.set("scope", scope);
    if (scope === "campaign" && campaignId) next.set("campaign", campaignId);
    if (scope === "platform") next.set("platform", platformFilter);
    if (scope === "category") next.set("category", categoryFilter);
    setSearchParams(next, { replace: true });
  }, [scope, campaignId, platformFilter, categoryFilter, setSearchParams]);

  const scopeHint = useMemo(() => {
    if (scope === "campaign") return "Rankings for one campaign — climb where it counts.";
    if (scope === "platform") return "Compare creators on a single platform across all campaigns.";
    return "See who dominates a category (music, UGC, clipping, and more).";
  }, [scope]);

  const fetchRows = useCallback(async () => {
    setLoading(true);
    try {
      let subs: { id: string; creator_id: string; campaign_id: string }[] = [];

      if (scope === "campaign") {
        if (!campaignId) {
          setRows([]);
          return;
        }
        const { data, error } = await supabase
          .from("submissions")
          .select("id, creator_id, campaign_id")
          .eq("campaign_id", campaignId)
          .eq("status", "approved");
        if (error) throw error;
        subs = (data ?? []) as any[];
      } else if (scope === "platform") {
        const { data, error } = await supabase
          .from("submissions")
          .select("id, creator_id, campaign_id")
          .eq("platform", platformFilter as Enums<"social_platform">)
          .eq("status", "approved");
        if (error) throw error;
        subs = (data ?? []) as any[];
      } else {
        const { data, error } = await supabase
          .from("submissions")
          .select("id, creator_id, campaign_id, campaigns!inner(category)")
          .eq("status", "approved")
          .eq("campaigns.category", categoryFilter);
        if (error) {
          const { data: wide, error: err2 } = await supabase
            .from("submissions")
            .select("id, creator_id, campaign_id, campaigns(category)")
            .eq("status", "approved");
          if (err2) throw err2;
          subs = ((wide ?? []) as any[])
            .filter((s) => s.campaigns?.category === categoryFilter)
            .map((s) => ({ id: s.id, creator_id: s.creator_id, campaign_id: s.campaign_id }));
        } else {
          subs = (data ?? []).map((s: any) => ({ id: s.id, creator_id: s.creator_id, campaign_id: s.campaign_id }));
        }
      }

      const built = await buildRowsFromApprovedSubs(subs);
      setRows(built);
    } catch (e: unknown) {
      toast({
        title: "Could not load leaderboard",
        description: e instanceof Error ? e.message : "Try again shortly.",
        variant: "destructive",
      });
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [scope, campaignId, platformFilter, categoryFilter, toast]);

  useEffect(() => {
    if (!user) return;
    void fetchRows();
  }, [user, fetchRows]);

  const rankedRows = useMemo(() => rows.map((row, i) => ({ row, rank: i + 1 })), [rows]);

  const selectedFromRows = useMemo(() => {
    if (!routeCreatorId) return null;
    return rankedRows.find(({ row }) => row.creatorId === routeCreatorId) ?? null;
  }, [routeCreatorId, rankedRows]);

  const drawerContent = closingSnapshot ?? selectedFromRows;
  const drawerMounted = Boolean(drawerContent && (routeCreatorId || closingSnapshot));

  useEffect(() => {
    if (!routeCreatorId || loading) return;
    const found = rankedRows.some(({ row }) => row.creatorId === routeCreatorId);
    if (!found) {
      navigate(`/creator/leaderboard${location.search}`, { replace: true });
    }
  }, [routeCreatorId, loading, rankedRows, navigate, location.search]);

  useEffect(() => {
    if (!drawerMounted || closingSnapshot) return;
    setPanelEntered(false);
    const id = requestAnimationFrame(() => requestAnimationFrame(() => setPanelEntered(true)));
    return () => cancelAnimationFrame(id);
  }, [drawerMounted, closingSnapshot, routeCreatorId]);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    };
  }, []);

  const closeProfile = useCallback(() => {
    const live = selectedFromRows;
    const snap = live ?? closingSnapshot;
    if (!snap) return;
    setClosingSnapshot(snap);
    setPanelEntered(false);
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    closeTimerRef.current = setTimeout(() => {
      navigate(`/creator/leaderboard${location.search}`, { replace: true });
      setClosingSnapshot(null);
      closeTimerRef.current = null;
    }, PROFILE_DRAWER_MS);
  }, [selectedFromRows, closingSnapshot, navigate, location.search]);

  const selectedScopeLabel = useMemo(() => {
    if (scope === "campaign") {
      const t = campaignOptions.find((c) => c.id === campaignId)?.title ?? "Campaign";
      return `Campaign · ${t}`;
    }
    if (scope === "platform") return `Platform · ${PLATFORM_LABEL[platformFilter] ?? platformFilter}`;
    return `Category · ${CATEGORY_LABEL[categoryFilter]}`;
  }, [scope, campaignId, campaignOptions, platformFilter, categoryFilter]);

  const drawerEffectiveBadge = useMemo(() => {
    if (!drawerContent) return null;
    return resolveEffectiveTier(drawerContent.rank, drawerContent.row.creatorId, badgeTiers, badgeOverrideTier);
  }, [drawerContent, badgeTiers, badgeOverrideTier]);

  const drawerLeaderEarned = rows[0]?.earned ?? 0;

  const scopeNav = [
    { id: "platform" as const, label: "Platform", icon: Smartphone },
    { id: "campaign" as const, label: "One campaign", icon: Megaphone },
    { id: "category" as const, label: "Category", icon: Layers },
  ];

  return (
    <AppLayout>
      <div className="flex flex-col min-h-0 h-full">
        <div className="flex flex-wrap items-start justify-between gap-4 px-4 md:px-6 h-11 border-b border-border shrink-0">
          <h1 className="text-[13px] font-medium leading-none self-center">Leaderboard</h1>
          <div className="flex flex-wrap gap-2 self-center">
            {communityLink ? (
              <Button variant="destructive" size="sm" className="h-7 text-[11px] shadow-sm" asChild>
                <a href={communityLink} target="_blank" rel="noreferrer">
                  Discord / community <ExternalLink className="h-3 w-3 ml-1" />
                </a>
              </Button>
            ) : null}
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          <div className="flex flex-col md:flex-row min-h-full">
            <div className="md:w-44 shrink-0 border-b md:border-b-0 md:border-r border-border bg-muted/10">
              <nav className="flex md:flex-col gap-px p-1.5">
                {scopeNav.map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setScope(id)}
                    className={cn(
                      "flex items-center gap-1.5 text-[12px] h-8 px-2 rounded-sm transition-colors w-full text-left",
                      scope === id
                        ? "bg-destructive/15 text-destructive font-semibold shadow-sm border border-destructive/25"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0 opacity-90" />
                    {label}
                  </button>
                ))}
              </nav>
            </div>

            <div className="flex-1 min-w-0 overflow-auto px-4 md:px-6 py-5 space-y-5">
              <p className="text-[12px] text-muted-foreground leading-relaxed max-w-2xl">{scopeHint}</p>

              <div className="flex flex-wrap gap-3 items-start">
                {scope === "campaign" ? (
                  <div className="flex flex-col gap-1 min-w-[220px] flex-1">
                    <span className="text-[11px] uppercase tracking-wide text-muted-foreground">Campaign</span>
                    <Select value={campaignId || undefined} onValueChange={setCampaignId}>
                      <SelectTrigger className="h-9 text-[13px] border-border">
                        <SelectValue placeholder="Pick a campaign" />
                      </SelectTrigger>
                      <SelectContent>
                        {campaignOptions.map((c) => (
                          <SelectItem key={c.id} value={c.id} className="text-[13px]">
                            {c.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : null}
                {scope === "platform" ? (
                  <div className="flex flex-col gap-1 min-w-[180px]">
                    <span className="text-[11px] uppercase tracking-wide text-muted-foreground">Platform</span>
                    <Select value={platformFilter} onValueChange={setPlatformFilter}>
                      <SelectTrigger className="h-9 text-[13px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(PLATFORM_LABEL).map(([k, label]) => (
                          <SelectItem key={k} value={k} className="text-[13px]">
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : null}
                {scope === "category" ? (
                  <div className="flex flex-col gap-1 min-w-[200px]">
                    <span className="text-[11px] uppercase tracking-wide text-muted-foreground">Category</span>
                    <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v as Enums<"campaign_category">)}>
                      <SelectTrigger className="h-9 text-[13px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((c) => (
                          <SelectItem key={c} value={c} className="text-[13px]">
                            {CATEGORY_LABEL[c]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : null}

                <div className="flex items-start gap-2 text-[11px] text-muted-foreground max-w-md md:ml-auto pt-1">
                  <Info className="h-4 w-4 shrink-0 text-success mt-0.5" />
                  <span>
                    Ten admin-managed tiers (rank bands + perks). Overrides apply per creator. Names stay masked.
                  </span>
                </div>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-20 gap-2 text-muted-foreground text-[13px]">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Loading rankings…
                </div>
              ) : rankedRows.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border bg-muted/20 px-6 py-12 text-center text-[13px] text-muted-foreground">
                  No approved submissions in this view yet. Be the first to earn here.
                </div>
              ) : (
                <>
                  <div className="grid lg:grid-cols-5 gap-6 items-start">
                    <div className="lg:col-span-2">
                      <TopEarnersPodium ranked={rankedRows} />
                    </div>

                    <div className="lg:col-span-3 rounded-lg border border-border overflow-hidden">
                      <div className="px-4 py-3 border-b border-border bg-muted/30 flex items-center justify-between">
                        <span className="text-[12px] font-medium text-foreground">Standings</span>
                        <Badge variant="outline" className="text-[10px] border-success/40 text-success">
                          {rankedRows.length} creators
                        </Badge>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-[13px] min-w-[560px]">
                          <thead className="bg-muted/20 text-muted-foreground text-[11px] uppercase tracking-wide">
                            <tr>
                              <th className="text-left p-3 w-14">#</th>
                              <th className="text-left p-3">Badge</th>
                              <th className="text-left p-3">Creator</th>
                              <th className="text-right p-3">Posts</th>
                              <th className="text-right p-3">Earned</th>
                            </tr>
                          </thead>
                          <tbody>
                            {rankedRows.map(({ row, rank }) => {
                              const dbBadge = resolveEffectiveTier(rank, row.creatorId, badgeTiers, badgeOverrideTier);
                              const fb = fallbackTierLabel(rank, rankedRows.length);
                              const label = dbBadge?.title ?? fb;
                              const overridden = badgeOverrideTier.has(row.creatorId);
                              const isYou = user?.id === row.creatorId;
                              return (
                                <tr
                                  key={row.creatorId}
                                  className={cn(
                                    "border-t border-border cursor-pointer transition-colors hover:bg-muted/40",
                                    isYou && "bg-success/5 ring-1 ring-inset ring-success/25",
                                  )}
                                  onClick={() =>
                                    navigate({
                                      pathname: `/creator/leaderboard/profile/${row.creatorId}`,
                                      search: location.search,
                                    })
                                  }
                                >
                                  <td className="p-3 text-muted-foreground align-middle">
                                    <div className="flex items-center gap-1">
                                      {rank === 1 ? (
                                        <Trophy className="h-4 w-4 text-destructive shrink-0" />
                                      ) : rank <= 3 ? (
                                        <Medal className="h-4 w-4 text-destructive/90 shrink-0" />
                                      ) : (
                                        rank
                                      )}
                                    </div>
                                  </td>
                                  <td className="p-3 align-middle">
                                    {label ? (
                                      <div className="flex flex-col gap-0.5">
                                        <Badge
                                          variant={rank <= 3 ? "destructive" : "outline"}
                                          className={cn(
                                            "text-[10px] font-semibold w-fit",
                                            rank > 3 && "border-success/50 text-success",
                                          )}
                                        >
                                          {label}
                                        </Badge>
                                        {overridden ? (
                                          <span className="text-[9px] text-warning font-medium uppercase tracking-wide">Admin tier</span>
                                        ) : null}
                                      </div>
                                    ) : (
                                      <span className="text-muted-foreground">—</span>
                                    )}
                                  </td>
                                  <td className="p-3">
                                    <div className="font-medium text-foreground">{row.creatorLabel}</div>
                                    <div className="text-[11px] text-muted-foreground">
                                      {row.campaignsParticipated} campaign{row.campaignsParticipated === 1 ? "" : "s"} in view
                                    </div>
                                  </td>
                                  <td className="p-3 text-right tabular-nums text-muted-foreground">{row.submissions}</td>
                                  <td className="p-3 text-right tabular-nums font-medium text-success">{formatCurrency(row.earned)}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {drawerMounted && drawerContent ? (
        <>
          <button
            type="button"
            className={cn(
              "fixed inset-0 z-40 bg-black/55 transition-opacity ease-out",
              panelEntered ? "opacity-100 duration-200" : "opacity-0 duration-300 pointer-events-none",
            )}
            aria-label="Close profile"
            onClick={closeProfile}
          />
          <aside
            className={cn(
              "fixed top-0 right-0 z-50 h-full w-full max-w-md md:max-w-none md:w-[min(35vw,520px)] min-w-[280px]",
              "border-l border-border bg-background shadow-2xl flex flex-col",
              "transition-transform ease-out will-change-transform",
              panelEntered ? "duration-200 translate-x-0" : "duration-300 translate-x-full",
            )}
          >
            <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-border">
              <div>
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Public profile</p>
                <h2 className="text-[17px] font-semibold text-foreground mt-1">{drawerContent.row.creatorLabel}</h2>
                <p className="text-[12px] text-destructive font-medium mt-0.5">{selectedScopeLabel}</p>
              </div>
              <Button type="button" variant="ghost" size="icon" className="shrink-0 h-8 w-8" onClick={closeProfile}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-md border border-border bg-muted/20 p-3">
                  <div className="text-[10px] uppercase text-muted-foreground">Rank</div>
                  <div className="text-[22px] font-bold text-destructive tabular-nums">#{drawerContent.rank}</div>
                </div>
                <div className="rounded-md border border-border bg-muted/20 p-3">
                  <div className="text-[10px] uppercase text-muted-foreground">Badge tier</div>
                  <div className="text-[13px] font-semibold text-foreground mt-1">
                    {drawerEffectiveBadge?.title ?? fallbackTierLabel(drawerContent.rank, rankedRows.length) ?? "Keep climbing"}
                  </div>
                  {badgeOverrideTier.has(drawerContent.row.creatorId) ? (
                    <p className="text-[10px] text-warning mt-1 font-medium">Admin-assigned tier</p>
                  ) : null}
                  {badgeOverrideNote.get(drawerContent.row.creatorId)?.trim() ? (
                    <p className="text-[11px] text-muted-foreground mt-1 leading-snug">{badgeOverrideNote.get(drawerContent.row.creatorId)}</p>
                  ) : null}
                </div>
                <div className="rounded-md border border-success/25 bg-success/5 p-3 col-span-2">
                  <div className="text-[10px] uppercase text-success">Earned (this view)</div>
                  <div className="text-[24px] font-bold text-success tabular-nums">{formatCurrency(drawerContent.row.earned)}</div>
                </div>
                <div className="rounded-md border border-border p-3">
                  <div className="text-[10px] uppercase text-muted-foreground">Approved posts</div>
                  <div className="text-[18px] font-semibold tabular-nums">{drawerContent.row.submissions}</div>
                </div>
                <div className="rounded-md border border-border p-3">
                  <div className="text-[10px] uppercase text-muted-foreground">Campaigns</div>
                  <div className="text-[18px] font-semibold tabular-nums">{drawerContent.row.campaignsParticipated}</div>
                </div>
              </div>

              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 space-y-3">
                <div className="text-[12px] font-semibold text-destructive">PvP snapshot — vs #1</div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-md bg-background/80 border border-border px-3 py-2">
                    <div className="text-[10px] uppercase text-muted-foreground">You</div>
                    <div className="text-lg font-bold text-destructive tabular-nums">{formatCurrency(drawerContent.row.earned)}</div>
                  </div>
                  <div className="rounded-md bg-background/80 border border-border px-3 py-2">
                    <div className="text-[10px] uppercase text-muted-foreground">Leader</div>
                    <div className="text-lg font-bold text-success tabular-nums">{formatCurrency(drawerLeaderEarned)}</div>
                  </div>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden border border-border/60">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-destructive via-destructive/80 to-success"
                    style={{
                      width: `${drawerLeaderEarned > 0 ? Math.min(100, Math.round((drawerContent.row.earned / drawerLeaderEarned) * 100)) : 0}%`,
                    }}
                  />
                </div>
              </div>

              <div className="rounded-lg border border-success/25 bg-success/5 p-4 space-y-2">
                <div className="text-[11px] font-semibold text-success uppercase tracking-wide">Tier perks</div>
                <ul className="text-[12px] text-muted-foreground space-y-1 list-disc pl-4">
                  {(drawerEffectiveBadge ? formatPerkLines(drawerEffectiveBadge.perks as Record<string, unknown>) : ["Earn a tier by rank — admins configure withdrawal discounts & fees."]).map((line, i) => (
                    <li key={i}>{line}</li>
                  ))}
                </ul>
              </div>

              <p className="text-[11px] text-muted-foreground leading-relaxed flex gap-2">
                <Info className="h-4 w-4 shrink-0 text-success" />
                Identity stays masked; wallet automation can read tier perks after admin enables billing hooks.
              </p>
            </div>
          </aside>
        </>
      ) : null}
    </AppLayout>
  );
}
