import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { tierFromLifetimeEarningsUsd, type EarningsTier } from "@/lib/leaderboard-compute";
import { computeHonorScore, honorLabel } from "@/lib/honor-score";
import { isUuid } from "@/lib/profile-slug";

const BANNER_FALLBACK = "/marketing-campaign-banner-fallback.svg";

export interface ProfileViewModel {
  userId: string;
  displayName: string;
  usernameLabel: string;
  profileSlug: string | null;
  avatarUrl: string;
  bannerUrl: string;
  bio: string;
  joinedDate: Date;
  tier: EarningsTier;
  honorScore: number;
  honorLabelText: string;
  totalEarnings: number;
  level: number;
  platforms: string[];
  /** Sum of manual_views for approved subs per platform key */
  platformViewTotals: Record<string, number>;
  statistics: {
    totalSubmissions: number;
    approvedSubmissions: number;
    rejectedSubmissions: number;
    totalViews: number;
    completionRate: number;
    activeStreak: 0;
    bestRank: string;
  };
  campaigns: Array<{ id: string; title: string; status: string }>;
  submissions: Array<{
    id: string;
    campaignId: string;
    campaignTitle: string;
    platform: string;
    views: number;
    status: string;
    submittedAt: Date;
  }>;
  cosmeticsUnlocked: Array<{ id: string; name: string; image_url: string; type: string }>;
}

async function resolveTargetUserId(param: string | undefined, selfId: string | null): Promise<string | null> {
  if (!param || param === "me") return selfId;
  const p = param.trim();
  if (!p) return selfId;
  if (isUuid(p)) return p;

  const slug = p.toLowerCase();
  const { data: bySlug } = await supabase.from("profiles").select("user_id").eq("profile_slug", slug).maybeSingle();
  if (bySlug?.user_id) return bySlug.user_id;

  const { data: bySlugExact } = await supabase.from("profiles").select("user_id").eq("profile_slug", p).maybeSingle();
  if (bySlugExact?.user_id) return bySlugExact.user_id;

  const { data: byName } = await supabase
    .from("profiles")
    .select("user_id")
    .ilike("full_name", p.replace(/-/g, " "))
    .limit(2);
  if (byName?.length === 1) return byName[0].user_id;
  return null;
}

async function fetchProfileRow(userId: string) {
  const { data, error } = await supabase.from("profiles").select("*").eq("user_id", userId).maybeSingle();
  if (error) throw error;
  return data;
}

