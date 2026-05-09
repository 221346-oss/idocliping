import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CreatorProfile } from "@/lib/mockData";
import { cn } from "@/lib/utils";

interface ProfileRightCardProps {
  profile: CreatorProfile;
  isOwnProfile: boolean;
  onEditClick: () => void;
}

const rankColors: Record<string, string> = {
  rookie: "bg-slate-600",
  challenger: "bg-blue-600",
  pro: "bg-purple-600",
  elite: "bg-orange-600",
  legend: "bg-yellow-600",
};

const rankEmojis: Record<string, string> = {
  rookie: "🌱",
  challenger: "⚔️",
  pro: "🎖️",
  elite: "👑",
  legend: "🏆",
};

export function ProfileRightCard({ profile, isOwnProfile, onEditClick }: ProfileRightCardProps) {
  const [copiedId, setCopiedId] = useState(false);

  const handleCopyId = () => {
    navigator.clipboard.writeText(profile.id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const platformCounts = Object.entries(profile.followers)
    .filter(([, count]) => count > 0)
    .sort(([, a], [, b]) => b - a);

  return (
    <div className="sticky top-20 space-y-4">
      {/* Profile Card */}
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg border border-yellow-500/20 p-4 space-y-4">
        {/* Avatar and Header */}
        <div className="flex flex-col items-center space-y-3">
          <div className="relative">
            <img
              src={profile.avatar}
              alt={profile.displayName}
              className="w-24 h-24 rounded-lg border-2 border-yellow-500/50"
            />
            <div className={cn("absolute -bottom-2 -right-2 w-8 h-8 rounded-full flex items-center justify-center border-2 border-slate-800", rankColors[profile.rank])}>
              <span className="text-lg">{rankEmojis[profile.rank]}</span>
            </div>
          </div>

          <div className="text-center">
            <h2 className="text-lg font-bold text-white">{profile.displayName}</h2>
            <p className="text-xs text-slate-400">@{profile.username}</p>
          </div>

          {/* Level and Rank */}
          <div className="flex gap-2">
            <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/40">
              Lv. {profile.level}
            </Badge>
            <Badge className={cn("text-white", rankColors[profile.rank])}>
              {profile.rank.charAt(0).toUpperCase() + profile.rank.slice(1)}
            </Badge>
          </div>
        </div>

        {/* ID Copy Section */}
        <div className="bg-slate-900/50 rounded p-3 flex items-center gap-2">
          <div className="flex-1">
            <p className="text-xs text-slate-400">UID</p>
            <p className="text-sm font-mono text-white">{profile.id.slice(0, 12)}...</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopyId}
            className="text-slate-400 hover:text-yellow-400"
          >
            {copiedId ? (
              <Check className="w-4 h-4" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </Button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-slate-900/50 rounded p-2">
            <p className="text-xs text-slate-400">Honor Score</p>
            <p className="text-base font-bold text-yellow-400">{profile.honorScore.toLocaleString()}</p>
          </div>
          <div className="bg-slate-900/50 rounded p-2">
            <p className="text-xs text-slate-400">Level</p>
            <p className="text-base font-bold text-white">{profile.level}</p>
          </div>
          <div className="bg-slate-900/50 rounded p-2">
            <p className="text-xs text-slate-400">Joined</p>
            <p className="text-base font-bold text-white">{profile.joinedDate.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })}</p>
          </div>
          <div className="bg-slate-900/50 rounded p-2">
            <p className="text-xs text-slate-400">Earnings</p>
            <p className="text-base font-bold text-green-400">${profile.totalEarnings.toLocaleString()}</p>
          </div>
        </div>

        {/* Platforms */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-slate-300">Platforms</p>
          <div className="space-y-1">
            {platformCounts.map(([platform, count]) => (
              <div key={platform} className="flex items-center justify-between bg-slate-900/50 rounded px-2 py-1">
                <span className="text-xs text-slate-400 capitalize">{platform}</span>
                <span className="text-xs font-semibold text-white">{(count / 1000).toFixed(1)}k</span>
              </div>
            ))}
          </div>
        </div>

        {/* Badges */}
        {profile.badges.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-300">Badges</p>
            <div className="flex flex-wrap gap-1">
              {profile.badges.map((badge) => (
                <Badge key={badge} variant="outline" className="border-yellow-500/40 text-yellow-400 capitalize">
                  {badge.replace(/-/g, " ")}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Edit Button */}
        {isOwnProfile && (
          <Button
            onClick={onEditClick}
            className="w-full bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 border border-yellow-500/40"
          >
            Edit Profile
          </Button>
        )}
      </div>
    </div>
  );
}
