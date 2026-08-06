import { supabase } from "@/integrations/supabase/client";
import type { Enums } from "@/integrations/supabase/types";
import {
  aggregateByCreator,
  submissionPointsFromViews,
  campaignBonusPoints,
  tierFromLifetimeEarningsUsd,
  utcMondayStart,
  utcMonthStart,
  type PeriodFilter,
  type SubmissionRow,
} from "@/lib/leaderboard-compute";

export type Scope = "platform" | "campaign" | "category";

export type LeaderboardEntry = {
  rank: number;
  creatorId: string;
  displayName: string;
  avatarUrl: string | null;
  bannerUrl: string | null;
  tier: ReturnType<typeof tierFromLifetimeEarningsUsd>;
  submissions: number;
  views: number;
  points: number;
  lifetimeEarningsUsd: number;
};

const pubSubs = () => (supabase as any).from("public_submissions");

export async function fetchSubmissionsForScope(
  scope: Scope,
  campaignId: string,
  platformFilter: string,
  categoryFilter: string,
): Promise<SubmissionRow[]> {
  if (scope === "campaign") {
    if (!campaignId) return [];
    const { data, error } = await pubSubs()
      .select("id, creator_id, campaign_id, manual_views, status, created_at, updated_at")
      .eq("campaign_id", campaignId);
    if (error) throw error;
    return (data ?? []) as SubmissionRow[];
  }
  if (scope === "platform") {
    const { data, error } = await pubSubs()
      .select("id, creator_id, campaign_id, manual_views, status, created_at, updated_at")
      .eq("platform", platformFilter as Enums<"social_platform">);
    if (error) throw error;
    return (data ?? []) as SubmissionRow[];
  }
  const cat = categoryFilter as Enums<"campaign_category">;
  const { data: camps } = await supabase.from("campaigns").select("id").eq("category", cat);
  const campIds = (camps ?? []).map((c: any) => c.id);
  if (!campIds.length) return [];
  const { data, error } = await pubSubs()
    .select("id, creator_id, campaign_id, manual_views, status, created_at, updated_at")
    .in("campaign_id", campIds);
  if (error) throw error;
  return (data ?? []) as SubmissionRow[];
}

export async function fetchLifetimeEarningsByCreator(creatorIds: string[]): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  if (!creatorIds.length) return map;
  const { data, error } = await (supabase as any)
    .from("public_creator_earnings")
    .select("creator_id, lifetime_campaign_earnings")
    .in("creator_id", creatorIds);
  if (error) throw error;
  for (const e of data ?? []) {
    map.set((e as any).creator_id as string, Number((e as any).lifetime_campaign_earnings ?? 0));
  }
  return map;
}


export function buildLeaderboard(
  submissions: SubmissionRow[],
  period: PeriodFilter,
  earningsUsd: Map<string, number>,
  profiles: Map<string, { full_name: string | null; avatar_url: string | null }>,
  cosmetics: Map<string, { avatar?: string | null; banner?: string | null }>,
): LeaderboardEntry[] {
  const ws = utcMondayStart();
  const ms = utcMonthStart();
  const agg = aggregateByCreator(submissions, period, ws, ms);

  const entries: LeaderboardEntry[] = [];
  for (const [creatorId, a] of agg) {
    const earned = earningsUsd.get(creatorId) ?? 0;
    const tier = tierFromLifetimeEarningsUsd(earned);
    const cos = cosmetics.get(creatorId);
    entries.push({
      rank: 0,
      creatorId,
      displayName: profiles.get(creatorId)?.full_name ?? "",
      avatarUrl: cos?.avatar ?? profiles.get(creatorId)?.avatar_url ?? null,
      bannerUrl: cos?.banner ?? null,
      tier,
      submissions: a.submissionsPeriod,
      views: a.viewsPeriod,
      points: a.pointsPeriod,
      lifetimeEarningsUsd: earned,
    });
  }

  entries.sort((x, y) => y.points - x.points || y.views - x.views);
  entries.forEach((e, i) => {
    e.rank = i + 1;
  });

  return entries;
}

/** All-time points for pinned row / secondary display */
export function computeAllTimePointsForSubs(subs: SubmissionRow[]): number {
  const approved = subs.filter((s) => s.status === "approved");
  let pts = 0;
  const camps = new Set<string>();
  for (const s of approved) {
    pts += submissionPointsFromViews(Number(s.manual_views ?? 0));
    camps.add(s.campaign_id);
  }
  pts += campaignBonusPoints(camps.size);
  return pts;
}

export async function fetchLeaderboardDisplayMaps(creatorIds: string[]): Promise<{
  profiles: Map<string, { full_name: string | null; avatar_url: string | null }>;
  cosmetics: Map<string, { avatar: string | null; banner: string | null }>;
}> {
  const profiles = new Map<string, { full_name: string | null; avatar_url: string | null }>();
  const cosmetics = new Map<string, { avatar: string | null; banner: string | null }>();

  if (!creatorIds.length) return { profiles, cosmetics };

  const { data: profs } = await supabase.from("profiles").select("user_id, full_name, avatar_url").in("user_id", creatorIds);
  for (const p of profs ?? []) {
    profiles.set((p as any).user_id, { full_name: (p as any).full_name ?? null, avatar_url: (p as any).avatar_url ?? null });
  }

  return { profiles, cosmetics };
}

