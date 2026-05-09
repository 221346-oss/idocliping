import { cn } from "@/lib/utils";
import type { EarningsTier } from "@/lib/leaderboard-compute";
import { Flame, Shield, Sparkles, Star, Zap } from "lucide-react";

const config: Record<
  EarningsTier,
  { label: string; Icon: typeof Star; className: string }
> = {
  rookie: {
    label: "Rookie",
    Icon: Shield,
    className: "border-muted-foreground/40 text-muted-foreground bg-muted/30",
  },
  rising: {
    label: "Rising",
    Icon: Zap,
    className: "border-primary/50 text-primary bg-primary/10",
  },
  elite: {
    label: "Elite",
    Icon: Sparkles,
    className: "border-secondary-foreground/30 text-secondary-foreground bg-secondary/50",
  },
  heroic: {
    label: "Heroic",
    Icon: Flame,
    className: "border-destructive/45 text-destructive bg-destructive/10",
  },
  legend: {
    label: "Legend",
    Icon: Star,
    className: "border-warning/55 text-warning bg-warning/10",
  },
};

export function EarningsTierBadge({ tier, compact }: { tier: EarningsTier; compact?: boolean }) {
  const { label, Icon, className } = config[tier];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        compact && "px-1.5 py-0 text-[9px]",
        className,
      )}
    >
      <Icon className="h-3 w-3 shrink-0" strokeWidth={2} />
      {label}
    </span>
  );
}
