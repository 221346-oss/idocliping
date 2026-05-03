import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { Loader2 } from "lucide-react";

export default function BrandCampaigns() {
  const { user } = useAuth();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: b } = await supabase.from("brands").select("id").eq("owner_user_id", user.id).maybeSingle();
      if (b) {
        const { data } = await supabase.from("campaigns").select("*").eq("brand_id", b.id).order("created_at", { ascending: false });
        setRows(data ?? []);
      }
      setLoading(false);
    })();
  }, [user]);

  return (
    <AppLayout>
      <PageHeader title="Your campaigns" description="Admin manages campaign creation. You can view performance here." />
      <div className="p-6">
        {loading ? <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div> :
        rows.length === 0 ? <div className="text-center text-[13px] text-muted-foreground py-12">No campaigns yet.</div> :
        <div className="border border-border rounded-md overflow-hidden">
          <table className="w-full text-[13px]">
            <thead className="bg-muted/30 text-muted-foreground text-[11px] uppercase tracking-wide">
              <tr><th className="text-left p-3">Title</th><th className="text-left p-3">Category</th><th className="text-left p-3">Status</th><th className="text-right p-3">Budget</th><th className="text-right p-3">Remaining</th></tr>
            </thead>
            <tbody>
              {rows.map(c => (
                <tr key={c.id} className="border-t border-border">
                  <td className="p-3 font-medium">{c.title}</td>
                  <td className="p-3 capitalize">{c.category}</td>
                  <td className="p-3 capitalize">{c.status}</td>
                  <td className="p-3 text-right">${Number(c.budget_total).toFixed(0)}</td>
                  <td className="p-3 text-right">${Number(c.budget_remaining).toFixed(0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>}
      </div>
    </AppLayout>
  );
}
