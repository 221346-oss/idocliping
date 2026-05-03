import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Check, X, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function AdminSubmissions() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Record<string, string>>({});

  const load = async () => {
    const { data } = await supabase
      .from("submissions")
      .select("*, campaigns(title, payout_per_1m_views, budget_remaining, id)")
      .order("created_at", { ascending: false });
    const ids = Array.from(new Set((data ?? []).map((r: any) => r.creator_id)));
    const { data: profs } = ids.length ? await supabase.from("profiles").select("user_id, full_name").in("user_id", ids) : { data: [] as any[] };
    const map = new Map((profs ?? []).map((p: any) => [p.user_id, p.full_name]));
    setRows((data ?? []).map((r: any) => ({ ...r, _creatorName: map.get(r.creator_id) })));
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const approve = async (row: any) => {
    if (!user) return;
    const views = Number(editing[row.id] ?? row.manual_views ?? 0);
    const payout = Number(row.campaigns?.payout_per_1m_views ?? 0);
    const earned = (views / 1_000_000) * payout;

    const { error: e1 } = await supabase.from("submissions").update({
      status: "approved", manual_views: views, reviewed_by: user.id, reviewed_at: new Date().toISOString(),
    }).eq("id", row.id);
    if (e1) return toast({ title: "Failed", description: e1.message, variant: "destructive" });

    if (earned > 0) {
      await supabase.from("earnings").insert({ creator_id: row.creator_id, submission_id: row.id, amount: earned, type: "campaign" });
      // decrement budget_remaining
      const remaining = Math.max(0, Number(row.campaigns?.budget_remaining ?? 0) - earned);
      await supabase.from("campaigns").update({ budget_remaining: remaining }).eq("id", row.campaigns.id);

      // Referral commission (5%)
      const { data: ref } = await supabase.from("referrals").select("referrer_id, commission_rate").eq("referred_user_id", row.creator_id).maybeSingle();
      if (ref) {
        await supabase.from("earnings").insert({ creator_id: ref.referrer_id, submission_id: row.id, amount: earned * Number(ref.commission_rate), type: "referral" });
      }
    }
    toast({ title: "Approved", description: `Earned $${earned.toFixed(2)}` });
    load();
  };

  const reject = async (row: any) => {
    if (!user) return;
    await supabase.from("submissions").update({ status: "rejected", reviewed_by: user.id, reviewed_at: new Date().toISOString() }).eq("id", row.id);
    toast({ title: "Rejected" });
    load();
  };

  return (
    <AppLayout>
      <PageHeader title="Submission review" description="Manually verify post views and approve payouts." />
      <div className="p-6">
        {loading ? <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div> :
        rows.length === 0 ? <div className="text-center text-[13px] text-muted-foreground py-12">No submissions yet.</div> :
        <div className="border border-border rounded-md overflow-hidden">
          <table className="w-full text-[13px]">
            <thead className="bg-muted/30 text-muted-foreground text-[11px] uppercase tracking-wide">
              <tr><th className="text-left p-3">Creator</th><th className="text-left p-3">Campaign</th><th className="text-left p-3">Post</th><th className="text-left p-3">Views</th><th className="text-left p-3">Status</th><th className="text-right p-3">Actions</th></tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.id} className="border-t border-border">
                  <td className="p-3">{r.profiles?.full_name ?? "—"}</td>
                  <td className="p-3">{r.campaigns?.title ?? "—"}</td>
                  <td className="p-3"><a href={r.post_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"><span className="capitalize">{r.platform}</span><ExternalLink className="h-3 w-3" /></a></td>
                  <td className="p-3">
                    {r.status === "pending" ? (
                      <Input type="number" defaultValue={r.manual_views} onChange={(e) => setEditing(p => ({ ...p, [r.id]: e.target.value }))} className="h-7 w-28 text-[12px]" />
                    ) : Number(r.manual_views).toLocaleString()}
                  </td>
                  <td className="p-3"><span className={`text-[11px] px-2 py-0.5 rounded uppercase tracking-wide ${
                    r.status === "approved" ? "bg-success/15 text-success" :
                    r.status === "rejected" ? "bg-destructive/15 text-destructive" :
                    "bg-warning/15 text-warning"}`}>{r.status}</span></td>
                  <td className="p-3 text-right">
                    {r.status === "pending" && <div className="inline-flex gap-1">
                      <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => approve(r)}><Check className="h-3.5 w-3.5" /></Button>
                      <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => reject(r)}><X className="h-3.5 w-3.5" /></Button>
                    </div>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>}
      </div>
    </AppLayout>
  );
}
