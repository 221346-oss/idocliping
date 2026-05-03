import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

const MIN_WITHDRAWAL = 50;
const schema = z.object({
  amount: z.number().min(MIN_WITHDRAWAL, `Minimum withdrawal is $${MIN_WITHDRAWAL}`),
  method: z.enum(["paypal", "usdt", "bank"]),
  detail: z.string().trim().min(3, "Required").max(500),
});

export default function CreatorWallet() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [balance, setBalance] = useState(0);
  const [requests, setRequests] = useState<any[]>([]);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<"paypal" | "usdt" | "bank">("paypal");
  const [detail, setDetail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    if (!user) return;
    const [{ data: earnings }, { data: reqs }] = await Promise.all([
      supabase.from("earnings").select("amount").eq("creator_id", user.id),
      supabase.from("withdrawal_requests").select("*").eq("creator_id", user.id).order("created_at", { ascending: false }),
    ]);
    const earned = (earnings ?? []).reduce((a: number, b: any) => a + Number(b.amount), 0);
    const pendingPaid = (reqs ?? []).filter((r: any) => r.status !== "rejected").reduce((a: number, b: any) => a + Number(b.amount), 0);
    setBalance(earned - pendingPaid);
    setRequests(reqs ?? []);
  };

  useEffect(() => { load(); }, [user]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const parsed = schema.safeParse({ amount: Number(amount), method, detail });
    if (!parsed.success) return toast({ title: "Invalid", description: parsed.error.issues[0].message, variant: "destructive" });
    if (parsed.data.amount > balance) return toast({ title: "Insufficient balance", variant: "destructive" });
    setSubmitting(true);
    const { error } = await supabase.from("withdrawal_requests").insert({
      creator_id: user.id, amount: parsed.data.amount, method: parsed.data.method,
      payout_details: { detail: parsed.data.detail },
    });
    setSubmitting(false);
    if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    toast({ title: "Request submitted", description: "Admin will review and pay out." });
    setAmount(""); setDetail(""); load();
  };

  return (
    <AppLayout>
      <PageHeader title="Wallet" description="Request withdrawals and track payment history." />
      <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <div className="border border-border rounded-md p-4">
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Available balance</div>
            <div className="text-[28px] font-semibold mt-1">${balance.toFixed(2)}</div>
            <div className="text-[11px] text-muted-foreground mt-2">Minimum withdrawal: ${MIN_WITHDRAWAL}</div>
          </div>
          <form onSubmit={submit} className="border border-border rounded-md p-4 space-y-3">
            <h3 className="text-[13px] font-medium">Request withdrawal</h3>
            <div className="space-y-1"><Label className="text-[12px]">Amount (USD)</Label>
              <Input type="number" step="0.01" min={MIN_WITHDRAWAL} value={amount} onChange={(e) => setAmount(e.target.value)} className="h-8 text-[13px]" required />
            </div>
            <div className="space-y-1"><Label className="text-[12px]">Method</Label>
              <Select value={method} onValueChange={(v: any) => setMethod(v)}>
                <SelectTrigger className="h-8 text-[13px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="paypal">PayPal</SelectItem>
                  <SelectItem value="usdt">USDT (Crypto)</SelectItem>
                  <SelectItem value="bank">Bank transfer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1"><Label className="text-[12px]">Payout details</Label>
              <Input value={detail} onChange={(e) => setDetail(e.target.value)} placeholder="email, wallet, IBAN…" className="h-8 text-[13px]" required />
            </div>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}Request
            </Button>
          </form>
        </div>

        <div className="lg:col-span-2">
          <div className="border border-border rounded-md overflow-hidden">
            <div className="px-4 h-11 flex items-center border-b border-border"><h3 className="text-[13px] font-medium">History</h3></div>
            {requests.length === 0 ? <div className="p-6 text-center text-[13px] text-muted-foreground">No withdrawal requests yet.</div> :
            <table className="w-full text-[13px]">
              <thead className="bg-muted/30 text-muted-foreground text-[11px] uppercase tracking-wide">
                <tr><th className="text-left p-3">Date</th><th className="text-left p-3">Method</th><th className="text-right p-3">Amount</th><th className="text-left p-3">Status</th></tr>
              </thead>
              <tbody>
                {requests.map((r) => (
                  <tr key={r.id} className="border-t border-border">
                    <td className="p-3">{new Date(r.created_at).toLocaleDateString()}</td>
                    <td className="p-3 capitalize">{r.method}</td>
                    <td className="p-3 text-right">${Number(r.amount).toFixed(2)}</td>
                    <td className="p-3"><span className="text-[11px] uppercase tracking-wide">{r.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
