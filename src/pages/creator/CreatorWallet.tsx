import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { CreatorShell, PageContainer, PageTitle } from "@/components/shell/CreatorShell";
import { DataRow, ListRow, ListSection, StatTrio } from "@/components/ui-kit/DataBits";
import { StatusChip } from "@/components/ui-kit/StatusChip";
import { EmptyState } from "@/components/EmptyState";
import { RowListSkeleton, StatBlockSkeleton } from "@/components/ui-kit/Skeletons";
import { useToast } from "@/hooks/use-toast";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  ArrowUpRight,
  Banknote,
  ChevronRight,
  Copy,
  Loader2,
  Receipt,
  Share2,
  Wallet as WalletIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { z } from "zod";

const MIN_WITHDRAWAL = 50;

const METHODS = [
  { value: "paypal", label: "PayPal", hint: "Email address", icon: WalletIcon },
  { value: "usdt", label: "USDT", hint: "TRC-20 wallet address", icon: Banknote },
  { value: "bank", label: "Bank", hint: "IBAN / account number", icon: Banknote },
] as const;

type Method = (typeof METHODS)[number]["value"];

const schema = z.object({
  amount: z.number().min(MIN_WITHDRAWAL, `Minimum withdrawal is $${MIN_WITHDRAWAL}`),
  method: z.enum(["paypal", "usdt", "bank"]),
  detail: z.string().trim().min(3, "Payout details are required").max(500),
});

const money = (n: number) =>
  n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const generateCode = () => Math.random().toString(36).slice(2, 8).toUpperCase();

type Withdrawal = {
  id: string;
  amount: number;
  method: string;
  status: string;
  created_at: string;
};

