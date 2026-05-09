import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import type { ProfileViewModel } from "@/hooks/usePublicProfile";
import { formatViewCount } from "@/lib/format-views";

interface ProfileStatsProps {
  profile: ProfileViewModel;
}

const COLORS = {
  primary: "hsl(var(--primary))",
  success: "hsl(var(--success))",
  destructive: "hsl(var(--destructive))",
  warning: "hsl(var(--warning))",
  muted: "hsl(var(--muted-foreground))",
};

export function ProfileStats({ profile }: ProfileStatsProps) {
  const t = profile.statistics;
  const denom = t.totalSubmissions || 1;
  const approvalPct = ((t.approvedSubmissions / denom) * 100).toFixed(1);

  const platformData = Object.entries(profile.platformViewTotals).map(([name, value]) => ({
    name: name.toUpperCase(),
    value,
  }));

  const pending = t.totalSubmissions - t.approvedSubmissions - t.rejectedSubmissions;
  const statusData = [
    { name: "Approved", value: t.approvedSubmissions, color: COLORS.success },
    { name: "Rejected", value: t.rejectedSubmissions, color: COLORS.destructive },
    { name: "Pending", value: Math.max(0, pending), color: COLORS.warning },
  ].filter((d) => d.value > 0);

  const tooltipStyle = { backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "4px", fontSize: "11px" };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-px bg-border border border-border rounded-md overflow-hidden shrink-0">
        <div className="bg-background p-4">
          <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Total submissions</p>
          <p className="text-2xl font-bold mt-0.5">{t.totalSubmissions}</p>
          <p className="text-[10px] text-muted-foreground mt-1">Lifetime</p>
        </div>
        <div className="bg-background p-4">
          <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Approval rate</p>
          <p className="text-2xl font-bold mt-0.5 text-success">{approvalPct}%</p>
          <p className="text-[10px] text-muted-foreground mt-1">{t.approvedSubmissions} approved</p>
        </div>
        <div className="bg-background p-4">
          <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Total views</p>
          <p className="text-2xl font-bold mt-0.5 text-info">{formatViewCount(t.totalViews)}</p>
          <p className="text-[10px] text-muted-foreground mt-1">Approved submissions</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-md p-4">
          <h3 className="text-[13px] font-medium mb-4">Views by platform</h3>
          {platformData.length === 0 ? (
            <p className="text-[12px] text-muted-foreground py-8 text-center">No platform data yet</p>
          ) : (
            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={platformData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={70}
                    dataKey="value"
                    stroke="none"
                    paddingAngle={2}
                  >
                    {platformData.map((_, index) => (
                      <Cell key={index} fill={Object.values(COLORS)[index % 5]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => formatViewCount(v)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="bg-card border border-border rounded-md p-4">
          <h3 className="text-[13px] font-medium mb-4">Submission status</h3>
          {statusData.length === 0 ? (
            <p className="text-[12px] text-muted-foreground py-8 text-center">No submissions</p>
          ) : (
            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={statusData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} dataKey="value" stroke="none" paddingAngle={2}>
                    {statusData.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
