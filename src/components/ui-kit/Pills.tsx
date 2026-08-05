import { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type PillOption = { value: string; label: string; count?: number };

/** Horizontally scrolling pill rail — the app's single filter control. */
export function FilterPills({
  options,
  value,
  onChange,
  leading,
  className,
}: {
  options: PillOption[];
  value: string;
  onChange: (v: string) => void;
  leading?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("no-scrollbar -mx-4 flex items-center gap-2 overflow-x-auto px-4 md:mx-0 md:px-0", className)}>
      {leading}
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          data-active={value === o.value}
          onClick={() => onChange(o.value)}
          className="chip"
        >
          {o.label}
          {typeof o.count === "number" && (
            <span className="rounded-full bg-foreground/10 px-1.5 py-0.5 text-[11px] tabular-nums">{o.count}</span>
          )}
        </button>
      ))}
    </div>
  );
}

/** Underlined tab row (Details / Activity / Leaderboard, Campaigns / Submissions). */
export function UnderlineTabs({
  options,
  value,
  onChange,
  className,
}: {
  options: PillOption[];
  value: string;
  onChange: (v: string) => void;
  className?: string;
}) {
  return (
    <div className={cn("relative flex items-stretch border-b border-border/70", className)}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            aria-current={active ? "true" : undefined}
            className={cn(
              "relative flex-1 md:flex-none md:px-1 md:mr-8 pb-3 pt-1 text-[15px] font-semibold transition-colors duration-200 focus-ring rounded-t-lg",
              active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <span className="inline-flex items-center gap-2">
              {o.label}
              {typeof o.count === "number" && (
                <span className="rounded-full bg-foreground/10 px-2 py-0.5 text-[11.5px] font-medium tabular-nums">
                  {o.count}
                </span>
              )}
            </span>
            <span
              className={cn(
                "absolute inset-x-0 -bottom-px h-0.5 rounded-full transition-all duration-300 ease-out",
                active ? "scale-x-100 bg-foreground" : "scale-x-0 bg-transparent",
              )}
            />
          </button>
        );
      })}
    </div>
  );
}
