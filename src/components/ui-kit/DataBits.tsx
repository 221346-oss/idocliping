import { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Thin budget/progress bar with the "xx% / $total" + "$rate / 1M" line above it. */
export function ProgressRate({
  percent,
  totalLabel,
  rateLabel,
  leftCaption,
  rightCaption,
  className,
}: {
  percent: number;
  totalLabel: string;
  rateLabel?: string;
  leftCaption?: string;
  rightCaption?: string;
  className?: string;
}) {
  const pct = Math.max(0, Math.min(100, Math.round(percent)));
  return (
    <div className={cn("space-y-2", className)}>
      {(leftCaption || rightCaption) && (
        <div className="flex items-baseline justify-between text-[12.5px] text-muted-foreground">
          <span>{leftCaption}</span>
          <span>{rightCaption}</span>
        </div>
      )}
      <div className="flex items-baseline justify-between gap-3">
        <div className="text-[15px] leading-none">
          <span className="display-figure text-[17px] text-foreground">{pct}%</span>
          <span className="text-muted-foreground"> / {totalLabel}</span>
        </div>
        {rateLabel && (
          <div className="text-[15px] leading-none">
            <span className="display-figure text-[17px] text-foreground">{rateLabel}</span>
            <span className="text-muted-foreground"> / 1M</span>
          </div>
        )}
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-foreground/10">
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-700 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

/** Three evenly-split stats separated by nothing — used on Profile and Activity. */
export function StatTrio({
  items,
  className,
}: {
  items: { value: ReactNode; label: string }[];
  className?: string;
}) {
  return (
    <div className={cn("grid grid-cols-3 gap-2", className)}>
      {items.map((s) => (
        <div key={s.label} className="text-center">
          <div className="display-figure text-[19px] leading-tight">{s.value}</div>
          <div className="mt-1 text-[12.5px] leading-tight text-muted-foreground">{s.label}</div>
        </div>
      ))}
    </div>
  );
}

/** Label / value row used in every breakdown table. */
export function DataRow({
  label,
  value,
  emphasis,
  className,
}: {
  label: ReactNode;
  value: ReactNode;
  emphasis?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center justify-between gap-4 py-2.5 text-[14.5px]", className)}>
      <span className={cn(emphasis ? "font-semibold text-foreground" : "text-muted-foreground")}>{label}</span>
      <span className={cn("text-right tabular-nums", emphasis ? "font-semibold" : "text-foreground")}>{value}</span>
    </div>
  );
}

/** Grouped rounded list section (Profile settings, campaign meta). */
export function ListSection({
  children,
  title,
  className,
}: {
  children: ReactNode;
  title?: string;
  className?: string;
}) {
  return (
    <section className={cn("space-y-2", className)}>
      {title && (
        <h2 className="px-1 font-display text-[15px] font-semibold text-foreground">{title}</h2>
      )}
      <div className="surface-card divide-y divide-border/60 overflow-hidden">{children}</div>
    </section>
  );
}

export function ListRow({
  icon,
  label,
  value,
  trailing,
  onClick,
  href,
  destructive,
  className,
}: {
  icon?: ReactNode;
  label: ReactNode;
  value?: ReactNode;
  trailing?: ReactNode;
  onClick?: () => void;
  href?: string;
  destructive?: boolean;
  className?: string;
}) {
  const inner = (
    <>
      {icon && (
        <span className={cn("shrink-0", destructive ? "text-destructive" : "text-muted-foreground")}>{icon}</span>
      )}
      <span className={cn("flex-1 truncate text-left text-[15px]", destructive && "text-destructive")}>{label}</span>
      {value && <span className="shrink-0 text-[14px] text-muted-foreground">{value}</span>}
      {trailing}
    </>
  );

  const classes = cn(
    "press-row focus-ring flex w-full items-center gap-3 px-4 py-4 md:py-3.5",
    className,
  );

  if (href) {
    return (
      <a href={href} target="_blank" rel="noreferrer" className={classes}>
        {inner}
      </a>
    );
  }

  return (
    <button type="button" onClick={onClick} className={classes} disabled={!onClick}>
      {inner}
    </button>
  );
}
