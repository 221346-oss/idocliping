import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function AdminWithdrawals() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const { data } = await supabase
      .from("withdrawal_requests")
      .select("*")
      .order("created_at", { ascending: false });
    const ids = Array.from(new Set((data ?? []).map((r: any) => r.creator_id)));
    const { data: profs } = ids.length ? await supabase.from("profiles").select("user_id, full_name").in("user_id", ids) : { data: [] as any[] };
    const map = new Map((profs ?? []).map((p: any) => [p.user_id, p.full_name]));
    setRows((data ?? []).map((r: any) => ({ ...r, _creatorName: map.get(r.creator_id) })));
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const update = async (id: string, status: string) => {
    if (!user) return;
    await supabase.from("withdrawal_requests").update({ status: status as any, reviewed_by: user.id, reviewed_at: new Date().toISOString() }).eq("id", id);
    toast({ title: `Marked ${status}` });
    load();
  };

  return (
    <AppLayout>
      <PageHeader title="Withdrawals" description="Approve, reject, or mark withdrawal requests as paid." />
      <div className="p-6">
        {loading ? <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div> :
        rows.length === 0 ? <div className="text-center text-[13px] text-muted-foreground py-12">No withdrawal requests.</div> :
        <div className="border border-border rounded-md overflow-hidden">
          <table className="w-full text-[13px]">
            <thead className="bg-muted/30 text-muted-foreground text-[11px] uppercase tracking-wide">
              <tr><th className="text-left p-3">Creator</th><th className="text-right p-3">Amount</th><th className="text-left p-3">Method</th><th className="text-left p-3">Details</th><th className="text-left p-3">Status</th><th className="text-right p-3">Actions</th></tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.id} className="border-t border-border">
                  <td className="p-3">{r.profiles?.full_name ?? "—"}</td>
                  <td className="p-3 text-right">${Number(r.amount).toFixed(2)}</td>
                  <td className="p-3 capitalize">{r.method}</td>
                  <td className="p-3 max-w-[260px] truncate text-muted-foreground">{(r.payout_details as any)?.detail}</td>
                  <td className="p-3 capitalize">{r.status}</td>
                  <td className="p-3 text-right">
                    {r.status === "pending" && <div className="inline-flex gap-1">
                      <Button size="sm" variant="outline" onClick={() => update(r.id, "approved")}>Approve</Button>
                      <Button size="sm" variant="outline" onClick={() => update(r.id, "rejected")}>Reject</Button>
                    </div>}
                    {r.status === "approved" && <Button size="sm" onClick={() => update(r.id, "paid")}>Mark paid</Button>}
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
