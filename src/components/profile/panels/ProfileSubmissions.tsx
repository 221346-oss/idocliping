import { Eye, ThumbsUp, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { CreatorProfile } from "@/lib/mockData";

interface ProfileSubmissionsProps {
  profile: CreatorProfile;
}

const statusBadgeStyles = {
  approved: "bg-green-500/20 text-green-400 border-green-500/40",
  rejected: "bg-red-500/20 text-red-400 border-red-500/40",
  pending: "bg-yellow-500/20 text-yellow-400 border-yellow-500/40",
};

const platformColors: Record<string, string> = {
  tiktok: "bg-slate-800 text-white",
  instagram: "bg-pink-500/20 text-pink-400",
  youtube: "bg-red-500/20 text-red-400",
  x: "bg-blue-500/20 text-blue-400",
};

export function ProfileSubmissions({ profile }: ProfileSubmissionsProps) {
  const sortedSubmissions = [...profile.submissions].sort(
    (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">
          Submissions ({profile.statistics.totalSubmissions})
        </h3>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-3">
          <p className="text-xs text-slate-400 mb-1">Approved</p>
          <p className="text-2xl font-bold text-green-400">{profile.statistics.approvedSubmissions}</p>
        </div>
        <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-3">
          <p className="text-xs text-slate-400 mb-1">Rejected</p>
          <p className="text-2xl font-bold text-red-400">{profile.statistics.rejectedSubmissions}</p>
        </div>
        <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-3">
          <p className="text-xs text-slate-400 mb-1">Pending</p>
          <p className="text-2xl font-bold text-yellow-400">
            {profile.statistics.totalSubmissions - profile.statistics.approvedSubmissions - profile.statistics.rejectedSubmissions}
          </p>
        </div>
      </div>

      {/* Submissions List */}
      <div className="space-y-3">
        {sortedSubmissions.length === 0 ? (
          <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-8 text-center">
            <p className="text-slate-400">No submissions yet</p>
          </div>
        ) : (
          sortedSubmissions.map((submission) => (
            <div
              key={submission.id}
              className="bg-slate-900/50 border border-slate-800 rounded-lg p-4 hover:border-slate-700 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold text-white">{submission.campaignTitle}</h4>
                    <Badge
                      variant="outline"
                      className={`capitalize border ${statusBadgeStyles[submission.status as keyof typeof statusBadgeStyles]}`}
                    >
                      {submission.status}
                    </Badge>
                  </div>

                  <div className="flex flex-wrap gap-3 text-xs">
                    <Badge variant="secondary" className={platformColors[submission.platform]}>
                      {submission.platform.charAt(0).toUpperCase() + submission.platform.slice(1)}
                    </Badge>
                    <div className="flex items-center gap-1 text-slate-400">
                      <Eye className="w-4 h-4" />
                      {(submission.views / 1000).toFixed(0)}k views
                    </div>
                    <div className="flex items-center gap-1 text-slate-400">
                      <ThumbsUp className="w-4 h-4" />
                      {submission.engagement.toFixed(1)}% engagement
                    </div>
                    <div className="flex items-center gap-1 text-slate-400">
                      <Calendar className="w-4 h-4" />
                      {submission.submittedAt.toLocaleDateString()}
                    </div>
                  </div>
                </div>

                {submission.earnings && (
                  <div className="text-right">
                    <p className="text-xs text-slate-400 mb-1">Earnings</p>
                    <p className="text-lg font-bold text-yellow-400">${submission.earnings}</p>
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
