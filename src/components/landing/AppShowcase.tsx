import { ReactNode } from "react";
import { ArrowUpRight, Check, Loader2, Search, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";

/** Phone chrome used to frame the real in-app screens. */
function Phone({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "relative w-[220px] shrink-0 rounded-[2rem] border border-border bg-card p-2 sm:w-[240px]",
        className,
      )}
      style={{ boxShadow: "var(--shadow-lift)" }}
    >
      <div className="relative aspect-[9/17] w-full overflow-hidden rounded-[1.5rem] bg-background">
        <div className="absolute left-1/2 top-2 z-10 h-1.5 w-14 -translate-x-1/2 rounded-full bg-foreground/15" />
        <div className="h-full w-full px-3 pb-3 pt-6">{children}</div>
      </div>
    </div>
  );
}

function MiniCampaign({ title, pool, pct }: { title: string; pool: string; pct: number }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="h-10 w-full bg-gradient-to-br from-primary/35 to-foreground/10" />
      <div className="space-y-1 p-2">
        <p className="truncate text-[9px] font-semibold">{title}</p>
        <p className="text-[8px] text-muted-foreground">{pool}</p>
        <div className="bar-track h-1">
          <div className="bar-fill bg-primary" style={{ width: `${pct}%` }} />
        </div>
      </div>
    </div>
  );
}

/** 1 — Discover */
function ScreenDiscover() {
  return (
    <div className="flex h-full flex-col gap-2">
      <p className="font-display text-[13px] font-semibold">Discover</p>
      <div className="flex h-7 items-center gap-1.5 rounded-xl border border-border bg-surface-raised px-2">
        <Search className="h-3 w-3 text-muted-foreground" />
        <span className="text-[9px] text-muted-foreground">Search campaigns</span>
      </div>
      <div className="flex gap-1.5">
        {["All", "Clipping", "UGC"].map((t, i) => (
          <span
            key={t}
            className={cn(
              "rounded-lg px-2 py-1 text-[8px] font-semibold",
              i === 0 ? "bg-primary text-primary-foreground" : "border border-border text-muted-foreground",
            )}
          >
            {t}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        <MiniCampaign title="LADtoday" pool="$1,500 pool" pct={72} />
        <MiniCampaign title="Sienna Spiro" pool="$2,500 pool" pct={20} />
        <MiniCampaign title="Duel.com" pool="$4,000 pool" pct={42} />
        <MiniCampaign title="White Noise" pool="$5,620 pool" pct={60} />
      </div>
    </div>
  );
}

/** 2 — Submit */
function ScreenSubmit() {
  return (
    <div className="flex h-full flex-col gap-2">
      <p className="font-display text-[13px] font-semibold">Submit clip</p>
      <div className="rounded-xl border border-border bg-surface-raised p-2">
        <p className="text-[8px] text-muted-foreground">Post link</p>
        <p className="mt-0.5 truncate text-[9px] font-medium">instagram.com/reel/x9c…</p>
      </div>
      <div className="flex items-center gap-1.5 rounded-xl border border-warning/40 bg-warning/10 p-2">
        <Loader2 className="h-3 w-3 animate-spin text-warning" />
        <span className="text-[9px] font-semibold text-foreground">Processing</span>
      </div>
      <div className="flex items-center gap-1.5 rounded-xl border border-primary/45 bg-primary/10 p-2">
        <Check className="h-3 w-3 text-primary" />
        <span className="text-[9px] font-semibold text-foreground">Eligible · 128K views</span>
      </div>
      <div className="mt-auto rounded-xl bg-foreground/[0.04] p-2">
        <p className="text-[8px] text-muted-foreground">Earned from this clip</p>
        <p className="font-display text-[16px] font-semibold tabular-nums">$64.00</p>
      </div>
    </div>
  );
}

/** 3 — Wallet */
function ScreenWallet() {
  return (
    <div className="flex h-full flex-col gap-2">
      <p className="font-display text-[13px] font-semibold">Wallet</p>
      <div className="rounded-2xl border border-primary/40 bg-primary/10 p-3">
        <p className="text-[8px] uppercase tracking-wider text-muted-foreground">Available</p>
        <p className="font-display text-[22px] font-semibold leading-tight tabular-nums">$1,576</p>
        <span className="mt-1 inline-block rounded-full bg-primary/20 px-2 py-0.5 text-[8px] font-semibold">
          + $210 pending
        </span>
      </div>
      <div className="flex h-8 items-center justify-center gap-1 rounded-full bg-primary text-[9px] font-bold text-primary-foreground">
        <Wallet className="h-3 w-3" /> Withdraw
      </div>
      <div className="space-y-1.5">
        {["Payout · $420", "Payout · $180", "Payout · $96"].map((t) => (
          <div key={t} className="flex items-center justify-between rounded-lg border border-border px-2 py-1.5">
            <span className="text-[8.5px] font-medium">{t}</span>
            <ArrowUpRight className="h-2.5 w-2.5 text-primary" />
          </div>
        ))}
      </div>
    </div>
  );
}

const STEPS = [
  { n: "01", label: "Pick a campaign", screen: <ScreenDiscover /> },
  { n: "02", label: "Post & submit", screen: <ScreenSubmit /> },
  { n: "03", label: "Get paid", screen: <ScreenWallet /> },
];

export function AppShowcase() {
  return (
    <div className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-5 overflow-x-auto px-4 pb-2 sm:mx-0 sm:justify-center sm:overflow-visible sm:px-0">
      {STEPS.map((s, i) => (
        <div key={s.n} className="flex snap-center flex-col items-center gap-3">
          <Phone
            className={cn(
              "transition-transform duration-500 ease-out hover:-translate-y-2",
              i === 1 ? "sm:-translate-y-4" : "",
            )}
          >
            {s.screen}
          </Phone>
          <div className="text-center">
            <p className="text-[10px] font-bold tracking-[0.18em] text-primary">{s.n}</p>
            <p className="mt-0.5 text-[13px] font-semibold">{s.label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
