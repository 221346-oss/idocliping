import type { EarningsTier } from "@/lib/leaderboard-compute";

/** Avatar ring / accent — existing theme tokens only */
export function tierRingClass(tier: EarningsTier): string {
  switch (tier) {
    case "legend":
      return "ring-2 ring-warning/60";
    case "heroic":
      return "ring-2 ring-destructive/50";
    case "elite":
      return "ring-2 ring-secondary-foreground/35";
    case "rising":
      return "ring-2 ring-primary/55";
    default:
      return "ring-2 ring-muted-foreground/40";
  }
}
