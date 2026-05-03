import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { Loader2 } from "lucide-react";

export default function CreatorMarketplace() {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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

  return (
    <AppLayout>
      <PageHeader title="Marketplace" description="Active campaigns you can join right now." />
      <div className="p-6">
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : campaigns.length === 0 ? (
          <div className="text-center text-[13px] text-muted-foreground py-12">No active campaigns yet. Check back soon.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {campaigns.map((c) => (
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
