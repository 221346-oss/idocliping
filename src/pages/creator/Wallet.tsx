import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { CreatorShell, PageContainer, PageTitle } from "@/components/shell/CreatorShell";
import { EmptyState } from "@/components/EmptyState";
import { RowListSkeleton, StatBlockSkeleton } from "@/components/ui-kit/Skeletons";
import { useToast } from "@/hooks/use-toast";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  ArrowLeft,
  ChevronRight,
  Gift,
  Info,
  Loader2,
  Receipt,
  TrendingUp,
} from "lucide-react";
import { z } from "zod";

export const MIN_WITHDRAWAL = 50;

export const WITHDRAW_METHODS = [
  { value: "paypal", label: "PayPal", hint: "PayPal email address", note: "1–3 business days" },
  { value: "bank", label: "Amazon Gift Card", hint: "Email for the gift card", note: "Delivered by email" },
  { value: "bank_card", label: "Visa Prepaid Card", hint: "Full name and email", note: "Virtual card by email" },
  { value: "usdt", label: "USDT (ERC20)", hint: "ERC20 wallet address", note: "Network fees apply" },
] as const;

/** Maps the display method onto the DB `withdrawal_method` enum. */
const DB_METHOD: Record<string, "paypal" | "usdt" | "bank"> = {
  paypal: "paypal",
  usdt: "usdt",
  bank: "bank",
  bank_card: "bank",
};

const schema = z.object({
  amount: z.number().min(MIN_WITHDRAWAL, `Minimum withdrawal is $${MIN_WITHDRAWAL}`),
  detail: z.string().trim().min(3, "Payout details are required").max(500),
});

export const money = (n: number) =>
  n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export type LedgerEntry = {
  id: string;
  kind: "in" | "out";
  title: string;
  status: string;
  amount: number;
  created_at: string;
};

