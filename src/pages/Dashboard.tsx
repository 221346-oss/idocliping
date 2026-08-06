import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { Megaphone, FileCheck, Wallet, Users, Ticket, TrendingUp } from "lucide-react";

type Stats = {
  activeCampaigns: number;
  pendingSubmissions: number;
  pendingWithdrawals: number;
  creators: number;
  openTickets: number;
  paidOut: number;
};

const CARDS: {
  key: keyof Stats;
  label: string;
  icon: any;
  to: string;
  money?: boolean;
}[] = [
  { key: "activeCampaigns", label: "Active campaigns", icon: Megaphone, to: "/admin/campaigns" },
  { key: "pendingSubmissions", label: "Submissions to review", icon: FileCheck, to: "/admin/submissions" },
  { key: "pendingWithdrawals", label: "Withdrawals pending", icon: Wallet, to: "/admin/withdrawals" },
  { key: "openTickets", label: "Open tickets", icon: Ticket, to: "/admin/tickets" },
  { key: "creators", label: "Creators", icon: Users, to: "/admin/users" },
  { key: "paidOut", label: "Total creator earnings", icon: TrendingUp, to: "/analytics", money: true },
];

export default function AdminOverview() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    void (async () => {
      const count = (q: any) => q.then((r: any) => r.count ?? 0);
      const [activeCampaigns, pendingSubmissions, pendingWithdrawals, creators, openTickets, earnings] =
        await Promise.all([
          count(supabase.from("campaigns").select("id", { count: "exact", head: true }).eq("status", "active")),
          count(supabase.from("submissions").select("id", { count: "exact", head: true }).eq("status", "pending")),
          count(
            supabase.from("withdrawal_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
          ),
          count(supabase.from("profiles").select("id", { count: "exact", head: true })),
          count(supabase.from("support_tickets").select("id", { count: "exact", head: true }).eq("status", "open")),
          supabase.from("earnings").select("amount"),
        ]);

      setStats({
        activeCampaigns,
        pendingSubmissions,
        pendingWithdrawals,
        creators,
        openTickets,
        paidOut: (earnings.data ?? []).reduce((a: number, b: any) => a + Number(b.amount), 0),
      });
    })();
  }, []);

  return (
    <AppLayout>
      <PageHeader title="Overview" description="Everything that needs your attention right now." />
      <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3 md:p-6">
        {CARDS.map((c) => (
          <Link
            key={c.key}
            to={c.to}
            className="rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary/40"
          >
            <div className="flex items-center gap-2 text-muted-foreground">
              <c.icon className="h-4 w-4" />
              <span className="text-[11px] uppercase tracking-wide">{c.label}</span>
            </div>
            {stats ? (
              <p className="mt-2 text-[26px] font-semibold tabular-nums">
                {c.money ? `$${stats[c.key].toFixed(2)}` : stats[c.key]}
              </p>
            ) : (
              <Skeleton className="mt-2 h-8 w-24" />
            )}
          </Link>
        ))}
      </div>
    </AppLayout>
  );
}
