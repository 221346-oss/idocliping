import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders, corsJson } from "../_shared/automation-cors.ts";
import { assertAdmin } from "../_shared/automation-guards.ts";

function shiftIntoUtcHumanWindow(d: Date): Date {
  const x = new Date(d);
  const h = x.getUTCHours();
  const minH = 9;
  const maxH = 23;
  if (h < minH) {
    x.setUTCHours(minH, Math.floor(Math.random() * 60), Math.floor(Math.random() * 60), 0);
  } else if (h > maxH) {
    x.setUTCDate(x.getUTCDate() + 1);
    x.setUTCHours(minH, Math.floor(Math.random() * 60), Math.floor(Math.random() * 60), 0);
  }
  return x;
}

export default Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return corsJson({ error: "Method not allowed" }, 405);

  const url = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const service = createClient(url, serviceKey);

  const gate = await assertAdmin(req, service);
  if (gate) return gate;

  let body: {
    campaign_id: string;
    count: number;
    category?: "music" | "clipping" | "logo" | "ugc";
  };

  try {
    body = await req.json();
  } catch {
    return corsJson({ error: "Invalid JSON" }, 400);
  }

  if (!body.campaign_id || !Number.isFinite(body.count) || body.count < 1 || body.count > 5000) {
    return corsJson({ error: "campaign_id and count in 1–5000 required" }, 400);
  }

  const { data: camp, error: cErr } = await service
    .from("campaigns")
    .select("id, category, status")
    .eq("id", body.campaign_id)
    .maybeSingle();

  if (cErr || !camp?.id) return corsJson({ error: "campaign not found" }, 404);
  if (camp.status !== "active") return corsJson({ error: "campaign must be active" }, 400);

  let categoryFilter = body.category ?? (camp.category as typeof body.category);
  const buckets = ["clipping", "ugc", "logo", "music"] as const;
  type Bucket = typeof buckets[number];

  function isBucket(s: unknown): s is Bucket {
    return typeof s === "string" && buckets.includes(s as Bucket);
  }

  if (!isBucket(categoryFilter)) {
    return corsJson({
      error:
        "Campaign category must be one of music, clipping, ugc, or logo for simulated creators (or send category override).",
    }, 400);
  }

  const { data: poolFlags, error: pErr } = await service
    .from("internal_creator_flags")
    .select(`
      user_id,
      profiles!inner (
        user_id,
        category_specialty
      )
    `)
    .eq("is_test_creator", true)
    .eq("profiles.category_specialty", categoryFilter as never);

  if (pErr) return corsJson({ error: pErr.message }, 500);

  const freePool = (poolFlags ?? [])
    .map((row: { user_id?: string }) => row.user_id)
    .filter(Boolean) as string[];

  freePool.sort(() => Math.random() - 0.5);

  const { data: taken } = await service
    .from("campaign_test_assignments")
    .select("test_creator_id")
    .eq("campaign_id", camp.id);

  const takenSet = new Set((taken ?? []).map((t: { test_creator_id: string }) => t.test_creator_id));
  const slice = freePool.filter((uid) => !takenSet.has(uid)).slice(0, Math.floor(body.count));

  if (!slice.length) {
    return corsJson({
      error: "No creators available — wrong category specialty or campaign already assigned this pool.",
    }, 400);
  }

  const now = Date.now();
  const minEdge = now + 6 * 3600 * 1000;
  const maxEdge = now + 72 * 3600 * 1000;

  async function anchorFor(uid: string): Promise<number> {
    const [{ data: pend }, { data: subs }] = await Promise.all([
      service
        .from("campaign_test_assignments")
        .select("scheduled_submit_at")
        .eq("test_creator_id", uid)
        .eq("submission_status", "pending"),
      service
        .from("submissions")
        .select("created_at")
        .eq("creator_id", uid)
        .order("created_at", { ascending: false })
        .limit(120),
    ]);

    const ts: number[] = [now];
    pend?.forEach((r: { scheduled_submit_at?: string }) => {
      if (r.scheduled_submit_at) ts.push(Date.parse(r.scheduled_submit_at));
    });
    subs?.forEach((s: { created_at?: string }) => {
      if (s.created_at) ts.push(Date.parse(s.created_at));
    });

    let x = Math.max(...ts.filter((n) => !Number.isNaN(n)));
    if (!Number.isFinite(x)) x = now;

    x = Math.max(x, now) + Math.floor(Math.random() * 15 * 60 * 1000) + 4 * 3600 * 1000;
    return x;
  }

  const inserts: Record<string, unknown>[] = [];

  for (const uid of slice) {
    const earliest = Math.max(await anchorFor(uid), minEdge);
    const span = Math.max(30 * 60 * 1000, maxEdge - earliest);
    const raw = earliest + Math.random() * span;
    let when = shiftIntoUtcHumanWindow(new Date(raw)).getTime();
    when = Math.min(Math.max(when, earliest), maxEdge);

    inserts.push({
      campaign_id: camp.id,
      test_creator_id: uid,
      submission_status: "pending",
      scheduled_submit_at: new Date(when).toISOString(),
    });
  }

  const { error: insErr } = await service.from("campaign_test_assignments").insert(inserts);
  if (insErr) return corsJson({ error: insErr.message }, 500);

  return corsJson({ assigned: inserts.length, campaign_id: camp.id }, 200);
});
