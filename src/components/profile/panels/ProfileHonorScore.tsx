import { TrendingUp, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { CreatorProfile } from "@/lib/mockData";

interface ProfileHonorScoreProps {
  profile: CreatorProfile;
}

export function ProfileHonorScore({ profile }: ProfileHonorScoreProps) {
  const honorBreakdown = [
    { label: "Base Score", value: 50, color: "text-blue-400" },
    { label: "Approved Submissions", value: profile.statistics.approvedSubmissions * 2, color: "text-green-400" },
    { label: "Rejected Submissions", value: -profile.statistics.rejectedSubmissions * 10, color: "text-red-400" },
    { label: "Engagement Bonus", value: Math.floor(profile.statistics.averageEngagement * 10), color: "text-yellow-400" },
  ];

  const totalCalculated = honorBreakdown.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="space-y-6">
      {/* Honor Score Overview */}
      <div className="bg-gradient-to-br from-yellow-500/20 to-orange-500/10 border border-yellow-500/40 rounded-lg p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-slate-300 mb-2">Current Honor Score</p>
            <p className="text-5xl font-bold text-yellow-400">{profile.honorScore.toLocaleString()}</p>
          </div>
          <div className="bg-yellow-500/20 p-3 rounded-lg">
            <TrendingUp className="w-8 h-8 text-yellow-400" />
          </div>
        </div>
      </div>

      {/* Honor Breakdown */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-white">Score Breakdown</h3>
        <div className="bg-slate-900/50 border border-slate-800 rounded-lg overflow-hidden">
          {honorBreakdown.map((item, index) => (
            <div key={index} className="flex items-center justify-between p-4 border-b border-slate-800 last:border-0">
              <span className="text-sm text-slate-300">{item.label}</span>
              <span className={`font-bold text-lg ${item.color}`}>
                {item.value >= 0 ? "+" : ""}{item.value}
              </span>
            </div>
          ))}
          <div className="flex items-center justify-between p-4 bg-slate-800/50 font-semibold">
            <span className="text-white">Total</span>
            <span className="text-yellow-400 text-xl">{totalCalculated}</span>
          </div>
        </div>
      </div>

      {/* Honor Tiers */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-white">Honor Tiers</h3>
        <div className="space-y-2">
          {[
            { tier: "Newcomer", minScore: 0, maxScore: 500, icon: "🌱" },
            { tier: "Member", minScore: 500, maxScore: 1500, icon: "⭐" },
            { tier: "Trusted", minScore: 1500, maxScore: 3000, icon: "✨" },
            { tier: "Esteemed", minScore: 3000, maxScore: 5000, icon: "👑" },
            { tier: "Legend", minScore: 5000, maxScore: Infinity, icon: "🏆" },
          ].map((tier) => {
            const isCurrentTier = profile.honorScore >= tier.minScore && profile.honorScore < tier.maxScore;
            const progress = isCurrentTier
              ? ((profile.honorScore - tier.minScore) / (tier.maxScore - tier.minScore)) * 100
              : profile.honorScore >= tier.maxScore
                ? 100
                : 0;

            return (
              <div
                key={tier.tier}
                className={`rounded-lg p-4 border ${
                  isCurrentTier
                    ? "bg-gradient-to-r from-yellow-500/20 to-orange-500/10 border-yellow-500/40"
                    : "bg-slate-900/50 border-slate-800"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{tier.icon}</span>
                    <div>
                      <p className={`text-sm font-semibold ${isCurrentTier ? "text-yellow-400" : "text-white"}`}>
                        {tier.tier}
                      </p>
                      <p className="text-xs text-slate-400">
                        {tier.minScore.toLocaleString()} - {tier.maxScore === Infinity ? "∞" : tier.maxScore.toLocaleString()} pts
                      </p>
                    </div>
                  </div>
                  {isCurrentTier && <span className="text-xs font-semibold text-yellow-400">CURRENT</span>}
                </div>

                {/* Progress Bar */}
                {progress > 0 && (
                  <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-yellow-400 to-orange-500 h-full transition-all"
                      style={{ width: `${Math.min(progress, 100)}%` }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Honor Impact */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-white">How Honor Score Works</h3>
        <div className="space-y-2">
          <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 flex gap-3">
            <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-green-400 mb-1">Increases</p>
              <p className="text-xs text-slate-300">+2 per approved submission, +engagement bonus</p>
            </div>
          </div>

          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 flex gap-3">
            <XCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-400 mb-1">Decreases</p>
              <p className="text-xs text-slate-300">-10 per rejected submission</p>
            </div>
          </div>

          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 flex gap-3">
            <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-blue-400 mb-1">Benefits</p>
              <p className="text-xs text-slate-300">Higher tiers unlock exclusive campaigns and rewards</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