export async function buildProfileViewModel(userId: string): Promise<ProfileViewModel> {
  const [profileRes, subsRes, earnRes, socialRes] = await Promise.all([
    fetchProfileRow(userId),
    (supabase as any)
      .from("public_submissions")
      .select(
        "id, campaign_id, manual_views, status, created_at, platform, campaigns(title)",
      )
      .eq("creator_id", userId)
      .order("created_at", { ascending: false })
      .limit(500),
    (supabase as any)
      .from("public_creator_earnings")
      .select("lifetime_campaign_earnings")
      .eq("creator_id", userId),
    (supabase as any).from("public_creator_platforms").select("platform").eq("user_id", userId),
  ]);

  const profile = profileRes;
  if (!profile) throw new Error("Profile not found");

  const avatarUrl = profile.avatar_url || "";
  const bannerUrl = BANNER_FALLBACK;


  const subs = (subsRes.data ?? []) as any[];
  let totalEarnings = 0;
  for (const e of ((earnRes.data ?? []) as any[])) totalEarnings += Number((e as any).lifetime_campaign_earnings ?? 0);

  const tier = tierFromLifetimeEarningsUsd(totalEarnings);
  const approved = subs.filter((s) => s.status === "approved");
  const rejected = subs.filter((s) => s.status === "rejected");
  const totalViews = approved.reduce((a, s) => a + Number(s.manual_views ?? 0), 0);

  const platformViewTotals: Record<string, number> = {};
  for (const s of approved) {
    const pl = String(s.platform ?? "tiktok");
    platformViewTotals[pl] = (platformViewTotals[pl] ?? 0) + Number(s.manual_views ?? 0);
  }

  const honorB = computeHonorScore({
    approvedCount: approved.length,
    rejectedCount: rejected.length,
    campaignsCompleted: new Set(approved.map((x) => x.campaign_id)).size,
    adminFlags: 0,
  });
  const overrideHon = Number((profile as { honor_score_override?: number | null }).honor_score_override);
  const computedHonor = Math.round(honorB.total);
  const honorScore = Number.isFinite(overrideHon) ? Math.round(overrideHon) : computedHonor;
  const hLabel = honorLabel(honorScore);

  const campMap = new Map<string, string>();
  for (const s of subs) {
    const c = s.campaigns as { title?: string } | { title?: string }[] | null | undefined;
    const title = Array.isArray(c) ? c[0]?.title : c?.title;
    campMap.set(s.campaign_id, title ?? "Campaign");
  }
  const seenCamp = new Set<string>();
  const campaigns: ProfileViewModel["campaigns"] = [];
  for (const s of subs) {
    if (seenCamp.has(s.campaign_id)) continue;
    seenCamp.add(s.campaign_id);
    campaigns.push({
      id: s.campaign_id,
      title: campMap.get(s.campaign_id) ?? "Campaign",
      status: "ongoing",
    });
  }

  const submissions: ProfileViewModel["submissions"] = subs.slice(0, 100).map((s) => ({
    id: s.id,
    campaignId: s.campaign_id,
    campaignTitle: campMap.get(s.campaign_id) ?? "Campaign",
    platform: String(s.platform ?? "tiktok"),
    views: Number(s.manual_views ?? 0),
    status: String(s.status),
    submittedAt: new Date(s.created_at),
  }));

  const cosmeticsUnlocked: ProfileViewModel["cosmeticsUnlocked"] = [];


  const completionRate =
    subs.length > 0 ? Math.round((approved.length / subs.length) * 100) : 0;

  const displayName = (profile.full_name || "").trim() || "Creator";
  const slug = (profile as { profile_slug?: string | null }).profile_slug ?? null;
  const bio = (profile as { bio?: string }).bio ?? "";

  return {
    userId,
    displayName,
    usernameLabel: slug ? `@${slug}` : `@${userId.slice(0, 8)}`,
    profileSlug: slug ?? null,
    avatarUrl,
    bannerUrl,
    bio,
    joinedDate: new Date(profile.created_at),
    tier,
    honorScore,
    honorLabelText: hLabel,
    totalEarnings,
    level: honorScore,
    platforms: [...new Set(((socialRes.data ?? []) as any[]).map((x) => String((x as { platform: string }).platform)))],
    platformViewTotals,
    statistics: {
      totalSubmissions: subs.length,
      approvedSubmissions: approved.length,
      rejectedSubmissions: rejected.length,
      totalViews,
      completionRate,
      activeStreak: 0,
      bestRank: "—",
    },
    campaigns,
    submissions,
    cosmeticsUnlocked,
  };
}

export function usePublicProfile(routeParam: string | undefined) {
  const { user, role } = useAuth();
  const [vm, setVm] = useState<ProfileViewModel | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [targetUserId, setTargetUserId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const tid = await resolveTargetUserId(routeParam, user?.id ?? null);
      if (!tid) {
        setVm(null);
        setTargetUserId(null);
        setError("not_found");
        return;
      }
      const row = await fetchProfileRow(tid);
      const hidden = (row as { profile_hidden?: boolean })?.profile_hidden === true;
      const isSelf = user?.id === tid;
      const isAdmin = role === "admin";
      if (hidden && !isSelf && !isAdmin) {
        setVm(null);
        setTargetUserId(tid);
        setError("hidden");
        return;
      }
      const built = await buildProfileViewModel(tid);
      setVm(built);
      setTargetUserId(tid);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "error");
      setVm(null);
    } finally {
      setLoading(false);
    }
  }, [routeParam, user?.id, role]);

  useEffect(() => {
    void load();
  }, [load]);

  const isOwnProfile = Boolean(user && targetUserId && user.id === targetUserId);

  return { profile: vm, loading, error, targetUserId, isOwnProfile, reload: load };
}
