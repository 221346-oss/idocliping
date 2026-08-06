import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

/** Best-effort public profile URL for a platform + handle. */
function profileUrlFor(platform: string, handle: string, stored?: string | null) {
  if (stored && /^https?:\/\//i.test(stored)) return stored;
  const h = handle.replace(/^@/, "");
  switch (platform) {
    case "tiktok":
      return `https://www.tiktok.com/@${h}`;
    case "instagram":
      return `https://www.instagram.com/${h}/`;
    case "youtube":
      return `https://www.youtube.com/@${h}/about`;
    case "x":
      return `https://x.com/${h}`;
    default:
      return null;
  }
}

/** Strip tags/entities so the bio text is searchable. */
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
    const accountId = typeof body?.account_id === "string" ? body.account_id : "";
    if (!accountId) return json({ error: "account_id is required" }, 400);

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

    let html = "";
    let fetchOk = false;
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
          "Accept-Language": "en-US,en;q=0.9",
        },
        redirect: "follow",
      });
      fetchOk = res.ok;
      if (res.ok) html = await res.text();
    } catch (_e) {
      fetchOk = false;
    }

    if (!fetchOk || html.length < 200) {
      // Page unreadable / blocked — fall back to admin review.
      await supabase
        .from("social_accounts")
        .update({
          verification_status: "pending",
          verification_requested_at: new Date().toISOString(),
          verification_note: "Automatic check could not read the profile page — queued for manual review.",
        })
        .eq("id", account.id);
      return json({
        status: "pending",
        message: "We couldn't read your profile automatically — an admin will review it shortly.",
      });
    }

    const haystack = normalize(toText(html));
    const found = haystack.includes(normalize(account.verification_code));

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
      })
      .eq("id", account.id);

    if (updErr) return json({ error: updErr.message }, 400);

    return json({ status: "verified", message: "Account verified — you can remove the code from your bio." });
  } catch (e) {
    console.error("verify-social-bio failed:", e);
    return json({ error: e instanceof Error ? e.message : "Unexpected error" }, 500);
  }
});
