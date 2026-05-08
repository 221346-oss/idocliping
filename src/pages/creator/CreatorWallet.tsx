import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Wallet as WalletIcon, Share2, Copy, Receipt, Users } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/EmptyState";
import { TableSkeleton } from "@/components/Skeletons";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

const MIN_WITHDRAWAL = 50;
const schema = z.object({
  amount: z.number().min(MIN_WITHDRAWAL, `Minimum withdrawal is $${MIN_WITHDRAWAL}`),
  method: z.enum(["paypal", "usdt", "bank"]),
  detail: z.string().trim().min(3, "Required").max(500),
});

const generateCode = () => Math.random().toString(36).slice(2, 8).toUpperCase();

function WalletTab() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [balance, setBalance] = useState(0);
  const [totalEarned, setTotalEarned] = useState(0);
  const [totalWithdrawn, setTotalWithdrawn] = useState(0);
  const [pendingPayouts, setPendingPayouts] = useState(0);
  const [requests, setRequests] = useState<any[]>([]);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<"paypal" | "usdt" | "bank">("paypal");
  const [detail, setDetail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!user) return;
    const [{ data: earnings }, { data: reqs }] = await Promise.all([
      supabase.from("earnings").select("amount").eq("creator_id", user.id),
      supabase.from("withdrawal_requests").select("*").eq("creator_id", user.id).order("created_at", { ascending: false }),
    ]);
    const earned = (earnings ?? []).reduce((a: number, b: any) => a + Number(b.amount), 0);
    const pendingPaid = (reqs ?? []).filter((r: any) => r.status !== "rejected").reduce((a: number, b: any) => a + Number(b.amount), 0);
    const withdrawn = (reqs ?? []).filter((r: any) => r.status === "paid").reduce((a: number, b: any) => a + Number(b.amount), 0);
    const pending = (reqs ?? []).filter((r: any) => r.status === "pending" || r.status === "approved").reduce((a: number, b: any) => a + Number(b.amount), 0);
    
    setTotalEarned(earned);
    setTotalWithdrawn(withdrawn);
    setPendingPayouts(pending);
    setBalance(earned - pendingPaid);
    setRequests(reqs ?? []);
    setLoading(false);
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

  if (loading) {
    return (
      <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <div className="border border-border rounded-md p-4 space-y-2"><Skeleton className="h-3 w-28" /><Skeleton className="h-8 w-32" /><Skeleton className="h-3 w-36" /></div>
          <div className="border border-border rounded-md p-4 space-y-3"><Skeleton className="h-4 w-32" /><Skeleton className="h-8 w-full" /><Skeleton className="h-8 w-full" /><Skeleton className="h-8 w-full" /><Skeleton className="h-9 w-full" /></div>
        </div>
        <div className="lg:col-span-2"><TableSkeleton rows={4} cols={4} /></div>
      </div>
    );
  }

  return (
    <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
      <div className="lg:col-span-1 space-y-4">
        <div className="border border-border rounded-md p-4 relative overflow-hidden">
          <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-primary/10 animate-float" />
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
          {requests.length === 0 ? (
            <EmptyState
              icon={Receipt}
              title="No withdrawals yet"
              description="When your balance crosses the minimum threshold, request a payout and track it here."
              className="py-10"
            />
          ) :
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
  );
}

function ReferralsTab() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [code, setCode] = useState<string>("");
  const [referred, setReferred] = useState<any[]>([]);
  const [earnings, setEarnings] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      let { data: codeRow } = await supabase.from("referral_codes").select("*").eq("user_id", user.id).maybeSingle();
      if (!codeRow) {
        const newCode = generateCode();
        const { data } = await supabase.from("referral_codes").insert({ user_id: user.id, code: newCode }).select().single();
        codeRow = data;
      }
      setCode(codeRow?.code ?? "");

      const [{ data: refs }, { data: earn }] = await Promise.all([
        supabase.from("referrals").select("*").eq("referrer_id", user.id),
        supabase.from("earnings").select("amount").eq("creator_id", user.id).eq("type", "referral"),
      ]);
      setReferred(refs ?? []);
      setEarnings((earn ?? []).reduce((a: number, b: any) => a + Number(b.amount), 0));
      setLoading(false);
    })();
  }, [user]);

  const link = `${window.location.origin}/auth?ref=${code}`;

  if (loading) return (
    <div className="p-6 space-y-6">
      <Skeleton className="h-4 w-80" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {[0,1,2].map(i => <div key={i} className="border border-border rounded-md p-4 space-y-2"><Skeleton className="h-3 w-24" /><Skeleton className="h-7 w-32" /></div>)}
      </div>
      <Skeleton className="h-20 w-full" />
    </div>
  );

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <p className="text-[13px] text-muted-foreground">Invite creators and earn 5% commission on their earnings.</p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="border border-border rounded-md p-4 transition-colors hover:border-primary/40">
          <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Your code</div>
          <div className="text-[22px] font-mono mt-1">{code}</div>
        </div>
        <div className="border border-border rounded-md p-4 transition-colors hover:border-primary/40">
          <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Referred users</div>
          <div className="text-[22px] font-semibold mt-1">{referred.length}</div>
        </div>
        <div className="border border-border rounded-md p-4 transition-colors hover:border-primary/40">
          <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Commission earned</div>
          <div className="text-[22px] font-semibold mt-1">${earnings.toFixed(2)}</div>
        </div>
      </div>

      <div className="border border-border rounded-md p-4 space-y-2">
        <div className="text-[12px] text-muted-foreground">Share this link</div>
        <div className="flex gap-2">
          <Input readOnly value={link} className="h-8 text-[13px] font-mono" />
          <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(link); toast({ title: "Copied!" }); }} className="transition-transform hover:scale-105">
            <Copy className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {referred.length === 0 && (
        <EmptyState
          icon={Users}
          title="No referrals yet"
          description="Share your link with fellow creators. You'll earn 5% on every dollar they make — for life."
          className="py-8"
        />
      )}
    </div>
  );
}

export default function CreatorWallet() {
  return (
    <AppLayout>
      <div className="flex flex-col h-full">
        <div className="px-4 md:px-6 h-11 border-b border-border flex items-center shrink-0">
          <h1 className="text-[13px] font-medium">Wallet</h1>
        </div>

        <div className="flex-1 overflow-auto">
          <Tabs defaultValue="wallet" className="flex flex-col md:flex-row h-full">
            <div className="md:w-44 shrink-0 border-b md:border-b-0 md:border-r border-border">
              <TabsList className="flex md:flex-col items-stretch w-full bg-transparent h-auto p-1.5 gap-px">
                <TabsTrigger value="wallet" className="justify-start gap-1.5 text-[12px] h-7 px-2 data-[state=active]:bg-muted w-full">
                  <WalletIcon className="h-3.5 w-3.5" /> Balance
                </TabsTrigger>
                <TabsTrigger value="referrals" className="justify-start gap-1.5 text-[12px] h-7 px-2 data-[state=active]:bg-muted w-full">
                  <Share2 className="h-3.5 w-3.5" /> Referrals
                </TabsTrigger>
              </TabsList>
            </div>
            <div className="flex-1 min-w-0">
              <TabsContent value="wallet" className="m-0"><WalletTab /></TabsContent>
              <TabsContent value="referrals" className="m-0"><ReferralsTab /></TabsContent>
            </div>
          </Tabs>
        </div>
      </div>
    </AppLayout>
  );
}
