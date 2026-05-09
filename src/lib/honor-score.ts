/** Honor score calculation helpers */

export type HonorLabel = "New Creator" | "Developing" | "Trusted Creator" | "Highly Trusted" | "Elite Creator";

export function honorLabel(score: number): HonorLabel {
  if (score >= 96) return "Elite Creator";
  if (score >= 81) return "Highly Trusted";
  if (score >= 61) return "Trusted Creator";
  if (score >= 41) return "Developing";
  return "New Creator";
}

export function honorLabelColor(label: HonorLabel): string {
  switch (label) {
    case "Elite Creator":
      return "text-warning";
    case "Highly Trusted":
      return "text-success";
    case "Trusted Creator":
      return "text-primary";
    case "Developing":
      return "text-muted-foreground";
    default:
      return "text-muted-foreground";
  }
}

export interface HonorBreakdown {
  base: number;
  approvedBonus: number;
  rejectedPenalty: number;
  campaignsBonus: number;
  adminFlagPenalty: number;
  total: number;
}

export function computeHonorScore(params: {
  approvedCount: number;
  rejectedCount: number;
  campaignsCompleted: number;
  adminFlags: number;
}): HonorBreakdown {
  const base = 50;
  const approvedBonus = params.approvedCount * 2;
  const rejectedPenalty = params.rejectedCount * 10;
  const campaignsBonus = params.campaignsCompleted * 5;
  const adminFlagPenalty = params.adminFlags * 20;
  const raw = base + approvedBonus - rejectedPenalty + campaignsBonus - adminFlagPenalty;
  const total = Math.max(0, Math.min(100, raw));
  return { base, approvedBonus, rejectedPenalty, campaignsBonus, adminFlagPenalty, total };
}
