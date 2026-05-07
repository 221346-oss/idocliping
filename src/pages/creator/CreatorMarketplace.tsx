import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";

const CATEGORIES = ["all", "music", "logo", "clipping", "ugc"];
const PLATFORMS = ["tiktok", "instagram", "youtube", "x"];

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
      // counts
      if (data && data.length) {
        const ids = data.map((c: any) => c.id);
        const { data: parts } = await supabase
          .from("campaign_participants")
          .select("campaign_id")
          .in("campaign_id", ids);
        const counts: Record<string, number> = {};
        (parts ?? []).forEach((p: any) => { counts[p.campaign_id] = (counts[p.campaign_id] ?? 0) + 1; });
        setParticipantCounts(counts);
      }
      setLoading(false);
    })();
  }, []);

  const togglePlatform = (p: string) => {
    setPlatforms((prev) => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);
  };

  const filtered = useMemo(() => {
    let list = campaigns.filter((c) => {
      if (category !== "all" && c.category?.toLowerCase() !== category) return false;
      const cp = (c.platforms ?? []) as string[];
      if (cp.length && !cp.some((p) => platforms.includes(p.toLowerCase()))) return false;
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
            <span className="text-[12px] text-muted-foreground">Sort by</span>
            <Select value={sort} onValueChange={setSort}>
              <SelectTrigger className="h-8 text-[12px] w-[130px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest</SelectItem>
                <SelectItem value="payout">Highest payout</SelectItem>
                <SelectItem value="budget">Biggest budget</SelectItem>
              </SelectContent>
            </Select>
          </div>
        }
      />

      <div className="px-6 pt-4 space-y-3">
        <div className="flex gap-1 border-b border-border">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`px-3 h-8 text-[12px] capitalize border-b-2 -mb-px transition-colors ${
                category === c ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-4 pt-1 pb-2">
          {PLATFORMS.map((p) => (
            <label key={p} className="flex items-center gap-1.5 cursor-pointer">
              <Checkbox checked={platforms.includes(p)} onCheckedChange={() => togglePlatform(p)} />
              <span className="text-[12px] capitalize">{p === "x" ? "X" : p}</span>
            </label>
          ))}
          <span className="text-[12px] text-muted-foreground ml-auto">
            {filtered.length} of {campaigns.length} campaigns
          </span>
        </div>
      </div>

      <div className="p-6 pt-2">
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center text-[13px] text-muted-foreground py-12">No campaigns match your filters.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((c) => {
              const used = Number(c.budget_total) > 0
                ? Math.min(100, Math.round(((Number(c.budget_total) - Number(c.budget_remaining)) / Number(c.budget_total)) * 100))
                : 0;
              return (
                <div key={c.id} className="border border-border rounded-md bg-card overflow-hidden flex flex-col">
                  <div className="p-3">
                    <div className="flex gap-3">
                      <div className="w-24 h-24 shrink-0 bg-muted rounded relative overflow-hidden">
                        {c.thumbnail_url ? (
                          <img src={c.thumbnail_url} alt={c.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[10px] text-muted-foreground uppercase tracking-wide">{c.category}</div>
                        )}
                        <div className="absolute bottom-1 left-1 flex gap-1">
                          {c.category && (
                            <span className="text-[9px] uppercase tracking-wide px-1.5 py-0.5 bg-primary text-primary-foreground rounded font-medium">
                              {c.category}
                            </span>
                          )}
                          {isNew(c) && (
                            <span className="text-[9px] uppercase tracking-wide px-1.5 py-0.5 bg-success text-success-foreground rounded font-medium">
                              New
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0 space-y-2">
                        <h3 className="text-[14px] font-semibold leading-tight line-clamp-2">{c.title}</h3>
                        <div className="space-y-1 text-[11px]">
                          <div className="flex justify-between"><span className="text-muted-foreground">Creators</span><span className="font-medium">{participantCounts[c.id] ?? 0}</span></div>
                          <div className="flex justify-between"><span className="text-muted-foreground">Budget</span><span className="font-medium">${Number(c.budget_total).toFixed(0)}</span></div>
                          <div className="flex justify-between"><span className="text-muted-foreground">Budget Used</span><span className="font-medium">{used}%</span></div>
                        </div>
                        <div className="h-1 bg-muted rounded overflow-hidden">
                          <div className="h-full bg-success" style={{ width: `${used}%` }} />
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
                      <Button size="sm" className="h-8 text-[12px]">Details</Button>
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
