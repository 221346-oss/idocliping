import { Eye, ThumbsUp, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { CreatorProfile } from "@/lib/mockData";

interface ProfileSubmissionsProps {
  profile: CreatorProfile;
}

const statusBadgeStyles = {
  approved: "border-success/40 text-success bg-success/5",
  rejected: "border-destructive/40 text-destructive bg-destructive/5",
  pending: "border-warning/40 text-warning bg-warning/5",
};

export function ProfileSubmissions({ profile }: ProfileSubmissionsProps) {
  const sortedSubmissions = [...profile.submissions].sort(
    (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-[14px] font-medium text-foreground uppercase tracking-tight">Submissions ({profile.statistics.totalSubmissions})</h3>
      </div>

      {/* Summary Stats Strip */}
      <div className="grid grid-cols-3 gap-px bg-border border border-border rounded-md overflow-hidden shrink-0">
        {[
          { label: "Approved", value: profile.statistics.approvedSubmissions, color: "text-success" },
          { label: "Rejected", value: profile.statistics.rejectedSubmissions, color: "text-destructive" },
          { label: "Pending", value: profile.statistics.totalSubmissions - profile.statistics.approvedSubmissions - profile.statistics.rejectedSubmissions, color: "text-warning" },
        ].map((stat) => (
          <div key={stat.label} className="bg-background px-3 py-2">
            <p className="text-[10px] text-muted-foreground uppercase">{stat.label}</p>
            <p className={`text-[15px] font-bold ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Submissions List */}
      <div className="space-y-2">
        {sortedSubmissions.length === 0 ? (
          <div className="bg-card border border-dashed border-border rounded-md p-8 text-center">
            <p className="text-[12px] text-muted-foreground">No submissions yet</p>
          </div>
        ) : (
          sortedSubmissions.map((submission) => (
            <div key={submission.id} className="bg-card border border-border rounded-md p-3 hover:bg-muted/30 transition-colors">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-[13px] font-semibold text-foreground truncate">{submission.campaignTitle}</h4>
                    <Badge variant="outline" className={`h-4 text-[9px] uppercase font-bold border px-1 ${statusBadgeStyles[submission.status as keyof typeof statusBadgeStyles]}`}>
                      {submission.status}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-3 text-[10px] text-muted-foreground pt-1">
                    <Badge variant="secondary" className="h-4 text-[9px] px-1.5 bg-muted text-muted-foreground border-none">
                      {submission.platform.toUpperCase()}
                    </Badge>
                    <div className="flex items-center gap-1"><Eye className="h-3 w-3" />{(submission.views / 1000).toFixed(0)}k</div>
                    <div className="flex items-center gap-1"><ThumbsUp className="h-3 w-3" />{submission.engagement.toFixed(1)}%</div>
                    <div className="flex items-center gap-1"><Calendar className="h-3 w-3" />{submission.submittedAt.toLocaleDateString()}</div>
                  </div>
                </div>
                {submission.earnings && (
                  <div className="text-right shrink-0">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Earnings</p>
                    <p className="text-[14px] font-bold text-success">${submission.earnings}</p>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
