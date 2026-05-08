import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { Loader2, Search, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

export default function CreatorMarketplace() {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter States
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [platform, setPlatform] = useState("all");
  const [sort, setSort] = useState("newest");

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("campaigns")
        .select("*, brands(name, logo_url)")
        .eq("status", "active")
        .order("created_at", { ascending: false });
      setCampaigns(data ?? []);
      setLoading(false);
    })();
  }, []);

  const filteredCampaigns = useMemo(() => {
    let result = [...campaigns];

    // Search
    if (search.trim() !== "") {
      const q = search.toLowerCase();
      result = result.filter(c => 
        c.title.toLowerCase().includes(q) || 
        c.brands?.name?.toLowerCase().includes(q) ||
        (c.description || "").toLowerCase().includes(q)
      );
    }

    // Category
    if (category !== "all") {
      result = result.filter(c => c.category === category);
    }

    // Platform
    if (platform !== "all") {
      result = result.filter(c => c.platforms?.includes(platform));
    }

    // Sort
    if (sort === "newest") {
      result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } else if (sort === "high_payout") {
      result.sort((a, b) => Number(b.payout_per_1m_views) - Number(a.payout_per_1m_views));
    } else if (sort === "trending") {
      // In absence of live view metrics in this table, proxy trending by biggest remaining budget
      result.sort((a, b) => Number(b.budget_remaining) - Number(a.budget_remaining));
    }

    return result;
  }, [campaigns, search, category, platform, sort]);

  return (
    <AppLayout>
      <PageHeader title="Marketplace" description="Active campaigns you can join right now." />
      
      {/* Filters & Search */}
      <div className="px-6 py-4 border-b border-border bg-card/50 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search campaigns or brands..." 
            className="pl-9 h-9 text-[13px] bg-background"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        
        <div className="flex w-full md:w-auto items-center gap-3 overflow-x-auto pb-1 md:pb-0">
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="h-9 w-[130px] text-[13px] bg-background"><SelectValue placeholder="Category" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="gaming">Gaming</SelectItem>
              <SelectItem value="music">Music</SelectItem>
              <SelectItem value="clipping">Clipping</SelectItem>
              <SelectItem value="logo">Logo</SelectItem>
              <SelectItem value="ugc">UGC</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>

          <Select value={platform} onValueChange={setPlatform}>
            <SelectTrigger className="h-9 w-[130px] text-[13px] bg-background"><SelectValue placeholder="Platform" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Platforms</SelectItem>
              <SelectItem value="tiktok">TikTok</SelectItem>
              <SelectItem value="instagram">Instagram</SelectItem>
              <SelectItem value="youtube">YouTube</SelectItem>
              <SelectItem value="x">X (Twitter)</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sort} onValueChange={setSort}>
            <SelectTrigger className="h-9 w-[130px] text-[13px] bg-background"><SelectValue placeholder="Sort" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest</SelectItem>
              <SelectItem value="trending">Trending</SelectItem>
              <SelectItem value="high_payout">High Payout</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="p-6">
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : filteredCampaigns.length === 0 ? (
          <div className="text-center text-[13px] text-muted-foreground py-12">No campaigns found matching your criteria.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCampaigns.map((c) => (
              <Link key={c.id} to={`/creator/campaigns/${c.id}`} className="group border border-border rounded-md overflow-hidden bg-card hover:border-foreground/40 transition-colors">
                <div className="aspect-video bg-muted relative">
                  {c.thumbnail_url ? (
                    <img src={c.thumbnail_url} alt={c.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[11px] text-muted-foreground uppercase tracking-wide">{c.category}</div>
                  )}
                  {(c.badges ?? []).length > 0 && (
                    <div className="absolute top-2 left-2 flex gap-1">
                      {c.badges.map((b: string) => (
                        <span key={b} className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 bg-foreground text-background rounded">{b}</span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{c.category}</span>
                    {c.brands?.name && <span className="text-[10px] text-muted-foreground truncate">· {c.brands.name}</span>}
                  </div>
                  <h3 className="text-[14px] font-medium text-foreground line-clamp-2">{c.title}</h3>
                  <div className="flex items-center justify-between text-[12px]">
                    <span className="text-foreground font-medium">${Number(c.payout_per_1m_views).toFixed(2)} / 1M views</span>
                    <span className="text-muted-foreground">${Number(c.budget_remaining).toFixed(0)} left</span>
                  </div>
                  {(c.platforms ?? []).length > 0 && (
                    <div className="flex gap-1 flex-wrap">
                      {c.platforms.map((p: string) => (
                        <span key={p} className="text-[10px] px-1.5 py-0.5 border border-border rounded uppercase tracking-wide text-muted-foreground">{p}</span>
                      ))}
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
