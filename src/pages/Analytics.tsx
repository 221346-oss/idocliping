import { useEffect, useMemo, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { format, subDays, parseISO } from "date-fns";
import { useNeonCharts } from "@/hooks/use-neon-charts";
import { NeonPatternDefs } from "@/components/NeonPatternDefs";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, PieChart, Pie, Cell, LineChart, Line } from "recharts";

type SubRow = { id: string; status: string; created_at: string; manual_views: number | null; campaign_id: string };
type EarnRow = { amount: number; created_at: string };
type CampaignRow = { id: string; title: string; budget_total: number; budget_remaining: number; status: string };

const STATUS_COLORS: Record<string, string> = {
  pending: "hsl(var(--warning))",
  approved: "hsl(var(--success))",
  rejected: "hsl(0, 72%, 51%)",
};
const STATUS_LABELS: Record<string, string> = { pending: "Pending", approved: "Approved", rejected: "Rejected" };

export default function Analytics() {
  const [subs, setSubs] = useState<SubRow[]>([]);
  const [earnings, setEarnings] = useState<EarnRow[]>([]);
  const [campaigns, setCampaigns] = useState<CampaignRow[]>([]);
  const [loading, setLoading] = useState(true);
  const { getFill } = useNeonCharts();

  useEffect(() => {
    void (async () => {
      const [s, e, c] = await Promise.all([
        supabase.from("submissions").select("id,status,created_at,manual_views,campaign_id"),
        supabase.from("earnings").select("amount,created_at"),
        supabase.from("campaigns").select("id,title,budget_total,budget_remaining,status"),
      ]);
      setSubs((s.data ?? []) as SubRow[]);
      setEarnings(((e.data ?? []) as any[]).map((r) => ({ amount: Number(r.amount), created_at: r.created_at })));
      setCampaigns((c.data ?? []) as CampaignRow[]);
      setLoading(false);
    })();
  }, []);

  const stats = useMemo(() => {
    const views = subs.reduce((a, b) => a + Number(b.manual_views ?? 0), 0);
    const paidOut = earnings.reduce((a, b) => a + b.amount, 0);
    const budget = campaigns.reduce((a, b) => a + Number(b.budget_total), 0);
    const remaining = campaigns.reduce((a, b) => a + Number(b.budget_remaining), 0);
    return {
      submissions: subs.length,
      views,
      paidOut,
      budgetUsed: budget ? Math.round(((budget - remaining) / budget) * 100) : 0,
    };
  }, [subs, earnings, campaigns]);

  const statusData = useMemo(() => {
    const counts: Record<string, number> = {};
    subs.forEach((s) => (counts[s.status] = (counts[s.status] || 0) + 1));
    return Object.entries(STATUS_LABELS).map(([k, label]) => ({
      name: label,
      value: counts[k] || 0,
      fill: STATUS_COLORS[k],
    }));
  }, [subs]);
  const statusConfig: ChartConfig = Object.fromEntries(
    Object.entries(STATUS_LABELS).map(([k, label]) => [k, { label, color: STATUS_COLORS[k] }]),
  );

  const trendData = useMemo(() => {
    const days: Record<string, number> = {};
    for (let i = 29; i >= 0; i--) days[format(subDays(new Date(), i), "MMM dd")] = 0;
    subs.forEach((s) => {
      const key = format(parseISO(s.created_at), "MMM dd");
      if (key in days) days[key]++;
    });
    return Object.entries(days).map(([date, count]) => ({ date, count }));
  }, [subs]);
  const trendConfig: ChartConfig = { count: { label: "Submissions", color: "hsl(var(--primary))" } };

  const earningsTrend = useMemo(() => {
    const days: Record<string, number> = {};
    for (let i = 29; i >= 0; i--) days[format(subDays(new Date(), i), "MMM dd")] = 0;
    earnings.forEach((e) => {
      const key = format(parseISO(e.created_at), "MMM dd");
      if (key in days) days[key] += e.amount;
    });
    return Object.entries(days).map(([date, amount]) => ({ date, amount: Math.round(amount * 100) / 100 }));
  }, [earnings]);
  const earningsConfig: ChartConfig = { amount: { label: "Earnings ($)", color: "hsl(var(--success))" } };

  const topCampaigns = useMemo(() => {
    const byCampaign: Record<string, number> = {};
    subs.forEach((s) => (byCampaign[s.campaign_id] = (byCampaign[s.campaign_id] || 0) + Number(s.manual_views ?? 0)));
    return campaigns
      .map((c) => ({ title: c.title.length > 18 ? `${c.title.slice(0, 17)}…` : c.title, views: byCampaign[c.id] ?? 0 }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 6);
  }, [subs, campaigns]);
  const topConfig: ChartConfig = { views: { label: "Views", color: "hsl(var(--primary))" } };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex h-full flex-col">
          <div className="flex h-11 items-center border-b border-border px-4 md:px-6">
            <Skeleton className="h-4 w-20" />
          </div>
          <div className="space-y-4 p-4 md:p-6">
            <div className="grid grid-cols-2 gap-px overflow-hidden rounded-md bg-border lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-20" />
              ))}
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="flex h-full flex-col">
        <div className="flex h-11 shrink-0 items-center border-b border-border px-4 md:px-6">
          <h1 className="text-[13px] font-medium">Analytics</h1>
        </div>

        <div className="flex-1 overflow-auto">
          <NeonPatternDefs
            colors={[...Object.values(STATUS_COLORS), "hsl(var(--success))", "hsl(var(--primary))"]}
          />
          <div className="max-w-[1400px] space-y-6 p-4 md:p-6">
            <div className="grid grid-cols-2 gap-px overflow-hidden rounded-md bg-border lg:grid-cols-4">
              {[
                { label: "Submissions", value: stats.submissions.toLocaleString() },
                { label: "Total views", value: stats.views.toLocaleString() },
                { label: "Creator earnings", value: `$${stats.paidOut.toFixed(2)}` },
                { label: "Budget used", value: `${stats.budgetUsed}%` },
              ].map((stat) => (
                <div key={stat.label} className="bg-background p-4">
                  <p className="text-[12px] text-muted-foreground">{stat.label}</p>
                  <p className="mt-1 text-2xl font-medium tabular-nums">{stat.value}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 gap-px overflow-hidden rounded-md bg-border lg:grid-cols-2">
              <div className="bg-background p-4">
                <p className="mb-1 text-[13px] font-medium">Submission status</p>
                <p className="mb-4 text-[12px] text-muted-foreground">Review pipeline breakdown</p>
                <ChartContainer config={statusConfig} className="h-[220px] w-full">
                  <PieChart>
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2}>
                      {statusData.map((e, i) => (
                        <Cell key={i} {...getFill(e.fill)} />
                      ))}
                    </Pie>
                  </PieChart>
                </ChartContainer>
              </div>

              <div className="bg-background p-4">
                <p className="mb-1 text-[13px] font-medium">Submissions per day</p>
                <p className="mb-4 text-[12px] text-muted-foreground">Last 30 days</p>
                <ChartContainer config={trendConfig} className="h-[220px] w-full">
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={4} stroke="hsl(var(--muted-foreground))" />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Line type="monotone" dataKey="count" stroke="hsl(var(--primary))" strokeWidth={1.5} dot={{ r: 2 }} />
                  </LineChart>
                </ChartContainer>
              </div>

              <div className="bg-background p-4">
                <p className="mb-1 text-[13px] font-medium">Creator earnings</p>
                <p className="mb-4 text-[12px] text-muted-foreground">Accrued per day, last 30 days</p>
                <ChartContainer config={earningsConfig} className="h-[220px] w-full">
                  <LineChart data={earningsTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={4} stroke="hsl(var(--muted-foreground))" />
                    <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Line type="monotone" dataKey="amount" stroke="hsl(var(--success))" strokeWidth={1.5} dot={{ r: 2 }} />
                  </LineChart>
                </ChartContainer>
              </div>

              <div className="bg-background p-4">
                <p className="mb-1 text-[13px] font-medium">Top campaigns by views</p>
                <p className="mb-4 text-[12px] text-muted-foreground">Across all submissions</p>
                <ChartContainer config={topConfig} className="h-[220px] w-full">
                  <BarChart data={topCampaigns}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="title" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="views" radius={0}>
                      {topCampaigns.map((_, i) => (
                        <Cell key={i} {...getFill("hsl(var(--primary))")} />
                      ))}
                    </Bar>
                  </BarChart>
                </ChartContainer>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
