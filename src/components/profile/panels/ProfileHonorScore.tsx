import { TrendingUp, CheckCircle, XCircle, AlertCircle, ShieldCheck } from "lucide-react";
import { CreatorProfile } from "@/lib/mockData";

interface ProfileHonorScoreProps {
  profile: CreatorProfile;
}

export function ProfileHonorScore({ profile }: ProfileHonorScoreProps) {
  const honorBreakdown = [
    { label: "Base Score", value: 50, color: "text-muted-foreground" },
    { label: "Approved Submissions", value: profile.statistics.approvedSubmissions * 2, color: "text-success" },
    { label: "Rejected Submissions", value: -profile.statistics.rejectedSubmissions * 10, color: "text-destructive" },
    { label: "Engagement Bonus", value: Math.floor(profile.statistics.averageEngagement * 10), color: "text-info" },
  ];

  const totalCalculated = honorBreakdown.reduce((sum, item) => sum + item.value, 0);

  const getHonorLabel = (score: number) => {
    if (score < 41) return "New Creator";
    if (score < 61) return "Developing";
    if (score < 81) return "Trusted";
    if (score < 96) return "High Trust";
    return "Elite";
  };

  const getHonorColor = (score: number) => {
    if (score < 41) return "text-muted-foreground";
    if (score < 61) return "text-info";
    if (score < 81) return "text-success";
    if (score < 96) return "text-warning";
    return "text-primary";
  };

  return (
    <div className="space-y-4">
      {/* Honor Score Overview */}
      <div className="bg-card border border-border rounded-md p-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Current Honor Score</p>
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-bold text-foreground">{profile.honorScore.toLocaleString()}</p>
              <p className={`text-[12px] font-medium uppercase tracking-tight ${getHonorColor(profile.honorScore / 100)}`}>
                • {getHonorLabel(profile.honorScore / 100)}
              </p>
            </div>
          </div>
          <div className="bg-primary/10 h-10 w-10 rounded-full flex items-center justify-center">
            <ShieldCheck className="h-5 w-5 text-primary" />
          </div>
        </div>
      </div>

      {/* Score Breakdown */}
      <div className="space-y-2">
        <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest px-1">Score Breakdown</h3>
        <div className="bg-card border border-border rounded-md overflow-hidden">
          <table className="w-full text-[13px]">
            <tbody>
              {honorBreakdown.map((item, index) => (
                <tr key={index} className="border-b border-border last:border-0 hover:bg-muted/30">
                  <td className="px-3 py-2 text-muted-foreground">{item.label}</td>
                  <td className={`px-3 py-2 text-right font-bold tabular-nums ${item.color}`}>
                    {item.value >= 0 ? "+" : ""}{item.value}
                  </td>
                </tr>
              ))}
              <tr className="bg-muted/30 border-t border-border font-semibold">
                <td className="px-3 py-2 text-foreground">Total Points</td>
                <td className="px-3 py-2 text-right text-primary text-[15px]">{totalCalculated}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Impact Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        {[
          { label: "Positive", icon: CheckCircle, color: "text-success", bg: "bg-success/5 border-success/20", items: ["+2 Approved Post", "+5 Campaign Done"] },
          { label: "Negative", icon: XCircle, color: "text-destructive", bg: "bg-destructive/5 border-destructive/20", items: ["-10 Rejected Post", "-20 Admin Flag"] },
          { label: "Benefits", icon: AlertCircle, color: "text-info", bg: "bg-info/5 border-info/20", items: ["Priority Matching", "Faster Payouts"] },
        ].map((block) => {
          const Icon = block.icon;
          return (
            <div key={block.label} className={`border rounded-md p-3 ${block.bg}`}>
              <div className="flex items-center gap-2 mb-2">
                <Icon className={`h-4 w-4 ${block.color}`} />
                <span className={`text-[12px] font-bold ${block.color}`}>{block.label}</span>
              </div>
              <ul className="space-y-0.5">
                {block.items.map((item, i) => (
                  <li key={i} className="text-[11px] text-muted-foreground">• {item}</li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}
