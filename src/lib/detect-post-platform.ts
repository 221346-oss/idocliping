/** Maps a post URL host to app `social_platform` enum values */
export type SocialPlatformKey = "tiktok" | "instagram" | "youtube" | "x";

export function detectSocialPlatformFromUrl(raw: string): SocialPlatformKey | null {
  let u: URL;
  try {
    u = new URL(raw.trim());
  } catch {
    return null;
  }
  const h = u.hostname.toLowerCase();

  if (h === "tiktok.com" || h.endsWith(".tiktok.com")) return "tiktok";
  if (h === "instagram.com" || h.endsWith(".instagram.com")) return "instagram";
  if (h === "youtube.com" || h.endsWith(".youtube.com") || h === "youtu.be") return "youtube";
  if (h === "twitter.com" || h.endsWith(".twitter.com") || h === "x.com") return "x";

  return null;
}