/** Two-step withdraw sheet: pick a method, then enter amount + details. */
function WithdrawSheet({
  open,
  onOpenChange,
  balance,
  onDone,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  balance: number;
  onDone: () => void;
}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [method, setMethod] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [detail, setDetail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const active = WITHDRAW_METHODS.find((m) => m.value === method);

  useEffect(() => {
    if (!open) {
      setMethod(null);
      setAmount("");
      setDetail("");
    }
  }, [open]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !active) return;
    const parsed = schema.safeParse({ amount: Number(amount), detail });
    if (!parsed.success) {
      toast({ title: "Check the form", description: parsed.error.issues[0].message, variant: "destructive" });
      return;
    }
    if (parsed.data.amount > balance) {
      toast({
        title: "Insufficient balance",
        description: "You can't withdraw more than your available balance.",
        variant: "destructive",
      });
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("withdrawal_requests").insert({
      creator_id: user.id,
      amount: parsed.data.amount,
      method: DB_METHOD[active.value],
      payout_details: { method: active.label, detail: parsed.data.detail },
    });
    setSubmitting(false);
    if (error) {
      toast({ title: "Request failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Withdrawal requested", description: `$${money(parsed.data.amount)} is on its way for review.` });
    onOpenChange(false);
    onDone();
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-[28px] border-border bg-surface pb-8">
        <SheetHeader className="text-left">
          <SheetTitle className="flex items-center gap-2 font-display text-[20px]">
            {active && (
              <button
                type="button"
                onClick={() => setMethod(null)}
                aria-label="Back to methods"
                className="icon-pill h-8 w-8"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
            )}
            {active ? active.label : "Select Method"}
          </SheetTitle>
        </SheetHeader>

        {!active ? (
          <div className="mt-4 space-y-3">
            <p className="text-[13.5px] leading-snug text-muted-foreground">
              Choose a method to withdraw your earnings from iClips.
            </p>
            <div className="list-group">
              {WITHDRAW_METHODS.map((m) => (
                <button key={m.value} type="button" onClick={() => setMethod(m.value)} className="list-row">
                  <span className="flex-1">
                    {m.label}
                    <span className="block text-[12.5px] font-normal text-muted-foreground">{m.note}</span>
                  </span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                </button>
              ))}
            </div>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-5 space-y-5">
            <div>
              <div className="mb-2.5 text-[13px] font-semibold text-muted-foreground">Amount</div>
              <div className="surface-card flex items-center gap-2 px-4 py-3.5">
                <span className="display-figure text-[24px] text-muted-foreground">$</span>
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min={MIN_WITHDRAWAL}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  aria-label="Withdrawal amount"
                  className="display-figure w-full min-w-0 bg-transparent text-[24px] text-foreground outline-none placeholder:text-muted-foreground/50"
                />
                <button
                  type="button"
                  onClick={() => setAmount(String(Math.floor(balance * 100) / 100))}
                  className="chip shrink-0"
                >
                  Max
                </button>
              </div>
              <div className="mt-2 px-1 text-[12.5px] text-muted-foreground">
                Available ${money(balance)} · minimum ${MIN_WITHDRAWAL}
              </div>
            </div>

            <div>
              <div className="mb-2.5 text-[13px] font-semibold text-muted-foreground">{active.hint}</div>
              <input
                value={detail}
                onChange={(e) => setDetail(e.target.value)}
                placeholder={active.hint}
                aria-label={active.hint}
                maxLength={500}
                className="focus-ring h-12 w-full rounded-full border border-border bg-surface-raised px-4 text-[15px] text-foreground transition-colors placeholder:text-muted-foreground hover:border-border"
              />
            </div>

            <button type="submit" disabled={submitting} className="btn-primary-pill">
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Request withdrawal
            </button>
          </form>
        )}
      </SheetContent>
    </Sheet>
  );
}

/** Shared transaction row used on Wallet and the full ledger. */
export function TransactionRow({ entry }: { entry: LedgerEntry }) {
  const incoming = entry.kind === "in";
  return (
    <div className="flex items-center gap-3 px-4 py-3.5">
      <span
        className={
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-full border text-[15px] font-semibold " +
          (incoming ? "border-primary/35 bg-primary/[0.14] text-primary" : "border-border bg-surface-raised text-muted-foreground")
        }
      >
        $
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[14.5px] font-semibold">{entry.title}</div>
        <div className="text-[12.5px] capitalize text-muted-foreground">
          {new Date(entry.created_at).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
          {!incoming && ` · ${entry.status}`}
        </div>
      </div>
      <div
        className={
          "display-figure shrink-0 text-[15px] tabular-nums " + (incoming ? "text-primary" : "text-destructive")
        }
      >
        {incoming ? "+" : "−"}${money(Math.abs(entry.amount))}
      </div>
    </div>
  );
}

export default function CreatorWallet() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState(0);
  const [totalEarned, setTotalEarned] = useState(0);
  const [pending, setPending] = useState(0);
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [withdrawOpen, setWithdrawOpen] = useState(false);

  const load = async () => {
    if (!user) return;
    const [{ data: earnings }, { data: reqs }] = await Promise.all([
      supabase
        .from("earnings")
        .select("id, amount, type, status, created_at, submissions(campaigns(title))")
        .eq("creator_id", user.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("withdrawal_requests")
        .select("id, amount, method, status, created_at")
        .eq("creator_id", user.id)
        .order("created_at", { ascending: false }),
    ]);

    const earnRows = (earnings ?? []) as any[];
    const earned = earnRows.reduce((a, b) => a + Number(b.amount ?? 0), 0);
    // paid-out earnings are withdrawable; eligible-but-unpaid earnings sit in Pending
    const paidEarned = earnRows
      .filter((e) => e.status === "paid")
      .reduce((a, b) => a + Number(b.amount ?? 0), 0);
    const pendingEarned = earnRows
      .filter((e) => e.status !== "paid")
      .reduce((a, b) => a + Number(b.amount ?? 0), 0);

    const reqRows = (reqs ?? []) as any[];
    const reserved = reqRows
      .filter((r) => r.status !== "rejected")
      .reduce((a, b) => a + Number(b.amount ?? 0), 0);

    setTotalEarned(earned);
    setPending(pendingEarned);
    setBalance(Math.max(0, paidEarned - reserved));

    const ledger: LedgerEntry[] = [
      // Only money that actually moved into the balance shows in transactions.
      ...earnRows
        .filter((e) => e.status === "paid")
        .map((e) => ({
          id: `e-${e.id}`,
          kind: "in" as const,
          title:
            e.type === "referral"
              ? "Referral commission"
              : e.submissions?.campaigns?.title ?? "Campaign payout",
          status: "paid",
          amount: Number(e.amount ?? 0),
          created_at: e.paid_at ?? e.created_at,
        })),
      ...reqRows.map((r) => ({
        id: `w-${r.id}`,
        kind: "out" as const,
        title: `Withdrawal · ${String(r.method).toUpperCase()}`,
        status: String(r.status),
        amount: Number(r.amount ?? 0),
        created_at: r.created_at,
      })),
    ].sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));

    setEntries(ledger);
    setLoading(false);
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const recent = useMemo(() => entries.slice(0, 5), [entries]);

  return (
    <CreatorShell>
      <PageContainer>
        <PageTitle>My Balance</PageTitle>

        {loading ? (
          <div className="space-y-4">
            <StatBlockSkeleton />
            <RowListSkeleton count={4} />
          </div>
        ) : (
          <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start">
            <div className="min-w-0 space-y-3">
              {/* Balance */}
              <section className="surface-card relative overflow-hidden p-5">
                <div className="pointer-events-none absolute -right-10 -top-12 h-36 w-36 rounded-full bg-primary/20 blur-3xl" />
                <div className="relative">
                  <div className="flex items-center gap-2">
                    <div className="display-figure text-[40px] leading-none">${money(balance)}</div>
                    {pending > 0 && (
                      <span className="status-pill border-warning/35 bg-warning/[0.14] text-warning">
                        + ${money(pending)} pending
                      </span>
                    )}
                  </div>
                  <p className="mt-2.5 text-[13px] leading-snug text-muted-foreground">
                    Your pending earnings will become available once a campaign ends.
                  </p>
                  <p className="mt-1 text-[13px] text-muted-foreground">
                    Minimum withdrawal is {MIN_WITHDRAWAL}$
                  </p>

                  <button
                    type="button"
                    disabled={balance < MIN_WITHDRAWAL}
                    onClick={() => setWithdrawOpen(true)}
                    className="btn-primary-pill mt-5"
                  >
                    Withdraw
                  </button>
                </div>
              </section>

              <div className="list-group">
                <div className="list-row">
                  <span className="list-row-icon">
                    <TrendingUp className="h-[18px] w-[18px]" />
                  </span>
                  <span className="flex-1">Lifetime Earnings</span>
                  <span className="list-row-value display-figure text-foreground">${money(totalEarned)}</span>
                </div>
                <Link to="/referrals" className="list-row">
                  <span className="list-row-icon text-primary">
                    <Gift className="h-[18px] w-[18px]" />
                  </span>
                  <span className="flex-1">Earn rewards</span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                </Link>
              </div>
            </div>

            {/* Transactions */}
            <section className="min-w-0 space-y-3">
              <h2 className="px-1 font-display text-[16px] font-semibold">Transactions</h2>

              <div className="surface-card flex gap-3 p-4">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <p className="text-[12.5px] leading-snug text-muted-foreground">
                  Transactions are shown for the last 30 days. Payouts are reviewed for compliance before they are
                  released.
                </p>
              </div>

              {entries.length === 0 ? (
                <div className="surface-card">
                  <EmptyState
                    icon={Receipt}
                    title="No transactions yet"
                    description="Earnings and withdrawals will appear here as soon as they happen."
                    className="py-10"
                  />
                </div>
              ) : (
                <div className="surface-card divide-y divide-border/60 overflow-hidden">
                  {recent.map((e) => (
                    <TransactionRow key={e.id} entry={e} />
                  ))}
                </div>
              )}

              <Link to="/wallet/transactions" className="btn-outline-pill">
                All Transactions
              </Link>
            </section>
          </div>
        )}

        <WithdrawSheet open={withdrawOpen} onOpenChange={setWithdrawOpen} balance={balance} onDone={load} />
      </PageContainer>
    </CreatorShell>
  );
}
