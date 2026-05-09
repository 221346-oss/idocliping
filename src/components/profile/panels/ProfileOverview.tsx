import { Heart, MessageCircle, Share2, TrendingUp } from "lucide-react";
import { CreatorProfile } from "@/lib/mockData";

interface ProfileOverviewProps {
  profile: CreatorProfile;
}

export function ProfileOverview({ profile }: ProfileOverviewProps) {
  const overviewStats = [
    {
      label: "Total Views",
      value: (profile.statistics.totalViews / 1000000).toFixed(1) + "M",
      icon: TrendingUp,
      color: "text-blue-400",
    },
    {
      label: "Avg. Engagement",
      value: profile.statistics.averageEngagement.toFixed(1) + "%",
      icon: Heart,
      color: "text-red-400",
    },
    {
      label: "Completion Rate",
      value: profile.statistics.completionRate.toFixed(1) + "%",
      icon: MessageCircle,
      color: "text-green-400",
    },
    {
      label: "Total Earnings",
      value: "$" + profile.totalEarnings.toLocaleString(),
      icon: Share2,
      color: "text-yellow-400",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Bio Section */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-6">
        <h3 className="text-sm font-semibold text-white mb-3">About</h3>
        <p className="text-sm text-slate-300 leading-relaxed">{profile.bio}</p>
      </div>

      {/* Statistics Grid */}
      <div className="grid grid-cols-2 gap-4">
        {overviewStats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="bg-slate-900/50 border border-slate-800 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-slate-800 rounded">
                  <Icon className={`w-5 h-5 ${stat.color}`} />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-slate-400 uppercase tracking-wide">{stat.label}</p>
                  <p className="text-xl font-bold text-white mt-1">{stat.value}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent Activity */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-6">
        <h3 className="text-sm font-semibold text-white mb-4">Recent Submissions</h3>
        <div className="space-y-3">
          {profile.submissions.slice(0, 3).map((submission) => (
            <div key={submission.id} className="flex items-center justify-between pb-3 border-b border-slate-800 last:border-0">
              <div className="flex-1">
                <p className="text-sm font-medium text-white">{submission.campaignTitle}</p>
                <p className="text-xs text-slate-400 capitalize">{submission.platform}</p>
              </div>
              <div className="text-right">
                <p className={`text-sm font-bold ${submission.status === 'approved' ? 'text-green-400' : submission.status === 'rejected' ? 'text-red-400' : 'text-yellow-400'}`}>
                  {submission.status.charAt(0).toUpperCase() + submission.status.slice(1)}
                </p>
                <p className="text-xs text-slate-400">{(submission.views / 1000).toFixed(0)}k views</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
