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

  let body: { batch_id: string };
  try {
    body = await req.json();
  } catch {
    return corsJson({ error: "Invalid JSON" }, 400);
  }

  if (!body.batch_id) return corsJson({ error: "batch_id required" }, 400);

  const { data: flags, error: fErr } = await service.from("internal_creator_flags").select("user_id").eq(
    "test_batch_id",
    body.batch_id,
  );

  if (fErr) return corsJson({ error: fErr.message }, 500);
  const uids = [...new Set((flags ?? []).map((x: { user_id: string }) => x.user_id))];

  /** delete dependent rows referencing auth-linked submission creators */
  for (const creatorId of uids) {
    const { data: subs } = await service.from("submissions").select("id").eq("creator_id", creatorId);
    const sids = (subs ?? []).map((s: { id: string }) => s.id);
    if (sids.length) {
      await service.from("earnings").delete().eq("creator_id", creatorId);
      await service.from("submissions").delete().in("id", sids);
    }
    await service.from("campaign_test_assignments").delete().eq("test_creator_id", creatorId);
    await service.from("campaign_participants").delete().eq("creator_id", creatorId);
    await service.from("creator_leaderboard_points").delete().eq("user_id", creatorId);
    await service.from("internal_creator_flags").delete().eq("user_id", creatorId);
    await service.auth.admin.deleteUser(creatorId);
  }

  await service.from("test_creator_batches").update({ status: "destroyed", creator_count: 0 }).eq(
    "id",
    body.batch_id,
  );

  return corsJson({ destroyed_users: uids.length, batch_id: body.batch_id });
});
