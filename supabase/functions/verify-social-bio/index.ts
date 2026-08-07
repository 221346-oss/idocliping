import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

type Platform = "tiktok" | "instagram" | "youtube" | "x";

/** Detect platform + handle straight from a pasted public profile link. */
export function parseProfileUrl(raw: string): { platform: Platform; handle: string } | null {
  let u: URL;
  try {
    u = new URL(raw.trim());
  } catch {
    return null;
  }
  const host = u.hostname.toLowerCase().replace(/^www\./, "");
  const segs = u.pathname.split("/").filter(Boolean);
  const clean = (s: string) => s.replace(/^@/, "").trim();

  if (host === "tiktok.com" || host.endsWith(".tiktok.com")) {
    const seg = segs.find((s) => s.startsWith("@"));
    return seg ? { platform: "tiktok", handle: clean(seg) } : null;
  }
  if (host === "instagram.com" || host.endsWith(".instagram.com")) {
    return segs[0] ? { platform: "instagram", handle: clean(segs[0]) } : null;
  }
  if (host === "youtube.com" || host.endsWith(".youtube.com")) {
    const seg = segs.find((s) => s.startsWith("@")) ?? (segs[0] === "c" || segs[0] === "user" ? segs[1] : undefined);
    return seg ? { platform: "youtube", handle: clean(seg) } : null;
  }
  if (host === "x.com" || host === "twitter.com" || host.endsWith(".twitter.com")) {
    return segs[0] ? { platform: "x", handle: clean(segs[0]) } : null;
  }
  return null;
}

function profileUrlFor(platform: string, handle: string, stored?: string | null) {
  if (stored && /^https?:\/\//i.test(stored)) return stored;
  const h = handle.replace(/^@/, "");
  switch (platform) {
    case "tiktok": return `https://www.tiktok.com/@${h}`;
    case "instagram": return `https://www.instagram.com/${h}/`;
    case "youtube": return `https://www.youtube.com/@${h}/about`;
    case "x": return `https://x.com/${h}`;
    default: return null;
  }
}

function toText(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&quot;|&#34;/g, '"')
    .replace(/&amp;|&#38;/g, "&")
    .replace(/&#x?[0-9a-f]+;/gi, " ")
    .replace(/\\u[0-9a-f]{4}/gi, " ")
    .replace(/\s+/g, " ");
}

const normalize = (s: string) => s.toLowerCase().replace(/[\s\-_]+/g, "");

/** Best-effort follower count from public profile markup. */
function parseFollowers(html: string): number | null {
  const json = html.match(/"followerCount":\s*(\d+)/i) ?? html.match(/"subscriberCount":\s*"?(\d+)/i);
  if (json) return Number(json[1]);
  const text = toText(html);
  const m = text.match(/([\d.,]+)\s*([KMB])?\s*(followers|subscribers)/i);
  if (!m) return null;
  const base = Number(m[1].replace(/,/g, ""));
  if (!Number.isFinite(base)) return null;
  const mult = m[2]?.toUpperCase() === "B" ? 1e9 : m[2]?.toUpperCase() === "M" ? 1e6 : m[2]?.toUpperCase() === "K" ? 1e3 : 1;
  return Math.round(base * mult);
}

async function fetchProfile(url: string) {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
      },
      redirect: "follow",
    });
    if (!res.ok) return null;
    const html = await res.text();
    return html.length < 200 ? null : html;
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader) return json({ error: "Missing authorization" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;
    if (!user) return json({ error: "Not authenticated" }, 401);

    const body = await req.json().catch(() => ({}));

    // ── Mode 1: identify a pasted profile link (platform + handle + followers)
    if (typeof body?.profile_url === "string" && body.profile_url) {
      const parsed = parseProfileUrl(body.profile_url);
      if (!parsed) {
        return json(
          { error: "That link isn't a TikTok, Instagram, YouTube or X profile link." },
          400,
        );
      }
      const html = await fetchProfile(profileUrlFor(parsed.platform, parsed.handle, body.profile_url)!);
      return json({
        platform: parsed.platform,
        handle: parsed.handle,
        follower_count: html ? parseFollowers(html) : null,
      });
    }

    // ── Mode 2: verify ownership of a stored account via the bio code
    const accountId = typeof body?.account_id === "string" ? body.account_id : "";
    if (!accountId) return json({ error: "account_id or profile_url is required" }, 400);

    const { data: account, error: loadErr } = await supabase
      .from("social_accounts")
      .select("id, user_id, platform, handle, profile_url, verification_code, verified")
      .eq("id", accountId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (loadErr) return json({ error: loadErr.message }, 400);
    if (!account) return json({ error: "Account not found" }, 404);
    if (account.verified) return json({ status: "verified", message: "Already verified." });
    if (!account.verification_code) return json({ error: "No verification code on this account" }, 400);

    const url = profileUrlFor(account.platform, account.handle, account.profile_url);
    if (!url) return json({ error: "Unsupported platform" }, 400);

    const html = await fetchProfile(url);

    if (!html) {
      return json({
        status: "unreadable",
        message:
          "We couldn't read your profile automatically. Send it for manual review and an admin will verify it.",
      });
    }

    const followers = parseFollowers(html);
    const found = normalize(toText(html)).includes(normalize(account.verification_code));

    if (!found) {
      return json({
        status: "not_found",
        message: "We couldn't find the code in your bio yet. Save your bio and try again.",
      });
    }

    const { error: updErr } = await supabase
      .from("social_accounts")
      .update({
        verified: true,
        verification_status: "verified",
        verification_note: "Verified automatically from profile bio.",
        follower_count: followers,
        last_synced_at: new Date().toISOString(),
      })
      .eq("id", account.id);

    if (updErr) return json({ error: updErr.message }, 400);

    return json({
      status: "verified",
      follower_count: followers,
      message: "Account verified — you can remove the code from your bio.",
    });
  } catch (e) {
    console.error("verify-social-bio failed:", e);
    return json({ error: e instanceof Error ? e.message : "Unexpected error" }, 500);
  }
});
