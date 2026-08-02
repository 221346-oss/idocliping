import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Compass } from "lucide-react";
import { CampaignGridSkeleton } from "@/components/Skeletons";
import { EmptyState } from "@/components/EmptyState";
import { cn } from "@/lib/utils";

const CATEGORIES = ["all", "music", "logo", "clipping", "ugc"] as const;
const PLATFORMS = ["tiktok", "instagram", "youtube", "x"] as const;

const PLATFORM_LABEL: Record<(typeof PLATFORMS)[number], string> = {
  tiktok: "TikTok",
  instagram: "Instagram",
  youtube: "YouTube",
  x: "X",
};

export default function CreatorMarketplace() {
  const { user } = useAuth();
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [participantCounts, setParticipantCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("all");
  const [platforms, setPlatforms] = useState<string[]>([...PLATFORMS]);
  const [sort, setSort] = useState("newest");

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("campaigns")
        .select("*, brands(name, logo_url)")
        .eq("status", "active")
        .order("created_at", { ascending: false });
      setCampaigns(data ?? []);
      if (data && data.length) {
        const ids = data.map((c: any) => c.id);
        const { data: parts } = await (supabase as any)
          .from("public_campaign_participant_counts")
          .select("campaign_id, participant_count")
          .in("campaign_id", ids);
        const counts: Record<string, number> = {};
        (parts ?? []).forEach((p: any) => { counts[p.campaign_id] = Number(p.participant_count ?? 0); });
        setParticipantCounts(counts);
      }
      setLoading(false);
    })();
  }, []);

  const togglePlatform = (p: string) => {
    setPlatforms((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));
  };

  const filtered = useMemo(() => {
    let list = campaigns.filter((c) => {
      if (category !== "all" && c.category?.toLowerCase() !== category) return false;
      const cp = (c.platforms ?? []) as string[];
      if (cp.length && !cp.some((plat) => platforms.includes(plat.toLowerCase()))) return false;
      return true;
    });
    if (sort === "newest") list = [...list].sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
    if (sort === "payout") list = [...list].sort((a, b) => Number(b.payout_per_1m_views) - Number(a.payout_per_1m_views));
    if (sort === "budget") list = [...list].sort((a, b) => Number(b.budget_remaining) - Number(a.budget_remaining));
    return list;
  }, [campaigns, category, platforms, sort]);

  const isNew = (c: any) => {
    const created = +new Date(c.created_at);
    return Date.now() - created < 1000 * 60 * 60 * 24 * 7;
  };

  return (
    <AppLayout>
      <PageHeader
        title="Explore"
        description="Active campaigns you can join right now."
        actions={
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <span className="text-[12px] text-muted-foreground hidden sm:inline">Sort</span>
              <Select value={sort} onValueChange={setSort}>
                <SelectTrigger className="h-8 text-[12px] w-[130px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest</SelectItem>
                  <SelectItem value="payout">Highest payout</SelectItem>
                  <SelectItem value="budget">Biggest budget</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        }
      />

      <div className="px-6 pt-4">
        <div className="flex flex-wrap items-center gap-x-1 gap-y-1 border-b border-border pb-2">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c)}
              className={cn(
                "px-2.5 h-7 text-[11px] capitalize rounded-md border border-transparent -mb-px transition-colors",
                category === c
                  ? "border-primary/50 bg-primary/10 text-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/60",
              )}
            >
              {c}
            </button>
          ))}
          <span className="h-4 w-px bg-border mx-0.5 shrink-0 hidden sm:block" aria-hidden />
          <span className="w-full sm:w-auto sm:ml-0 text-[10px] uppercase tracking-wide text-muted-foreground sm:hidden basis-full pt-1">
            Platforms
          </span>
          {PLATFORMS.map((p) => {
            const on = platforms.includes(p);
            return (
              <button
                key={p}
                type="button"
                onClick={() => togglePlatform(p)}
                className={cn(
                  "px-2 h-7 text-[11px] rounded-full border transition-colors shrink-0",
                  on
                    ? "border-primary/60 bg-primary/10 text-foreground"
                    : "border-border text-muted-foreground hover:border-muted-foreground/40 hover:text-foreground",
                )}
              >
                {PLATFORM_LABEL[p]}
              </button>
            );
          })}
          <span className="text-[12px] text-muted-foreground ml-auto whitespace-nowrap">
            {filtered.length} of {campaigns.length} campaigns
          </span>
        </div>
      </div>

      <div className="p-6 pt-4">
        {loading ? (
          <CampaignGridSkeleton count={8} />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Compass}
            title={campaigns.length === 0 ? "No campaigns live yet" : "No matches found"}
            description={
              campaigns.length === 0
                ? "New campaigns drop regularly. Check back soon — or follow your favorite brands to get notified."
                : "Try clearing a filter or switching categories to discover more campaigns."
            }
            actionLabel={campaigns.length === 0 ? undefined : "Reset filters"}
            onAction={
              campaigns.length === 0 ? undefined : () => { setCategory("all"); setPlatforms([...PLATFORMS]); }
            }
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 animate-fade-in">
            {filtered.map((c) => {
              const used =
                Number(c.budget_total) > 0
                  ? Math.min(
                      100,
                      Math.round(
                        ((Number(c.budget_total) - Number(c.budget_remaining)) / Number(c.budget_total)) * 100,
                      ),
                    )
                  : 0;
              return (
                <div
                  key={c.id}
                  className="border border-border rounded-md bg-card overflow-hidden flex flex-col transition-all duration-200 hover:border-primary/40 hover:shadow-lg hover:-translate-y-0.5 animate-scale-in"
                >
                  <div className="p-3">
                    <div className="flex gap-3">
                      <div className="w-24 h-24 shrink-0 bg-muted rounded relative overflow-hidden">
                        {c.thumbnail_url ? (
                          <img src={c.thumbnail_url} alt={c.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[9px] text-muted-foreground uppercase tracking-wide px-1 text-center">
                            {c.category}
                          </div>
                        )}
                        <div className="absolute bottom-1 left-1 flex gap-1 items-start max-w-[calc(100%-8px)] pointer-events-none">
                          {c.category && (
                            <span className="text-[6.5px] leading-tight uppercase tracking-wider px-1 py-[1px] rounded-sm font-medium bg-background/90 text-muted-foreground border border-border/90">
                              {c.category}
                            </span>
                          )}
                          {isNew(c) && (
                            <span className="text-[6.5px] leading-tight uppercase tracking-wider px-1 py-[1px] rounded-sm font-medium bg-primary/25 text-primary border border-primary/50">
                              New
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0 space-y-2">
                        <h3 className="text-[14px] font-semibold leading-tight line-clamp-2">{c.title}</h3>
                        <div className="space-y-1 text-[11px]">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Creators</span>
                            <span className="font-medium">{participantCounts[c.id] ?? 0}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Budget</span>
                            <span className="font-medium">${Number(c.budget_total).toFixed(0)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Budget Used</span>
                            <span className="font-medium">{used}%</span>
                          </div>
                        </div>
                        <div className="h-1 bg-muted rounded overflow-hidden">
                          <div className="h-full bg-primary" style={{ width: `${used}%` }} />
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="border-t border-border p-3 flex items-center justify-between mt-auto">
                    <div>
                      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Rate per 1M Views</div>
                      <div className="text-[15px] font-semibold">${Number(c.payout_per_1m_views).toFixed(2)}</div>
                    </div>
                    <Link to={`/creator/campaigns/${c.id}`}>
                      <Button size="sm" className="h-8 text-[12px]">
                        Details
                      </Button>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
