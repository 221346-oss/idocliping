/** Points & leaderboard helpers — theme-agnostic math only */

export type PeriodFilter = "week" | "month" | "all";

export function utcMondayStart(d = new Date()): Date {
  const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = x.getUTCDay();
  const diff = (day + 6) % 7;
  x.setUTCDate(x.getUTCDate() - diff);
  x.setUTCHours(0, 0, 0, 0);
  return x;
}

export function utcMonthStart(d = new Date()): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1, 0, 0, 0, 0));
}

export function nextUtcMondayReset(now = new Date()): Date {
  const mon = utcMondayStart(now);
  const next = new Date(mon);
  next.setUTCDate(next.getUTCDate() + 7);
  return next;
}

export function nextUtcMonthReset(now = new Date()): Date {
  const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0, 0));
  return next;
}

export function formatResetCountdown(target: Date, now = new Date()): string {
  const ms = Math.max(0, target.getTime() - now.getTime());
  const totalH = Math.floor(ms / 3600000);
  const d = Math.floor(totalH / 24);
  const h = totalH % 24;
  return `${d}d ${h}h`;
}

/** Single approved submission point contribution */
export function submissionPointsFromViews(manualViews: number): number {
  return Math.floor(Math.max(0, manualViews) / 1000) + 50;
}

export type SubmissionRow = {
  id: string;
  creator_id: string;
  campaign_id: string;
  manual_views: number;
  status: string;
  created_at: string;
  updated_at?: string;
};

export function submissionInPeriod(s: SubmissionRow, period: PeriodFilter, weekStart: Date, monthStart: Date): boolean {
  const t = new Date(s.created_at).getTime();
  if (period === "all") return true;
  if (period === "week") return t >= weekStart.getTime();
  return t >= monthStart.getTime();
}

/** Campaign completion bonus: once per campaign with ≥1 approved submission (lifetime). */
export function campaignBonusPoints(distinctCampaignCount: number): number {
  return distinctCampaignCount * 200;
}

export type AggregatedCreator = {
  creatorId: string;
  pointsPeriod: number;
  submissionsPeriod: number;
  viewsPeriod: number;
  pointsAllTime: number;
  /** distinct campaigns with approved sub */
  campaignsApproved: number;
};

export function aggregateByCreator(
  submissions: SubmissionRow[],
  period: PeriodFilter,
  weekStart: Date,
  monthStart: Date,
): Map<string, AggregatedCreator> {
  const approved = submissions.filter((s) => s.status === "approved");
  const map = new Map<string, AggregatedCreator>();

  const ensure = (creatorId: string) => {
    if (!map.has(creatorId)) {
      map.set(creatorId, {
        creatorId,
        pointsPeriod: 0,
        submissionsPeriod: 0,
        viewsPeriod: 0,
        pointsAllTime: 0,
        campaignsApproved: 0,
      });
    }
    return map.get(creatorId)!;
  };

  const campaignsByCreator = new Map<string, Set<string>>();
  for (const s of approved) {
    if (!campaignsByCreator.has(s.creator_id)) campaignsByCreator.set(s.creator_id, new Set());
    campaignsByCreator.get(s.creator_id)!.add(s.campaign_id);
  }

  for (const s of approved) {
    const row = ensure(s.creator_id);
    const pv = Number(s.manual_views ?? 0);
    const pts = submissionPointsFromViews(pv);
    row.pointsAllTime += pts;

    if (submissionInPeriod(s, period, weekStart, monthStart)) {
      row.pointsPeriod += pts;
      row.submissionsPeriod += 1;
      row.viewsPeriod += pv;
    }
  }

  for (const [creatorId, set] of campaignsByCreator) {
    const row = ensure(creatorId);
    row.campaignsApproved = set.size;
    row.pointsAllTime += campaignBonusPoints(set.size);
  }

  if (period === "all") {
    for (const row of map.values()) {
      row.pointsPeriod = row.pointsAllTime;
    }
  }

  return map;
}

export type EarningsTier = "rookie" | "rising" | "elite" | "heroic" | "legend";

export function tierFromLifetimeEarningsUsd(totalUsd: number): EarningsTier {
  if (totalUsd >= 1500) return "legend";
  if (totalUsd >= 500) return "heroic";
  if (totalUsd >= 200) return "elite";
  if (totalUsd >= 50) return "rising";
  return "rookie";
}
