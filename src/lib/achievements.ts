/** Achievement definitions and helpers */

export type AchievementRarity = "common" | "rare" | "epic" | "legendary";

export interface AchievementDef {
  key: string;
  name: string;
  description: string;
  icon: string;
  rarity: AchievementRarity;
  category: string;
  requirementType: "submissions" | "views" | "earnings" | "rank" | "campaigns" | "categories";
  requirementValue: number;
}

export const ACHIEVEMENT_DEFS: AchievementDef[] = [
  // Milestone
  { key: "first_drop", name: "First Drop", description: "Submit your first post", icon: "🎬", rarity: "common", category: "Milestone", requirementType: "submissions", requirementValue: 1 },
  { key: "content_machine", name: "Content Machine", description: "10 approved submissions", icon: "🔥", rarity: "common", category: "Milestone", requirementType: "submissions", requirementValue: 10 },
  { key: "grinder", name: "Grinder", description: "50 approved submissions", icon: "⚙️", rarity: "rare", category: "Milestone", requirementType: "submissions", requirementValue: 50 },
  { key: "century_club", name: "Century Club", description: "100 approved submissions", icon: "💯", rarity: "epic", category: "Milestone", requirementType: "submissions", requirementValue: 100 },
  { key: "veteran", name: "Veteran", description: "500 approved submissions", icon: "🎖️", rarity: "legendary", category: "Milestone", requirementType: "submissions", requirementValue: 500 },

  // Views
  { key: "going_viral", name: "Going Viral", description: "Hit 100K views on a single post", icon: "📈", rarity: "common", category: "Views", requirementType: "views", requirementValue: 100_000 },
  { key: "million_club", name: "Million Club", description: "Hit 1M views total", icon: "🌟", rarity: "rare", category: "Views", requirementType: "views", requirementValue: 1_000_000 },
  { key: "ten_m_milestone", name: "10M Milestone", description: "Hit 10M views total", icon: "🚀", rarity: "epic", category: "Views", requirementType: "views", requirementValue: 10_000_000 },
  { key: "viral_legend", name: "Viral Legend", description: "Hit 100M views total", icon: "👑", rarity: "legendary", category: "Views", requirementType: "views", requirementValue: 100_000_000 },

  // Earnings
  { key: "first_payout", name: "First Payout", description: "Earn your first dollar", icon: "💵", rarity: "common", category: "Earnings", requirementType: "earnings", requirementValue: 1 },
  { key: "hustler", name: "Hustler", description: "Earn $100 total", icon: "💰", rarity: "common", category: "Earnings", requirementType: "earnings", requirementValue: 100 },
  { key: "pro_creator", name: "Pro Creator", description: "Earn $500 total", icon: "💎", rarity: "rare", category: "Earnings", requirementType: "earnings", requirementValue: 500 },
  { key: "top_earner", name: "Top Earner", description: "Earn $2,000 total", icon: "🏆", rarity: "epic", category: "Earnings", requirementType: "earnings", requirementValue: 2000 },
  { key: "elite_creator", name: "Elite Creator", description: "Earn $10,000 total", icon: "👸", rarity: "legendary", category: "Earnings", requirementType: "earnings", requirementValue: 10000 },

  // Rank
  { key: "podium_finish", name: "Podium Finish", description: "Finish Top 3 in any weekly leaderboard", icon: "🥉", rarity: "rare", category: "Rank", requirementType: "rank", requirementValue: 3 },
  { key: "champion", name: "Champion", description: "Finish #1 in any weekly leaderboard", icon: "🥇", rarity: "epic", category: "Rank", requirementType: "rank", requirementValue: 1 },
  { key: "dynasty", name: "Dynasty", description: "Finish #1 three weeks in a row", icon: "🏰", rarity: "legendary", category: "Rank", requirementType: "rank", requirementValue: 3 },

  // Campaign
  { key: "versatile", name: "Versatile", description: "Submit to 5 different campaign categories", icon: "🎨", rarity: "rare", category: "Campaign", requirementType: "categories", requirementValue: 5 },
  { key: "campaign_veteran", name: "Campaign Veteran", description: "Join 25 campaigns", icon: "🗺️", rarity: "rare", category: "Campaign", requirementType: "campaigns", requirementValue: 25 },
];

export function rarityColor(rarity: AchievementRarity): string {
  switch (rarity) {
    case "legendary":
      return "text-warning border-warning/40 bg-warning/10";
    case "epic":
      return "text-destructive border-destructive/40 bg-destructive/10";
    case "rare":
      return "text-primary border-primary/40 bg-primary/10";
    default:
      return "text-muted-foreground border-border bg-muted/30";
  }
}

export function rarityLabel(rarity: AchievementRarity): string {
  return rarity.charAt(0).toUpperCase() + rarity.slice(1);
}
