import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import { CreatorProfile } from "@/lib/mockData";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { NeonPatternDefs } from "@/components/NeonPatternDefs";
import { useNeonCharts } from "@/hooks/use-neon-charts";

interface ProfileStatsProps {
  profile: CreatorProfile;
}

export function ProfileStats({ profile }: ProfileStatsProps) {
  const { getFill } = useNeonCharts();
  
  const submissionTrendData = [
    { month: "Jan", submissions: 12, approved: 10 },
    { month: "Feb", submissions: 15, approved: 13 },
    { month: "Mar", submissions: 18, approved: 16 },
    { month: "Apr", submissions: 22, approved: 19 },
    { month: "May", submissions: 25, approved: 23 },
    { month: "Jun", submissions: 28, approved: 26 },
  ];

  const COLORS = {
    primary: "hsl(var(--primary))",
    info: "hsl(var(--info))",
    destructive: "hsl(var(--destructive))",
    success: "hsl(var(--success))",
    warning: "hsl(var(--warning))",
    muted: "hsl(var(--muted-foreground))",
  };

  const platformData = [
    { name: "TikTok", value: profile.followers.tiktok, color: COLORS.primary },
    { name: "Instagram", value: profile.followers.instagram, color: COLORS.info },
    { name: "YouTube", value: profile.followers.youtube, color: COLORS.destructive },
    { name: "X", value: profile.followers.x, color: COLORS.muted },
  ];

  const statusData = [
    { name: "Approved", value: profile.statistics.approvedSubmissions, color: COLORS.success },
    { name: "Rejected", value: profile.statistics.rejectedSubmissions, color: COLORS.destructive },
    { name: "Pending", value: profile.statistics.totalSubmissions - profile.statistics.approvedSubmissions - profile.statistics.rejectedSubmissions, color: COLORS.warning },
  ];

  const tooltipStyle = { backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "4px", fontSize: "11px" };

  const allColors = Object.values(COLORS);

  return (
    <div className="space-y-4">
      <NeonPatternDefs colors={allColors} />

      {/* Key Statistics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-px bg-border border border-border rounded-md overflow-hidden shrink-0">
        {[
          { label: "Total Submissions", value: profile.statistics.totalSubmissions, sub: "Lifetime" },
          { label: "Approval Rate", value: `${((profile.statistics.approvedSubmissions / profile.statistics.totalSubmissions) * 100).toFixed(1)}%`, sub: `${profile.statistics.approvedSubmissions} approved`, color: "text-success" },
          { label: "Avg. Engagement", value: `${profile.statistics.averageEngagement.toFixed(1)}%`, sub: "Per submission", color: "text-info" },
        ].map((stat) => (
          <div key={stat.label} className="bg-background p-4">
            <p className="text-[11px] text-muted-foreground uppercase tracking-wider">{stat.label}</p>
            <p className={`text-2xl font-bold mt-0.5 ${stat.color || "text-foreground"}`}>{stat.value}</p>
            <p className="text-[10px] text-muted-foreground mt-1">{stat.sub}</p>
          </div>
        ))}
      </div>

      {/* Submission Trend - Area Chart with Neon */}
      <div className="bg-card border border-border rounded-md p-4">
        <h3 className="text-[13px] font-medium mb-4">Submission Trend</h3>
        <div className="h-[200px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={submissionTrendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 10 }} />
              <YAxis stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Area 
                type="monotone" 
                dataKey="approved" 
                {...getFill(COLORS.primary)}
                fillOpacity={1}
              />
              <Area 
                type="monotone" 
                dataKey="submissions" 
                {...getFill(COLORS.muted)}
                fillOpacity={0.4}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-md p-4">
          <h3 className="text-[13px] font-medium mb-4">Platform Distribution</h3>
          <div className="h-[180px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={platformData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value" stroke="none" paddingAngle={2}>
                  {platformData.map((entry, index) => (
                    <Cell key={`cell-${index}`} {...getFill(entry.color)} fillOpacity={1} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => `${(value / 1000).toFixed(1)}k`} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-card border border-border rounded-md p-4">
          <h3 className="text-[13px] font-medium mb-4">Submission Status</h3>
          <div className="h-[180px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={statusData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value" stroke="none" paddingAngle={2}>
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} {...getFill(entry.color)} fillOpacity={1} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Monthly Earnings - Bar Chart with Neon */}
      <div className="bg-card border border-border rounded-md p-4">
        <h3 className="text-[13px] font-medium mb-4">Monthly Earnings</h3>
        <div className="h-[200px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={[
              { month: "Jan", earnings: 800 }, { month: "Feb", earnings: 1200 },
              { month: "Mar", earnings: 1500 }, { month: "Apr", earnings: 2000 },
              { month: "May", earnings: 2200 }, { month: "Jun", earnings: 2300 },
            ]}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 10 }} />
              <YAxis stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => "$" + value} />
              <Bar dataKey="earnings" radius={[0, 0, 0, 0]}>
                {[800, 1200, 1500, 2000, 2200, 2300].map((_, i) => (
                  <Cell key={i} {...getFill(COLORS.success)} fillOpacity={1} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
