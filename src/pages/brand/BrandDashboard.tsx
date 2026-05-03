import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { Loader2 } from "lucide-react";

export default function BrandDashboard() {
  const { user } = useAuth();
  const [brand, setBrand] = useState<any>(null);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [stats, setStats] = useState({ submissions: 0, views: 0, spent: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: b } = await supabase.from("brands").select("*").eq("owner_user_id", user.id).maybeSingle();
      setBrand(b);
      if (b) {
        const { data: cs } = await supabase.from("campaigns").select("*").eq("brand_id", b.id);
        setCampaigns(cs ?? []);
        const ids = (cs ?? []).map((c: any) => c.id);
        if (ids.length) {
          const { data: subs } = await supabase.from("submissions").select("manual_views, status, campaign_id").in("campaign_id", ids);
          const approved = (subs ?? []).filter((s: any) => s.status === "approved");
          const views = approved.reduce((a: number, b: any) => a + Number(b.manual_views), 0);
          const spent = (cs ?? []).reduce((acc: number, c: any) => acc + (Number(c.budget_total) - Number(c.budget_remaining)), 0);
          setStats({ submissions: subs?.length ?? 0, views, spent });
        }
      }
      setLoading(false);
    })();
  }, [user]);

  return (
    <AppLayout>
      <PageHeader title={brand?.name ? brand.name : "Brand dashboard"} description="Read-only view of your campaigns and performance." />
      <div className="p-6 space-y-6">
        {loading ? <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div> :
        !brand ? <div className="text-center text-[13px] text-muted-foreground py-12">No brand assigned yet. Contact the admin.</div> : <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard label="Campaigns" value={campaigns.length} />
            <StatCard label="Submissions" value={stats.submissions} />
            <StatCard label="Total views" value={stats.views.toLocaleString()} />
            <StatCard label="Spent" value={`$${stats.spent.toFixed(2)}`} />
          </div>
          <div className="border border-border rounded-md">
            <div className="px-4 h-11 flex items-center justify-between border-b border-border">
              <h3 className="text-[13px] font-medium">Campaigns</h3>
              <Link to="/brand/campaigns" className="text-[12px] text-muted-foreground hover:text-foreground">View all</Link>
            </div>
            {campaigns.length === 0 ? <div className="p-6 text-center text-[13px] text-muted-foreground">No campaigns yet.</div> :
            <ul>{campaigns.slice(0, 5).map(c => (
              <li key={c.id} className="flex items-center gap-3 px-4 h-11 border-b border-border last:border-b-0 text-[13px]">
                <span className="font-medium flex-1 truncate">{c.title}</span>
                <span className="text-[11px] uppercase tracking-wide text-muted-foreground">{c.status}</span>
                <span className="text-muted-foreground">${Number(c.budget_remaining).toFixed(0)} left</span>
              </li>
            ))}</ul>}
          </div>
        </>}
      </div>
    </AppLayout>
  );
}
