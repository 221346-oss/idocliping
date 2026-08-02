import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { maskUsernameMiddle } from "@/lib/username-mask";
import { formatViewCount } from "@/lib/format-views";
import { formatCurrencySimple } from "@/lib/format-currency";
import type { EarningsTier } from "@/lib/leaderboard-compute";
import { EarningsTierBadge } from "./EarningsTierBadge";
import { ProfilePanelSkeleton } from "./LeaderboardSkeletons";
import { submissionStatusLabel } from "@/lib/submission-status";
import { Instagram, Youtube, ExternalLink, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";

function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z" />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <span className={cn("font-bold text-[11px] leading-none", className)} aria-hidden>
      𝕏
    </span>
  );
}

const PLATFORM_ICONS: Record<string, React.ReactNode> = {
  tiktok: <TikTokIcon className="h-4 w-4" />,
  youtube: <Youtube className="h-4 w-4" />,
  instagram: <Instagram className="h-4 w-4" />,
  x: <XIcon className="h-4 w-4" />,
};

export type PanelEntry = {
  creatorId: string;
  displayName: string;
  avatarUrl: string | null;
  bannerUrl: string | null;
  tier: EarningsTier;
  lifetimeEarningsUsd: number;
};

export function LeaderboardProfilePanel({
  entry,
  className,
  compact,
}: {
  entry: PanelEntry | null;
  className?: string;
  compact?: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const [memberSince, setMemberSince] = useState<string | null>(null);
  const [platforms, setPlatforms] = useState<string[]>([]);
  const [stats, setStats] = useState<{
    campaigns: number;
    views: number;
    earned: number;
    bestCampaignId: string | null;
    bestCampaignTitle: string | null;
  } | null>(null);
  const [recent, setRecent] = useState<any[]>([]);

  useEffect(() => {
    if (!entry) {
      setMemberSince(null);
      setPlatforms([]);
      setStats(null);
      setRecent([]);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [{ data: prof }, { data: soc }, { data: earnRows }, { data: subs }] = await Promise.all([
          supabase.from("profiles").select("created_at").eq("user_id", entry.creatorId).maybeSingle(),
          (supabase as any).from("public_creator_platforms").select("platform").eq("user_id", entry.creatorId),
          (supabase as any)
            .from("public_campaign_creator_earnings")
            .select("amount, campaign_id")
            .eq("creator_id", entry.creatorId),
          (supabase as any)
            .from("public_submissions")
            .select("id, platform, manual_views, status, campaign_id")
            .eq("creator_id", entry.creatorId)
            .order("created_at", { ascending: false })
            .limit(3),
        ]);

        if (cancelled) return;

        setMemberSince(prof?.created_at ? new Date(prof.created_at).toLocaleDateString(undefined, { month: "short", year: "numeric" }) : null);
        setPlatforms([...new Set(((soc ?? []) as any[]).map((s: any) => String(s.platform)))]);

        let earned = 0;
        const byCamp = new Map<string, number>();
        for (const e of ((earnRows ?? []) as any[])) {
          const a = Number((e as any).amount ?? 0);
          earned += a;
          const campId = (e as any).campaign_id as string | undefined;
          if (campId) byCamp.set(campId, (byCamp.get(campId) ?? 0) + a);
        }
        let bestId: string | null = null;
        let bestAmt = -1;
        for (const [cid, v] of byCamp) {
          if (v > bestAmt) {
            bestAmt = v;
            bestId = cid;
          }
        }
        let bestTitle: string | null = null;
        if (bestId) {
          const { data: c } = await supabase.from("campaigns").select("title").eq("id", bestId).maybeSingle();
          bestTitle = c?.title ?? null;
        }

        const { data: ccRow } = await (supabase as any)
          .from("public_creator_campaign_counts")
          .select("campaign_count")
          .eq("creator_id", entry.creatorId)
          .maybeSingle();
        const campCount = Number((ccRow as any)?.campaign_count ?? 0);

        const { data: viewSum } = await (supabase as any)
          .from("public_submissions")
          .select("manual_views")
          .eq("creator_id", entry.creatorId);

        const views = ((viewSum ?? []) as any[]).reduce((a, r: any) => a + Number(r.manual_views ?? 0), 0);

        const campIds = [...new Set(((subs ?? []) as any[]).map((s: any) => String(s.campaign_id)).filter(Boolean))];
        const titleById = new Map<string, string>();
        if (campIds.length) {
          const { data: ct } = await supabase.from("campaigns").select("id, title").in("id", campIds);
          for (const c of ct ?? []) titleById.set((c as any).id, (c as any).title ?? "");
        }

        setStats({
          campaigns: campCount ?? 0,
          views,
          earned,
          bestCampaignId: bestId,
          bestCampaignTitle: bestTitle,
        });
        setRecent(
          (subs ?? []).map((s: any) => ({
            ...s,
            campaignTitle: titleById.get(s.campaign_id) ?? "Campaign",
          })),
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [entry?.creatorId]);

  if (!entry) {
    return (
      <div
        className={cn(
          "rounded-xl border border-dashed border-border bg-muted/20 flex flex-col items-center justify-center text-center px-6 py-16 w-full min-w-0 max-w-full",
          className,
        )}
      >
        <p className="text-[13px] text-muted-foreground max-w-[220px]">Click on a creator to view their profile</p>
      </div>
    );
  }

  if (loading && !stats) {
    return <ProfilePanelSkeleton className={className} />;
  }

  const banner = entry.bannerUrl;
  const avatar = entry.avatarUrl;

  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card overflow-hidden flex flex-col w-full min-w-0 max-w-full",
        compact ? "max-h-[70vh]" : "",
        className,
      )}
    >
      <div className="relative h-[120px] bg-muted shrink-0">
        {banner ? (
          <img src={banner} alt="" className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-muted to-background" />
        )}
        <div className="absolute inset-0 bg-black/35" />
      </div>

      <div className="px-4 pb-4 pt-0 flex-1 min-h-0 overflow-y-auto">
        <div className="flex gap-3 -mt-8 relative z-10">
          <div
            className={cn(
              "h-16 w-16 rounded-full border-4 border-background bg-muted overflow-hidden shrink-0 ring-2 ring-border",
            )}
          >
            {avatar ? <img src={avatar} alt="" className="h-full w-full object-cover" /> : <div className="h-full w-full bg-muted flex items-center justify-center text-[18px] font-semibold text-muted-foreground">?</div>}
          </div>
          <div className="pt-9 min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[15px] font-semibold text-foreground truncate">{maskUsernameMiddle(entry.displayName)}</span>
              <EarningsTierBadge tier={entry.tier} compact />
            </div>
            {memberSince ? <p className="text-[11px] text-muted-foreground mt-0.5">Member since {memberSince}</p> : null}
            <Link
              to={`/profile/${entry.creatorId}`}
              className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-medium text-primary hover:underline transition-all"
            >
              <ExternalLink className="h-3 w-3" />
              View full profile
            </Link>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mt-4">
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground w-full">Connected platforms</span>
          <div className="flex gap-2">
            {platforms.length === 0 ? (
              <span className="text-[11px] text-muted-foreground">—</span>
            ) : (
              platforms.map((p) => <span key={p} className="text-muted-foreground">{PLATFORM_ICONS[p] ?? p}</span>)
            )}
          </div>
        </div>

        {stats ? (
          <div className="grid grid-cols-2 gap-2 mt-5">
            <div className="rounded-md border border-border bg-muted/20 p-2.5">
              <div className="text-[10px] text-muted-foreground uppercase">Total campaigns</div>
              <div className="text-[16px] font-semibold tabular-nums">{stats.campaigns}</div>
            </div>
            <div className="rounded-md border border-border bg-muted/20 p-2.5">
              <div className="text-[10px] text-muted-foreground uppercase">All-time views</div>
              <div className="text-[16px] font-semibold tabular-nums">{formatViewCount(stats.views)}</div>
            </div>
            <div className="rounded-md border border-border bg-muted/20 p-2.5">
              <div className="text-[10px] text-muted-foreground uppercase">All-time earned</div>
              <div className="text-[16px] font-semibold tabular-nums text-success">{formatCurrencySimple(stats.earned)}</div>
            </div>
            <div className="rounded-md border border-border bg-muted/20 p-2.5 min-w-0">
              <div className="text-[10px] text-muted-foreground uppercase">Best campaign</div>
              {stats.bestCampaignId && stats.bestCampaignTitle ? (
                <Link to={`/creator/campaigns/${stats.bestCampaignId}`} className="text-[12px] font-medium text-primary truncate block hover:underline">
                  {stats.bestCampaignTitle}
                </Link>
              ) : (
                <span className="text-[12px] text-muted-foreground">—</span>
              )}
            </div>
          </div>
        ) : null}

        <div className="mt-5 space-y-2">
          <div className="text-[11px] font-medium text-foreground">Recent activity</div>
          <ul className="space-y-2">
            {recent.length === 0 ? (
              <li className="text-[11px] text-muted-foreground">No submissions yet</li>
            ) : (
              recent.map((s: any) => (
                <li key={s.id} className="flex flex-wrap gap-x-2 gap-y-1 text-[11px] border border-border rounded-md p-2 bg-muted/15">
                  <span className="font-medium truncate max-w-[140px]">{s.campaignTitle ?? "Campaign"}</span>
                  <span className="text-muted-foreground">{PLATFORM_ICONS[s.platform]}</span>
                  <span className="tabular-nums">{formatViewCount(Number(s.manual_views ?? 0))} views</span>
                  <Badge variant="outline" className="text-[9px] h-5 px-1.5">
                    {submissionStatusLabel(s.status)}
                  </Badge>
                </li>
              ))
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}
