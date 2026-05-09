import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

/**
 * Invoke weekly/monthly rank-reward grants (cosmetics).
 * Schedule via Supabase cron or external scheduler:
 *   POST .../process-rank-rewards?period=weekly
 * Headers: Authorization: Bearer <SERVICE_ROLE_KEY>
 * Optional: x-cron-secret must match CRON_SECRET env when set.
 */
Deno.serve(async (req: Request) => {
  const cronSecret = Deno.env.get("CRON_SECRET");
  if (cronSecret) {
    const hdr = req.headers.get("x-cron-secret");
    if (hdr !== cronSecret) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  const url = new URL(req.url);
  const period = url.searchParams.get("period") === "monthly" ? "monthly" : "weekly";

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) {
    return new Response(JSON.stringify({ error: "missing env" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(supabaseUrl, serviceKey);
  const { data, error } = await supabase.rpc("grant_rank_reward_cosmetics", {
    p_period: period,
  });

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
