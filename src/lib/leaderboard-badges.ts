export type LeaderboardBadgeTier = {
  id?: string;
  tier_order: number;
  slug: string;
  title: string;
  rank_from: number;
  rank_to: number;
  perks: Record<string, unknown>;
};

/** Tier matching exact rank band (non-overlapping bands). */
export function tierForRank(rank: number, tiers: LeaderboardBadgeTier[]): LeaderboardBadgeTier | null {
  if (!Number.isFinite(rank) || rank < 1 || !tiers.length) return null;
  const sorted = [...tiers].sort((a, b) => b.tier_order - a.tier_order);
  for (const t of sorted) {
    if (rank >= t.rank_from && rank <= t.rank_to) return t;
  }
  return null;
}

export function resolveEffectiveTier(
  rank: number,
  creatorId: string,
  tiers: LeaderboardBadgeTier[],
  overrides: Map<string, number>,
): LeaderboardBadgeTier | null {
  const forced = overrides.get(creatorId);
  if (forced != null) {
    const t = tiers.find((x) => x.tier_order === forced);
    if (t) return t;
  }
  return tierForRank(rank, tiers);
}

export function formatPerkLines(perks: Record<string, unknown>): string[] {
  const lines: string[] = [];
  const w = perks.withdrawal_minimum_reduction_usd;
  if (typeof w === "number" && w > 0) lines.push(`Withdrawal minimum: −$${w} vs default`);
  else if (typeof w === "number" && w === 0) lines.push("Withdrawal minimum: standard");

  const fee = perks.platform_fee_discount_percent;
  if (typeof fee === "number" && fee > 0) lines.push(`Platform fee discount: ${fee}%`);

  const payout = perks.payout_bonus_percent;
  if (typeof payout === "number" && payout > 0) lines.push(`Payout bonus: +${payout}%`);

  const note = perks.custom_note;
  if (typeof note === "string" && note.trim()) lines.push(note.trim());

  return lines.length ? lines : ["Perks configured by admin — wallet billing hooks coming soon."];
}
