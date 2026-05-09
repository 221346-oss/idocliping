import { ShieldCheck } from "lucide-react";
import type { ProfileViewModel } from "@/hooks/usePublicProfile";
import { computeHonorScore } from "@/lib/honor-score";
import { honorLabelColor } from "@/lib/honor-score";
import type { HonorLabel } from "@/lib/honor-score";

interface ProfileHonorScoreProps {
  profile: ProfileViewModel;
}

export function ProfileHonorScore({ profile }: ProfileHonorScoreProps) {
  const b = computeHonorScore({
    approvedCount: profile.statistics.approvedSubmissions,
    rejectedCount: profile.statistics.rejectedSubmissions,
    campaignsCompleted: new Set(profile.submissions.filter((s) => s.status === "approved").map((s) => s.campaignId)).size,
    adminFlags: 0,
  });

  const label = profile.honorLabelText as HonorLabel;
  const breakdown = [
    { label: "Base", value: b.base, color: "text-muted-foreground" },
    { label: "Approved bonus (+2 each)", value: b.approvedBonus, color: "text-success" },
    { label: "Rejected penalty", value: -Math.abs(b.rejectedPenalty), color: "text-destructive" },
    { label: "Campaigns bonus (+5 each)", value: b.campaignsBonus, color: "text-primary" },
  ];

  return (
    <div className="space-y-4">
      <div className="bg-card border border-border rounded-md p-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Honor score</p>
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-bold text-foreground tabular-nums">{profile.honorScore}</p>
              <p className={`text-[12px] font-medium uppercase tracking-tight ${honorLabelColor(label)}`}>• {profile.honorLabelText}</p>
            </div>
          </div>
          <div className="bg-primary/10 h-10 w-10 rounded-full flex items-center justify-center">
            <ShieldCheck className="h-5 w-5 text-primary" />
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest px-1">Breakdown</h3>
        <div className="bg-card border border-border rounded-md overflow-hidden">
          <table className="w-full text-[13px]">
            <tbody>
              {breakdown.map((item) => (
                <tr key={item.label} className="border-b border-border last:border-0 hover:bg-muted/30">
                  <td className="px-3 py-2 text-muted-foreground">{item.label}</td>
                  <td className={`px-3 py-2 text-right font-bold tabular-nums ${item.color}`}>
                    {item.value >= 0 ? "+" : ""}
                    {item.value}
                  </td>
                </tr>
              ))}
              <tr className="bg-muted/30 border-t border-border font-semibold">
                <td className="px-3 py-2 text-foreground">Total (capped 0–100)</td>
                <td className="px-3 py-2 text-right text-primary text-[15px] tabular-nums">{b.total}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
