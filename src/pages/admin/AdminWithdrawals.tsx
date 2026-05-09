import { useEffect, useState } from "react";
import { formatCurrencySimple } from "@/lib/format-currency";
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
  const [realPool, setRealPool] = useState(0);
  const [simPool, setSimPool] = useState(0);

  function splitEarnings(
    earns: Array<{
      amount: number | string | null;
      type?: string;
      submissions?: { is_test_submission?: boolean | null } | null;
    }>,
  ) {
    let real = 0;
    let sim = 0;
    earns.forEach((e) => {
      const amt = Number(e.amount ?? 0);
      const flagged = !!(e.submissions?.is_test_submission);
      if (flagged) sim += amt;
      else real += amt;
    });
    return { real, sim };
  }


  const load = async () => {
    const { data } = await supabase
      .from("withdrawal_requests")
      .select("*")
      .order("created_at", { ascending: false });
    const ids = Array.from(new Set((data ?? []).map((r: any) => r.creator_id)));
    const { data: profs } = ids.length ? await supabase.from("profiles").select("user_id, full_name").in("user_id", ids) : { data: [] as any[] };
    const map = new Map((profs ?? []).map((p: any) => [p.user_id, p.full_name]));
    setRows((data ?? []).map((r: any) => ({ ...r, _creatorName: map.get(r.creator_id) })));

    const { data: earnRows } = await supabase
      .from("earnings")
      .select("amount,type,submissions(is_test_submission)")
      .limit(50000);

    const { real, sim } = splitEarnings((earnRows ?? []) as Parameters<typeof splitEarnings>[0]);
    setRealPool(real);
    setSimPool(sim);

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
      <PageHeader
        title="Withdrawals"
        description="Approve with confidence — withdrawals are rejected automatically for simulated creators."
      />
      <div className="p-6 space-y-4">
        {!loading && (
          <div className="border border-border rounded-md px-4 py-3 grid sm:grid-cols-3 gap-2 text-[13px]">
            <div>
              <span className="text-[11px] uppercase text-muted-foreground">Real payouts pool</span>
              <div className="font-semibold tabular-nums">{formatCurrencySimple(realPool)}</div>
            </div>
            <div className="sm:col-span-2">
              <span className="text-[11px] uppercase text-muted-foreground">Simulated earnings pool</span>
              <div className="font-semibold tabular-nums text-muted-foreground">
                {formatCurrencySimple(simPool)}
              </div>
              <div className="text-[11px] text-muted-foreground mt-1">
                Exclude simulated amounts from treasury planning; never payout sim rows manually.
              </div>
            </div>
          </div>
        )}
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
                  <td className="p-3">{r._creatorName ?? "—"}</td>
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
