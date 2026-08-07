import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ArtworkBackground } from "@/components/media/ThemeArtwork";
import { cn } from "@/lib/utils";

type TrendingCampaign = {
  id: string;
  title: string;
  category: string | null;
  budget_total: number | string | null;
  budget_remaining: number | string | null;
  thumbnail_url: string | null;
};

function usedPercent(c: TrendingCampaign) {
  const total = Number(c.budget_total ?? 0);
  const remaining = Number(c.budget_remaining ?? 0);
  if (!(total > 0)) return 0;
  return Math.max(0, Math.min(100, Math.round(((total - remaining) / total) * 100)));
}

function GlassCampaignCard({ c }: { c: TrendingCampaign }) {
  const used = usedPercent(c);
  const total = Number(c.budget_total ?? 0);

  return (
    <Link
      to="/auth"
      className={cn(
        "glass-card group flex w-[172px] shrink-0 flex-col overflow-hidden !rounded-[22px] p-0",
        "transition-[transform,box-shadow] duration-300 ease-out hover:-translate-y-1.5",
        "hover:shadow-[0_28px_60px_-18px_hsl(var(--primary)/0.45)]",
      )}
    >
      <div className="relative h-[104px] overflow-hidden bg-foreground/[0.06]">
        {c.thumbnail_url ? (
          <img
            src={c.thumbnail_url}
            alt=""
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center px-3 text-center text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            {c.category ?? "Campaign"}
          </div>
        )}
        {c.category && (
          <span className="absolute inset-x-0 bottom-0 bg-background/50 px-2 py-1 text-center text-[10px] font-semibold capitalize leading-none text-primary backdrop-blur-md">
            {c.category}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-3 pt-2.5">
        <p className="mb-1 line-clamp-1 text-[12px] font-bold text-foreground">{c.title}</p>
        <p className="mb-2 text-[11px] font-medium text-muted-foreground">${total.toLocaleString()}</p>
        <div className="h-[3px] w-full overflow-hidden rounded-full bg-foreground/10">
          <div className="h-full rounded-full bg-primary transition-[width] duration-700" style={{ width: `${used}%` }} />
        </div>
        <p className="mt-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{used}% used</p>
      </div>
    </Link>
  );
}

function CardSkeleton() {
  return (
    <div className="glass-card h-[228px] w-[172px] shrink-0 !rounded-[22px] opacity-60">
      <div className="skeleton-block h-[104px] w-full rounded-t-[22px]" />
    </div>
  );
}

/** Auto-sliding glass rail of live campaigns, sitting on the theme artwork. */
export function TrendingRail() {
  const [campaigns, setCampaigns] = useState<TrendingCampaign[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.rpc("public_trending_campaigns", { p_limit: 12 });
      if (!cancelled) setCampaigns((data ?? []) as TrendingCampaign[]);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  /**
   * Repeat the fetched campaigns until the track is at least ~2 screens wide,
   * then duplicate the whole track so the -50% marquee loops seamlessly. This
   * keeps the rail full even when only one or two campaigns are live.
   */
  const loop = useMemo(() => {
    if (!campaigns?.length) return [];
    const cardWidth = 188; // 172px card + 16px gap
    const viewport = typeof window !== "undefined" ? window.innerWidth : 1280;
    const needed = Math.max(campaigns.length, Math.ceil((viewport * 2) / cardWidth));
    const filled = Array.from({ length: needed }, (_, i) => campaigns[i % campaigns.length]);
    return [...filled, ...filled];
  }, [campaigns]);


  return (
    <section className="relative z-10 overflow-hidden px-0 py-14 sm:py-20">
      <ArtworkBackground />
      <div className="pointer-events-none absolute inset-0 bg-background/55" aria-hidden />

      <div className="relative mx-auto max-w-[1200px]">
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-background to-transparent sm:w-24" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-background to-transparent sm:w-24" />

        {campaigns === null ? (
          <div className="flex gap-4 px-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        ) : campaigns.length === 0 ? (
          <p className="px-6 text-center text-[13px] text-muted-foreground">
            New campaigns drop regularly — check back soon.
          </p>
        ) : (
          <div className="group/rail flex w-max gap-4 px-6 motion-safe:animate-marquee hover:[animation-play-state:paused] motion-reduce:animate-none motion-reduce:overflow-x-auto">
            {loop.map((c, i) => (
              <GlassCampaignCard key={`${c.id}-${i}`} c={c} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
