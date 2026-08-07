import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const ADMIN_EMAIL = "mairaghaffar005@gmail.com";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);
    const token = authHeader.slice(7);

    const service = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: ud, error: uErr } = await service.auth.getUser(token);
    const user = ud?.user;
    if (uErr || !user) return json({ error: "Unauthorized" }, 401);

    // The platform admin can never be deleted from the app.
    if ((user.email ?? "").toLowerCase() === ADMIN_EMAIL) {
      return json({ error: "The platform admin account cannot be deleted." }, 403);
    }
    const { data: roles } = await service
      .from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").limit(1);
    if (roles?.length) return json({ error: "Admin accounts cannot be deleted." }, 403);

    // Block deletion while money is still owed / in flight.
    const { data: unpaid } = await service
      .from("earnings").select("id").eq("creator_id", user.id).eq("status", "pending").limit(1);
    if (unpaid?.length) {
      return json({ error: "You still have pending earnings. Wait for payout before deleting." }, 400);
    }
    const { data: openWd } = await service
      .from("withdrawal_requests").select("id").eq("creator_id", user.id)
      .in("status", ["pending", "approved"]).limit(1);
    if (openWd?.length) {
      return json({ error: "You have a withdrawal in progress. Try again once it settles." }, 400);
    }

    // Clean up owned rows the FKs don't cascade, then remove the auth user.
    await service.from("submissions").delete().eq("creator_id", user.id);
    await service.from("earnings").delete().eq("creator_id", user.id);
    await service.from("social_accounts").delete().eq("user_id", user.id);
    await service.from("campaign_participants").delete().eq("creator_id", user.id);
    await service.from("saved_campaigns").delete().eq("user_id", user.id);
    await service.from("referral_codes").delete().eq("user_id", user.id);
    await service.from("withdrawal_requests").delete().eq("creator_id", user.id);
    await service.from("profiles").delete().eq("user_id", user.id);
    await service.from("user_roles").delete().eq("user_id", user.id);

    const { error: delErr } = await service.auth.admin.deleteUser(user.id);
    if (delErr) return json({ error: delErr.message }, 400);

    return json({ deleted: true });
  } catch (e) {
    console.error("delete-account failed:", e);
    return json({ error: e instanceof Error ? e.message : "Unexpected error" }, 500);
  }
});
