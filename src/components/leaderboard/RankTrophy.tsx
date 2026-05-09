import { cn } from "@/lib/utils";
import { Trophy } from "lucide-react";

type Variant = "gold" | "silver" | "bronze" | "none";

const variantClass: Record<Exclude<Variant, "none">, string> = {
  gold: "text-warning drop-shadow-[0_0_10px_hsl(var(--warning)/0.35)]",
  silver: "text-muted-foreground drop-shadow-[0_0_8px_hsl(var(--foreground)/0.12)]",
  bronze: "text-destructive/80 drop-shadow-[0_0_8px_hsl(var(--destructive)/0.25)]",
};

export function RankTrophy({ rank, className }: { rank: number; className?: string }) {
  const v: Variant = rank === 1 ? "gold" : rank === 2 ? "silver" : rank === 3 ? "bronze" : "none";
  if (v === "none") return <span className={cn("tabular-nums text-muted-foreground font-medium", className)}>{rank}</span>;

  return (
    <span className={cn("inline-flex items-center justify-center gap-0.5", className)}>
      <svg className="w-5 h-5 shrink-0 opacity-90" viewBox="0 0 24 24" aria-hidden>
        <ellipse cx="12" cy="18" rx="9" ry="2.5" className="fill-muted/40" />
      </svg>
      <Trophy className={cn("w-5 h-5 relative z-[1]", variantClass[v])} strokeWidth={2} />
    </span>
  );
}

export function rankRowTint(rank: number): string {
  if (rank === 1) return "bg-warning/10";
  if (rank === 2) return "bg-muted/35";
  if (rank === 3) return "bg-destructive/5";
  return "";
}
