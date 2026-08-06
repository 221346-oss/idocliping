import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { CreatorShell, PageContainer, DetailHeader } from "@/components/shell/CreatorShell";
import { FilterPills, PillOption } from "@/components/ui-kit/Pills";
import { RowListSkeleton } from "@/components/ui-kit/Skeletons";
import { EmptyState } from "@/components/EmptyState";
import { TransactionRow } from "./CreatorWallet";
import { Receipt } from "lucide-react";


type Tx = {
  id: string;
  kind: "earning" | "withdrawal";
  label: string;
  amount: number;
  status: string;
  created_at: string;
};

const money = (n: number) =>
  n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const TABS: PillOption[] = [
  { value: "all", label: "All" },
  { value: "earning", label: "Earnings" },
  { value: "withdrawal", label: "Withdrawals" },
];

export default function CreatorTransactions() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Tx[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("all");

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: earnings }, { data: reqs }] = await Promise.all([
        supabase
          .from("earnings")
          .select("id, amount, type, created_at")
          .eq("creator_id", user.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("withdrawal_requests")
          .select("id, amount, method, status, created_at")
          .eq("creator_id", user.id)
          .order("created_at", { ascending: false }),
      ]);

      const merged: Tx[] = [
        ...(earnings ?? []).map((e: Record<string, unknown>) => ({
          id: `e-${e.id}`,
          kind: "earning" as const,
          label: e.type === "referral" ? "Referral commission" : "Campaign earning",
          amount: Number(e.amount ?? 0),
          status: "paid",
          created_at: String(e.created_at),
        })),
        ...(reqs ?? []).map((r: Record<string, unknown>) => ({
          id: `w-${r.id}`,
          kind: "withdrawal" as const,
          label: `${String(r.method ?? "")} withdrawal`,
          amount: Number(r.amount ?? 0),
          status: String(r.status ?? ""),
          created_at: String(r.created_at),
        })),
      ].sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));

      setRows(merged);
      setLoading(false);
    })();
  }, [user]);

  const filtered = useMemo(
    () => (tab === "all" ? rows : rows.filter((r) => r.kind === tab)),
    [rows, tab],
  );

  const grouped = useMemo(() => {
    const map = new Map<string, Tx[]>();
    filtered.forEach((r) => {
      const key = new Date(r.created_at).toLocaleDateString(undefined, {
        month: "long",
        year: "numeric",
      });
      map.set(key, [...(map.get(key) ?? []), r]);
    });
    return Array.from(map.entries());
  }, [filtered]);

  return (
    <CreatorShell>
      <PageContainer>
        <DetailHeader title="Transactions" />

        <FilterPills className="mt-1" options={TABS} value={tab} onChange={setTab} />

        <div className="mt-4 space-y-6">
          {loading ? (
            <RowListSkeleton count={6} />
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={Receipt}
              title="Nothing here yet"
              description="Your earnings and withdrawals will show up in this ledger."
            />
          ) : (
            grouped.map(([month, items]) => (
              <section key={month} className="space-y-2">
                <h2 className="px-1 text-[13px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {month}
                </h2>
                <div className="surface-card divide-y divide-border/60 overflow-hidden">
                  {items.map((r) => (
                    <TransactionRow
                      key={r.id}
                      entry={{
                        id: r.id,
                        kind: r.kind === "earning" ? "in" : "out",
                        title: r.label,
                        status: r.status,
                        amount: r.amount,
                        created_at: r.created_at,
                      }}
                    />
                  ))}
                </div>

              </section>
            ))
          )}
        </div>
      </PageContainer>
    </CreatorShell>
  );
}
