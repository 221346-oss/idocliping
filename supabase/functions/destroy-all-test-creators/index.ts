import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders, corsJson } from "../_shared/automation-cors.ts";
import { assertAdmin } from "../_shared/automation-guards.ts";

export default Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return corsJson({ error: "Method not allowed" }, 405);

  const url = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const service = createClient(url, serviceKey);

  const gate = await assertAdmin(req, service);
  if (gate) return gate;

  const { data: flags, error } = await service.from("internal_creator_flags").select("user_id").eq(
    "is_test_creator",
    true,
  );

  if (error) return corsJson({ error: error.message }, 500);

  const uids = [...new Set((flags ?? []).map((x: { user_id: string }) => x.user_id))];

  for (const creatorId of uids) {
    await service.from("earnings").delete().eq("creator_id", creatorId);
    await service.from("submissions").delete().eq("creator_id", creatorId);
    await service.from("campaign_test_assignments").delete().eq("test_creator_id", creatorId);
    await service.from("campaign_participants").delete().eq("creator_id", creatorId);
    await service.from("creator_leaderboard_points").delete().eq("user_id", creatorId);
    await service.from("internal_creator_flags").delete().eq("user_id", creatorId);
    await service.auth.admin.deleteUser(creatorId).catch(() => undefined);
  }

  await service
    .from("test_creator_batches")
    .update({ status: "destroyed", creator_count: 0 })
    .gte("created_at", "2000-01-01");

  return corsJson({ destroyed_users: uids.length });
});
