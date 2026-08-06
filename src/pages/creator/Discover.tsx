import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Search, SlidersHorizontal, Compass, X, Gift } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { CreatorShell, PageContainer, PageTitle } from "@/components/shell/CreatorShell";
import { FilterPills, PillOption } from "@/components/ui-kit/Pills";
import { CampaignCard, CampaignCardData } from "@/components/ui-kit/CampaignCard";
import { CampaignListSkeleton } from "@/components/ui-kit/Skeletons";
import { EmptyState } from "@/components/EmptyState";
import { useSavedCampaigns } from "@/hooks/useSavedCampaigns";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { PLATFORM_GLYPHS } from "@/components/brand/icons/NavGlyphs";
import { cn } from "@/lib/utils";

const PLATFORMS = ["tiktok", "instagram", "youtube", "x"] as const;
const PLATFORM_LABEL: Record<string, string> = {
  tiktok: "TikTok",
  instagram: "Instagram",
  youtube: "YouTube",
  x: "X",
};

const SORTS: PillOption[] = [
  { value: "newest", label: "Newest" },
  { value: "payout", label: "Highest payout" },
  { value: "budget", label: "Biggest budget" },
];

export default function CreatorMarketplace() {
  const [campaigns, setCampaigns] = useState<CampaignCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState("all");
  const [platforms, setPlatforms] = useState<string[]>([...PLATFORMS]);
  const [sort, setSort] = useState("newest");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const { saved } = useSavedCampaigns();

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("campaigns")
        .select("*, brands(name, logo_url)")
        .eq("status", "active")
        .order("created_at", { ascending: false });
      setCampaigns((data ?? []) as CampaignCardData[]);
      setLoading(false);
    })();
  }, []);

  const categories = useMemo(() => {
    const set = new Set<string>();
    campaigns.forEach((c) => c.category && set.add(String(c.category).toLowerCase()));
    return Array.from(set).sort();
  }, [campaigns]);

  const tabs: PillOption[] = useMemo(
    () => [
      { value: "all", label: "All" },
      { value: "saved", label: "Bookmarks", count: saved.length || undefined },
      ...categories.map((c) => ({ value: c, label: c[0].toUpperCase() + c.slice(1) })),
    ],
    [categories, saved.length],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = campaigns.filter((c) => {
      if (tab === "saved" && !saved.includes(c.id)) return false;
      if (tab !== "all" && tab !== "saved" && String(c.category ?? "").toLowerCase() !== tab) return false;
      const cp = (Array.isArray(c.platforms) ? (c.platforms as string[]) : []).map((p) => p.toLowerCase());
      if (cp.length && !cp.some((p) => platforms.includes(p))) return false;
      if (q && !String(c.title ?? "").toLowerCase().includes(q)) return false;
      return true;
    });
    if (sort === "newest") list = [...list].sort((a, b) => +new Date(b.created_at ?? 0) - +new Date(a.created_at ?? 0));
    if (sort === "payout")
      list = [...list].sort((a, b) => Number(b.payout_per_1m_views ?? 0) - Number(a.payout_per_1m_views ?? 0));
    if (sort === "budget")
      list = [...list].sort((a, b) => Number(b.budget_remaining ?? 0) - Number(a.budget_remaining ?? 0));
    return list;
  }, [campaigns, tab, platforms, sort, query, saved]);

  const togglePlatform = (p: string) =>
    setPlatforms((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));

  const filtersDirty = platforms.length !== PLATFORMS.length || sort !== "newest";

  const resetAll = () => {
    setTab("all");
    setPlatforms([...PLATFORMS]);
    setSort("newest");
    setQuery("");
  };

  return (
    <CreatorShell>
      <PageContainer>
        <PageTitle
          action={
            <Link to="/rewards" aria-label="Rewards" className="icon-pill h-10 w-10">
              <Gift className="h-[18px] w-[18px]" />
            </Link>
          }
        >
          Discover
        </PageTitle>

        {/* Search + filter trigger */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search campaigns"
              aria-label="Search campaigns"
              className="h-12 w-full rounded-full border border-border/70 bg-surface-raised pl-11 pr-10 text-[15px] text-foreground placeholder:text-muted-foreground focus-ring transition-colors hover:border-border"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Clear search"
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground hover:text-foreground press-scale focus-ring"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
            <SheetTrigger asChild>
              <button
                type="button"
                aria-label="Filters"
                className={cn("icon-pill h-12 w-12 shrink-0", filtersDirty && "text-primary")}
              >
                <SlidersHorizontal className="h-[18px] w-[18px]" />
              </button>
            </SheetTrigger>
            <SheetContent side="bottom" className="rounded-t-3xl border-border/70 bg-surface pb-8">
              <SheetHeader className="text-left">
                <SheetTitle className="font-display text-[20px]">Filters</SheetTitle>
              </SheetHeader>

              <div className="mt-5 space-y-6">
                <div>
                  <div className="mb-2.5 text-[13px] font-semibold text-muted-foreground">Platforms</div>
                  <div className="flex flex-wrap gap-2">
                    {PLATFORMS.map((p) => {
                      const Glyph = PLATFORM_GLYPHS[p];
                      return (
                        <button
                          key={p}
                          type="button"
                          data-active={platforms.includes(p)}
                          onClick={() => togglePlatform(p)}
                          className="chip"
                        >
                          {Glyph && <Glyph size={15} />}
                          {PLATFORM_LABEL[p]}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <div className="mb-2.5 text-[13px] font-semibold text-muted-foreground">Sort by</div>
                  <div className="flex flex-wrap gap-2">
                    {SORTS.map((s) => (
                      <button
                        key={s.value}
                        type="button"
                        data-active={sort === s.value}
                        onClick={() => setSort(s.value)}
                        className="chip"
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={resetAll}
                    className="h-12 flex-1 rounded-full border border-border text-[15px] font-semibold press-scale focus-ring transition-colors hover:bg-accent"
                  >
                    Reset
                  </button>
                  <button
                    type="button"
                    onClick={() => setFiltersOpen(false)}
                    className="h-12 flex-1 rounded-full bg-primary text-[15px] font-semibold text-primary-foreground press-scale focus-ring transition-opacity hover:opacity-90"
                  >
                    Show {filtered.length}
                  </button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>

        <FilterPills className="mt-3.5" options={tabs} value={tab} onChange={setTab} />

        {!loading && (
          <div className="mt-3.5 px-1 text-[13px] text-muted-foreground">
            Showing {filtered.length} of {campaigns.length} campaigns
          </div>
        )}

        <div className="mt-3">

          {loading ? (
            <CampaignListSkeleton count={6} />
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={Compass}
              title={
                tab === "saved" && saved.length === 0
                  ? "No bookmarks yet"
                  : campaigns.length === 0
                    ? "No campaigns live yet"
                    : "No matches found"
              }
              description={
                tab === "saved" && saved.length === 0
                  ? "Tap the bookmark icon on a campaign to keep it here for later."
                  : campaigns.length === 0
                    ? "New campaigns drop regularly — check back soon."
                    : "Try clearing a filter or switching category."
              }
              actionLabel={campaigns.length === 0 ? undefined : "Reset filters"}
              onAction={campaigns.length === 0 ? undefined : resetAll}
            />
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {filtered.map((c, i) => (
                <CampaignCard key={c.id} campaign={c} index={i} />
              ))}
            </div>
          )}
        </div>
      </PageContainer>
    </CreatorShell>
  );
}