/** Bottom sheet that owns the whole withdrawal flow. */
function WithdrawSheet({
  balance,
  onDone,
}: {
  balance: number;
  onDone: () => void;
}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<Method>("paypal");
  const [detail, setDetail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const active = METHODS.find((m) => m.value === method)!;
  const canWithdraw = balance >= MIN_WITHDRAWAL;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const parsed = schema.safeParse({ amount: Number(amount), method, detail });
    if (!parsed.success) {
      toast({ title: "Check the form", description: parsed.error.issues[0].message, variant: "destructive" });
      return;
    }
    if (parsed.data.amount > balance) {
      toast({ title: "Insufficient balance", description: "You can't withdraw more than your available balance.", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("withdrawal_requests").insert({
      creator_id: user.id,
      amount: parsed.data.amount,
      method: parsed.data.method,
      payout_details: { detail: parsed.data.detail },
    });
    setSubmitting(false);
    if (error) {
      toast({ title: "Request failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Withdrawal requested", description: `$${money(parsed.data.amount)} is on its way for review.` });
    setAmount("");
    setDetail("");
    setOpen(false);
    onDone();
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          type="button"
          disabled={!canWithdraw}
          className="press-scale focus-ring inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-primary text-[15px] font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:pointer-events-none disabled:opacity-40"
        >
          <ArrowUpRight className="h-[18px] w-[18px]" />
          Withdraw
        </button>
      </SheetTrigger>
      <SheetContent side="bottom" className="rounded-t-3xl border-border/70 bg-surface pb-8">
        <SheetHeader className="text-left">
          <SheetTitle className="font-display text-[20px]">Withdraw funds</SheetTitle>
        </SheetHeader>

        <form onSubmit={submit} className="mt-5 space-y-6">
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
                className="display-figure w-full bg-transparent text-[24px] text-foreground outline-none placeholder:text-muted-foreground/50"
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
            <div className="mb-2.5 text-[13px] font-semibold text-muted-foreground">Method</div>
            <div className="flex flex-wrap gap-2">
              {METHODS.map((m) => (
                <button
                  key={m.value}
                  type="button"
                  data-active={method === m.value}
                  onClick={() => setMethod(m.value)}
                  className="chip"
                >
                  <m.icon className="h-[15px] w-[15px]" />
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-2.5 text-[13px] font-semibold text-muted-foreground">{active.hint}</div>
            <input
              value={detail}
              onChange={(e) => setDetail(e.target.value)}
              placeholder={active.hint}
              aria-label={active.hint}
              className="focus-ring h-12 w-full rounded-full border border-border/70 bg-surface-raised px-4 text-[15px] text-foreground transition-colors placeholder:text-muted-foreground hover:border-border"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="press-scale focus-ring inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-primary text-[15px] font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Request withdrawal
          </button>
        </form>
      </SheetContent>
    </Sheet>
  );
}

function ReferralCard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [code, setCode] = useState("");
  const [count, setCount] = useState(0);
  const [earned, setEarned] = useState(0);

  useEffect(() => {
    if (!user) return;
    (async () => {
      let { data: codeRow } = await supabase
        .from("referral_codes")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!codeRow) {
        const { data } = await supabase
          .from("referral_codes")
          .insert({ user_id: user.id, code: generateCode() })
          .select()
          .single();
        codeRow = data;
      }
      setCode(codeRow?.code ?? "");

      const [{ data: refs }, { data: earn }] = await Promise.all([
        supabase.from("referrals").select("id").eq("referrer_id", user.id),
        supabase.from("earnings").select("amount").eq("creator_id", user.id).eq("type", "referral"),
      ]);
      setCount((refs ?? []).length);
      setEarned((earn ?? []).reduce((a: number, b: { amount: number }) => a + Number(b.amount ?? 0), 0));
    })();
  }, [user]);

  const link = `${window.location.origin}/auth?ref=${code}`;

  return (
    <section className="surface-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-[16px] font-semibold">Refer & earn</h2>
          <p className="mt-1 text-[13px] leading-snug text-muted-foreground">
            5% commission on every dollar your invites make.
          </p>
        </div>
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
          <Share2 className="h-[18px] w-[18px]" />
        </span>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <div className="focus-ring flex h-12 min-w-0 flex-1 items-center rounded-full border border-border/70 bg-surface-raised px-4">
          <span className="truncate font-mono text-[13.5px] text-muted-foreground">{link}</span>
        </div>
        <button
          type="button"
          aria-label="Copy referral link"
          onClick={() => {
            navigator.clipboard.writeText(link);
            toast({ title: "Link copied" });
          }}
          className="icon-pill h-12 w-12 shrink-0"
        >
          <Copy className="h-[18px] w-[18px]" />
        </button>
      </div>

      <StatTrio
        className="mt-5"
        items={[
          { value: code || "—", label: "Your code" },
          { value: count, label: "Referrals" },
          { value: `$${money(earned)}`, label: "Commission" },
        ]}
      />
    </section>
  );
}

export default function CreatorWallet() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState(0);
  const [totalEarned, setTotalEarned] = useState(0);
  const [totalWithdrawn, setTotalWithdrawn] = useState(0);
  const [pending, setPending] = useState(0);
  const [requests, setRequests] = useState<Withdrawal[]>([]);

  const load = async () => {
    if (!user) return;
    const [{ data: earnings }, { data: reqs }] = await Promise.all([
      supabase
        .from("earnings")
        .select("amount, type, submissions(is_test_submission)")
        .eq("creator_id", user.id),
      supabase
        .from("withdrawal_requests")
        .select("*")
        .eq("creator_id", user.id)
        .order("created_at", { ascending: false }),
    ]);

    const counts = (row: { type?: string; submissions?: { is_test_submission?: boolean | null } | null }) => {
      const isTest = !!row.submissions?.is_test_submission;
      if (isTest && (row.type === "campaign" || row.type === "referral")) return false;
      return true;
    };

    const earned = (earnings ?? []).reduce((a: number, b: Record<string, unknown>) => {
      const row = {
        type: b.type as string,
        submissions: b.submissions as { is_test_submission?: boolean | null } | null,
      };
      return counts(row) ? a + Number((b.amount as number) ?? 0) : a;
    }, 0);

    const rows = (reqs ?? []) as Withdrawal[];
    const reserved = rows.filter((r) => r.status !== "rejected").reduce((a, b) => a + Number(b.amount), 0);

    setTotalEarned(earned);
    setTotalWithdrawn(rows.filter((r) => r.status === "paid").reduce((a, b) => a + Number(b.amount), 0));
    setPending(
      rows.filter((r) => r.status === "pending" || r.status === "approved").reduce((a, b) => a + Number(b.amount), 0),
    );
    setBalance(earned - reserved);
    setRequests(rows);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const recent = useMemo(() => requests.slice(0, 4), [requests]);

  return (
    <CreatorShell>
      <PageContainer>
        <PageTitle>Wallet</PageTitle>

        {loading ? (
          <div className="space-y-4">
            <StatBlockSkeleton />
            <RowListSkeleton count={4} />
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start">
            <div className="space-y-4">
              {/* Balance */}
              <section className="surface-card relative overflow-hidden p-5">
                <div className="pointer-events-none absolute -right-10 -top-12 h-36 w-36 rounded-full bg-primary/20 blur-3xl" />
                <div className="relative">
                  <div className="text-[12.5px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Available balance
                  </div>
                  <div className="display-figure mt-1.5 text-[38px] leading-none">${money(balance)}</div>
                  <div className="mt-2 text-[13px] text-muted-foreground">
                    {pending > 0 ? `$${money(pending)} pending payout` : `Minimum withdrawal $${MIN_WITHDRAWAL}`}
                  </div>

                  <div className="mt-5">
                    <WithdrawSheet balance={balance} onDone={load} />
                  </div>

                  <div className="mt-5 border-t border-border/60 pt-4">
                    <StatTrio
                      items={[
                        { value: `$${money(totalEarned)}`, label: "Earned" },
                        { value: `$${money(totalWithdrawn)}`, label: "Withdrawn" },
                        { value: `$${money(pending)}`, label: "Pending" },
                      ]}
                    />
                  </div>
                </div>
              </section>

              <ReferralCard />
            </div>

            {/* Transactions */}
            <section className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <h2 className="font-display text-[15px] font-semibold">Recent activity</h2>
                {requests.length > recent.length && (
                  <Link
                    to="/creator/wallet/transactions"
                    className="focus-ring rounded-full text-[13.5px] font-semibold text-primary hover:opacity-80"
                  >
                    View all
                  </Link>
                )}
              </div>

              {requests.length === 0 ? (
                <div className="surface-card">
                  <EmptyState
                    icon={Receipt}
                    title="No withdrawals yet"
                    description="Once your balance crosses the minimum, request a payout and track it right here."
                    className="py-10"
                  />
                </div>
              ) : (
                <div className="surface-card divide-y divide-border/60 overflow-hidden">
                  {recent.map((r) => (
                    <div key={r.id} className="flex items-center gap-3 px-4 py-3.5">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-raised text-muted-foreground">
                        <ArrowUpRight className="h-[18px] w-[18px]" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[14.5px] font-semibold capitalize">{r.method}</div>
                        <div className="text-[12.5px] text-muted-foreground">
                          {new Date(r.created_at).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="display-figure text-[15px] tabular-nums">−${money(Number(r.amount))}</div>
                        <StatusChip status={r.status} size="sm" className="mt-1" />
                      </div>
                    </div>
                  ))}
                  <ListRow
                    label="All transactions"
                    onClick={undefined}
                    href={undefined}
                    trailing={<ChevronRight className="h-4 w-4 text-muted-foreground" />}
                    className={cn("pointer-events-none opacity-0 h-0 py-0")}
                  />
                </div>
              )}

              <Link
                to="/creator/wallet/transactions"
                className="press-row focus-ring surface-card flex items-center gap-3 px-4 py-4"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-raised text-muted-foreground">
                  <Receipt className="h-[18px] w-[18px]" />
                </span>
                <span className="flex-1 text-[15px] font-medium">All transactions</span>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </Link>
            </section>
          </div>
        )}

        {!loading && (
          <ListSection className="mt-4 lg:hidden" title="Payout info">
            <div className="px-4 py-1">
              <DataRow label="Minimum withdrawal" value={`$${MIN_WITHDRAWAL}.00`} />
              <DataRow label="Processing time" value="1–3 business days" />
              <DataRow label="Fees" value="No platform fee" />
            </div>
          </ListSection>
        )}
      </PageContainer>
    </CreatorShell>
  );
}
