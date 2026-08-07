import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export type TrendingCampaign = {
  id: string;
  title: string;
  category: string;
  budget_total: number;
  budget_remaining: number;
  thumbnail_url: string | null;
};

const FALLBACK: TrendingCampaign[] = [
  { id: "f1", title: "Clipping Sprint", category: "clipping", budget_total: 3000, budget_remaining: 2490, thumbnail_url: null },
  { id: "f2", title: "UGC Drop", category: "ugc", budget_total: 2500, budget_remaining: 2000, thumbnail_url: null },
  { id: "f3", title: "Edits Challenge", category: "edits", budget_total: 4000, budget_remaining: 2320, thumbnail_url: null },
  { id: "f4", title: "Faceless Series", category: "faceless", budget_total: 1500, budget_remaining: 600, thumbnail_url: null },
];

const money = (n: number) =>
  `$${Math.round(n).toLocaleString("en-US")}`;

function CampaignCard({ c }: { c: TrendingCampaign }) {
  const used = c.budget_total > 0 ? Math.min(100, Math.max(0, ((c.budget_total - c.budget_remaining) / c.budget_total) * 100)) : 0;
  return (
    <Link
      to="/auth"
      className={cn(
        "group relative flex w-[164px] shrink-0 flex-col overflow-hidden rounded-2xl border border-border bg-card sm:w-[210px]",
        "transition-transform duration-300 ease-out hover:-translate-y-1.5 hover:border-primary/50",
      )}
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-surface-raised">
        {c.thumbnail_url ? (
          <img
            src={c.thumbnail_url}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.06]"
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-primary/25 via-foreground/10 to-transparent" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
        <span className="absolute bottom-2 left-2 rounded-full bg-background/85 px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-[0.14em] text-foreground backdrop-blur">
          {c.category}
        </span>
      </div>
      <div className="flex flex-col gap-1.5 p-3">
        <p className="line-clamp-1 text-[12.5px] font-semibold">{c.title}</p>
        <p className="text-[12px] font-medium text-muted-foreground">{money(c.budget_total)} pool</p>
        <div className="bar-track mt-0.5">
          <div className="bar-fill bg-primary" style={{ width: `${used}%` }} />
        </div>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {Math.round(used)}% paid out
        </p>
      </div>
    </Link>
  );
}

function Row({ items, reverse, speed }: { items: TrendingCampaign[]; reverse?: boolean; speed: number }) {
  const loop = [...items, ...items];
  return (
    <div className="group/row relative overflow-hidden">
      <div
        className="flex w-max gap-3 sm:gap-4 group-hover/row:[animation-play-state:paused] motion-reduce:animate-none"
        style={{
          animation: `${reverse ? "marquee-right" : "marquee-left"} ${speed}s linear infinite`,
        }}
      >
        {loop.map((c, i) => (
          <CampaignCard key={`${c.id}-${i}`} c={c} />
        ))}
      </div>
      <div className="pointer-events-none absolute inset-y-0 left-0 w-10 bg-gradient-to-r from-background to-transparent sm:w-20" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-background to-transparent sm:w-20" />
    </div>
  );
}

export function CampaignMarquee() {
  const [items, setItems] = useState<TrendingCampaign[]>(FALLBACK);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await (supabase as any).rpc("public_trending_campaigns", { p_limit: 12 });
      if (cancelled || error) return;
      const rows = (data ?? []) as TrendingCampaign[];
      if (rows.length) setItems(rows);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const list = items.length >= 4 ? items : [...items, ...items, ...items].slice(0, 6);
  const half = Math.ceil(list.length / 2);
  const rowA = list.slice(0, half);
  const rowB = list.slice(half).length >= 2 ? list.slice(half) : list;

  return (
    <div className="space-y-3 sm:space-y-4">
      <Row items={rowA} speed={Math.max(22, rowA.length * 6)} />
      <Row items={rowB} reverse speed={Math.max(26, rowB.length * 7)} />
    </div>
  );
}
