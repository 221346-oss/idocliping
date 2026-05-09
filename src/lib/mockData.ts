export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: "platform" | "engagement" | "creator" | "community" | "seasonal";
  unlockedAt: Date;
  rarity: "common" | "rare" | "epic" | "legendary";
}

export interface Cosmetic {
  id: string;
  name: string;
  type: "avatar_frame" | "badge" | "effect" | "title";
  icon: string;
  rarity: "common" | "rare" | "epic" | "legendary";
  equipped: boolean;
  obtainedAt: Date;
}

export interface Campaign {
  id: string;
  title: string;
  brand: string;
  category: string;
  reward: number;
  status: "active" | "completed" | "ongoing";
  participants: number;
  joinedAt?: Date;
}

export interface Submission {
  id: string;
  campaignId: string;
  campaignTitle: string;
  platform: "tiktok" | "instagram" | "youtube" | "x";
  views: number;
  engagement: number;
  status: "pending" | "approved" | "rejected";
  submittedAt: Date;
  earnings?: number;
}

export interface CreatorProfile {
  id: string;
  username: string;
  displayName: string;
  avatar: string;
  bio: string;
  level: number;
  joinedDate: Date;
  rank: "rookie" | "challenger" | "pro" | "elite" | "legend";
  honorScore: number;
  totalEarnings: number;
  followers: {
    tiktok: number;
    instagram: number;
    youtube: number;
    x: number;
  };
  platforms: Array<"tiktok" | "instagram" | "youtube" | "x">;
  badges: string[];
  achievements: Achievement[];
  cosmetics: Cosmetic[];
  campaigns: Campaign[];
  submissions: Submission[];
  savedCampaigns: Campaign[];
  statistics: {
    totalSubmissions: number;
    approvedSubmissions: number;
    rejectedSubmissions: number;
    totalViews: number;
    averageEngagement: number;
    completionRate: number;
  };
}

export function generateMockCreatorProfile(username: string): CreatorProfile {
  const achievements: Achievement[] = [
    {
      id: "first-submit",
      name: "First Steps",
      description: "Submit your first campaign",
      icon: "🚀",
      category: "creator",
      unlockedAt: new Date("2023-06-15"),
      rarity: "common",
    },
    {
      id: "viral-post",
      name: "Going Viral",
      description: "Get 100k views on a submission",
      icon: "⚡",
      category: "engagement",
      unlockedAt: new Date("2023-08-20"),
      rarity: "epic",
    },
    {
      id: "100-approved",
      name: "Centennial",
      description: "Get 100 approved submissions",
      icon: "🏆",
      category: "creator",
      unlockedAt: new Date("2024-01-10"),
      rarity: "rare",
    },
    {
      id: "platform-master",
      name: "Platform Master",
      description: "Be active on all 4 platforms",
      icon: "🌐",
      category: "platform",
      unlockedAt: new Date("2023-12-05"),
      rarity: "epic",
    },
    {
      id: "streak-7",
      name: "Weekly Warrior",
      description: "Maintain a 7-day submission streak",
      icon: "🔥",
      category: "community",
      unlockedAt: new Date("2024-02-28"),
      rarity: "rare",
    },
  ];

  const cosmetics: Cosmetic[] = [
    {
      id: "frame-gold",
      name: "Golden Frame",
      type: "avatar_frame",
      icon: "👑",
      rarity: "epic",
      equipped: true,
      obtainedAt: new Date("2023-09-01"),
    },
    {
      id: "effect-star",
      name: "Star Effect",
      type: "effect",
      icon: "✨",
      rarity: "epic",
      equipped: true,
      obtainedAt: new Date("2023-10-15"),
    },
    {
      id: "title-creator",
      name: "Pro Creator",
      type: "title",
      icon: "🎬",
      rarity: "rare",
      equipped: true,
      obtainedAt: new Date("2023-11-20"),
    },
  ];

  const campaigns: Campaign[] = [
    {
      id: "camp-1",
      title: "Summer Brand Collaboration",
      brand: "TechGear Pro",
      category: "Gaming",
      reward: 500,
      status: "completed",
      participants: 234,
      joinedAt: new Date("2024-01-15"),
    },
    {
      id: "camp-2",
      title: "Music Festival Promotion",
      brand: "SoundWave Events",
      category: "Music",
      reward: 750,
      status: "active",
      participants: 156,
      joinedAt: new Date("2024-02-10"),
    },
    {
      id: "camp-3",
      title: "New Product Launch",
      brand: "InnovateTech",
      category: "UGC",
      reward: 1000,
      status: "active",
      participants: 89,
      joinedAt: new Date("2024-03-01"),
    },
  ];

  const submissions: Submission[] = [
    {
      id: "sub-1",
      campaignId: "camp-1",
      campaignTitle: "Summer Brand Collaboration",
      platform: "tiktok",
      views: 125400,
      engagement: 8.5,
      status: "approved",
      submittedAt: new Date("2024-01-20"),
      earnings: 500,
    },
    {
      id: "sub-2",
      campaignId: "camp-2",
      campaignTitle: "Music Festival Promotion",
      platform: "instagram",
      views: 89300,
      engagement: 6.2,
      status: "approved",
      submittedAt: new Date("2024-02-15"),
      earnings: 400,
    },
    {
      id: "sub-3",
      campaignId: "camp-3",
      campaignTitle: "New Product Launch",
      platform: "youtube",
      views: 234500,
      engagement: 12.1,
      status: "pending",
      submittedAt: new Date("2024-03-05"),
    },
  ];

  return {
    id: `user-${Math.random().toString(36).substr(2, 9)}`,
    username: username,
    displayName: username.charAt(0).toUpperCase() + username.slice(1),
    avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop",
    bio: "Passionate creator building amazing content across multiple platforms. Love gaming, music, and UGC!",
    level: 71,
    joinedDate: new Date("2023-06-15"),
    rank: "elite",
    honorScore: 2450,
    totalEarnings: 12500,
    followers: {
      tiktok: 456700,
      instagram: 234500,
      youtube: 189300,
      x: 87500,
    },
    platforms: ["tiktok", "instagram", "youtube", "x"],
    badges: ["verified", "top-creator", "consistent"],
    achievements,
    cosmetics,
    campaigns,
    submissions,
    savedCampaigns: [
      campaigns[1],
      campaigns[2],
    ],
    statistics: {
      totalSubmissions: 247,
      approvedSubmissions: 213,
      rejectedSubmissions: 12,
      totalViews: 12450000,
      averageEngagement: 7.8,
      completionRate: 86.2,
    },
  };
}
