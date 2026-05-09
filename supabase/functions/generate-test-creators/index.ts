import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders, corsJson } from "../_shared/automation-cors.ts";
import { assertAdmin } from "../_shared/automation-guards.ts";

type Dist = { clipping: number; ugc: number; logo: number; music: number };
type Plat = "tiktok" | "youtube" | "instagram" | "x";
type CampaignCat = "clipping" | "ugc" | "logo" | "music";

const PLAT_KEYS: Plat[] = ["tiktok", "youtube", "instagram", "x"];

declare const EdgeRuntime: { waitUntil(p: Promise<unknown>): void } | undefined;

function pickPlatforms(cat: CampaignCat): Plat[] {
  const weight: Record<Plat, number> = {
    tiktok: 0.25,
    youtube: 0.25,
    instagram: 0.25,
    x: 0.25,
  };
  if (cat === "music" || cat === "clipping") {
    weight.tiktok = 0.43;
    weight.youtube = 0.43;
    weight.instagram = 0.085;
    weight.x = 0.052;
  } else if (cat === "ugc") {
    weight.instagram = 0.45;
    weight.tiktok = 0.45;
    weight.youtube = 0.065;
    weight.x = 0.035;
  } else if (cat === "logo") {
    weight.instagram = 0.45;
    weight.youtube = 0.43;
    weight.tiktok = 0.095;
    weight.x = 0.025;
  }

  const count = Math.min(3, 1 + Math.floor(Math.random() * 3));
  const picks = new Set<Plat>();

  while (picks.size < count) {
    const r = Math.random();
    let acc = 0;
    const totalW = PLAT_KEYS.reduce((a, p) => a + weight[p], 0);
    for (const p of PLAT_KEYS) {
      acc += weight[p] / totalW;
      if (r <= acc) {
        picks.add(p);
        break;
      }
    }
  }

  return [...picks];
}

function randHonor(): number {
  return 72 + Math.floor(Math.random() * (96 - 72 + 1));
}

function randomJoinedAt(): string {
  const mo = 3 + Math.floor(Math.random() * 16);
  const d = new Date();
  d.setUTCMonth(d.getUTCMonth() - mo);
  d.setUTCDate(d.getUTCDate() - Math.floor(Math.random() * 28));
  return d.toISOString();
}

function parseRpcStringArray(raw: unknown): string[] | null {
  if (Array.isArray(raw)) return raw as string[];
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as string[]) : null;
    } catch {
      return null;
    }
  }
  return null;
}

export default Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return corsJson({ error: "Method not allowed" }, 405);

  const url = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const service = createClient(url, serviceKey);

  const gate = await assertAdmin(req, service);
  if (gate) return gate;

  let body: { batch_name?: string; distribution?: Partial<Dist> };
  try {
    body = await req.json();
  } catch {
    return corsJson({ error: "Invalid JSON body" }, 400);
  }

  const defaults: Dist = { clipping: 200, ugc: 100, logo: 300, music: 400 };
  const dist: Dist = {
    clipping: Math.floor(Number(body.distribution?.clipping ?? defaults.clipping)),
    ugc: Math.floor(Number(body.distribution?.ugc ?? defaults.ugc)),
    logo: Math.floor(Number(body.distribution?.logo ?? defaults.logo)),
    music: Math.floor(Number(body.distribution?.music ?? defaults.music)),
  };
  const total = dist.clipping + dist.ugc + dist.logo + dist.music;
  if (![dist.clipping, dist.ugc, dist.logo, dist.music].every((n) => n >= 0 && n <= 2500)) {
    return corsJson({ error: "distribution values must be 0–2500 integers" }, 400);
  }
  if (total < 1 || total > 5000) return corsJson({ error: `total creators must be 1–5000 (got ${total})` }, 400);

  const batchName =
    body.batch_name?.trim() ||
    `Batch ${new Intl.DateTimeFormat("en-US", {
      month: "long",
      year: "numeric",
    }).format(new Date())}`;

  async function orchestrate(jobId: string, batchId: string) {
    await service.from("automation_generation_jobs").update({
      status: "running",
      message: "Allocating IDs…",
    }).eq("id", jobId);

    const { data: publicRaw, error: allocErr } = await service.rpc("alloc_creator_public_ids", {
      p_n: total,
    });
    if (allocErr) throw allocErr;

    const publicIds = parseRpcStringArray(publicRaw);
    if (!publicIds || publicIds.length !== total) {
      throw new Error(`alloc_creator_public_ids returned invalid length (${publicIds?.length})`);
    }

    const [{ data: avatars }, { data: banners }] = await Promise.all([
      service.from("cosmetic_items").select("id").eq("type", "avatar").eq(
        "unlock_type",
        "default",
      ).eq("is_active", true),
      service.from("cosmetic_items").select("id").eq("type", "banner").eq(
        "unlock_type",
        "default",
      ).eq("is_active", true),
    ]);

    const avatarIds = (avatars ?? []).map((r: { id: string }) => r.id).filter(Boolean);
    const bannerIds = (banners ?? []).map((r: { id: string }) => r.id).filter(Boolean);

    await service.from("test_creator_batches").update({
      creator_count: total,
    }).eq("id", batchId);

    let pubIdx = 0;
    let done = 0;

    async function bumpProgress() {
      const pct = Math.min(100, Math.floor((done / total) * 100));
      await service.from("automation_generation_jobs").update({
        progress_pct: pct,
        processed: done,
        message: `Generated ${done} / ${total}`,
      }).eq("id", jobId);
    }

    async function spawnOne(cat: CampaignCat): Promise<boolean> {
      const digits = String(Math.floor(1000 + Math.random() * 9000));
      const slug = `tc_${cat}_${digits}`;
      const email = `${slug}@testcreator.iclip.internal`;
      const password = crypto.randomUUID() + crypto.randomUUID();

      const { data: created, error: cErr } = await service.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: slug },
      });
      const msg = cErr?.message ?? "";
      if (msg.includes("already") || msg.includes("registered") || cErr?.status === 422) {
        return false;
      }

      const userId = created?.user?.id;
      if (cErr || !userId) throw new Error(cErr?.message ?? "createUser failed");

      await service.from("profiles").update({
        full_name: slug,
        avatar_url: "",
        bio: "",
        profile_slug: slug.toLowerCase(),
        creator_public_id: publicIds[pubIdx++]!,
        category_specialty: cat,
        honor_score_override: randHonor(),
        created_at: randomJoinedAt(),
      }).eq("user_id", userId);

      await service.from("internal_creator_flags").upsert({
        user_id: userId,
        is_test_creator: true,
        test_batch_id: batchId,
        updated_at: new Date().toISOString(),
      });

      const platforms = pickPlatforms(cat);
      await service.from("social_accounts").delete().eq("user_id", userId);

      await service.from("social_accounts").insert(
        platforms.map((p, i) => ({
          user_id: userId,
          platform: p as never,
          handle: slug.replace(/-/g, "_") + "_" + String(i),
          verified: Math.random() < 0.12,
        })),
      );

      const av = avatarIds.length ? avatarIds[Math.floor(Math.random() * avatarIds.length)]! : null;
      const bn = bannerIds.length ? bannerIds[Math.floor(Math.random() * bannerIds.length)]! : null;

      if (av ?? bn) {
        await service.from("creator_profile_settings").upsert({
          user_id: userId,
          equipped_avatar_id: av,
          equipped_banner_id: bn,
        });
      }

      if (av && Math.random() < 0.85) {
        await service.from("creator_cosmetics").upsert({
          user_id: userId,
          cosmetic_id: av,
          unlocked_reason: "default",
        }, { onConflict: "user_id,cosmetic_id" });
      }
      if (bn && Math.random() < 0.85) {
        await service.from("creator_cosmetics").upsert({
          user_id: userId,
          cosmetic_id: bn,
          unlocked_reason: "default",
        }, { onConflict: "user_id,cosmetic_id" });
      }

      done++;
      if (done % 20 === 0 || done === total) await bumpProgress();

      await new Promise((r) => setTimeout(r, Math.random() * 120));
      return true;
    }

    const pile: CampaignCat[] = [];
    (
      Object.entries(dist) as [keyof Dist, number][]
    ).forEach(([cat, count]) => {
      for (let i = 0; i < count; i++) pile.push(cat as CampaignCat);
    });
    for (let i = pile.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pile[i], pile[j]] = [pile[j]!, pile[i]!];
    }

    let safety = pile.length + 1200;

    while (pile.length && safety-- > 0) {
      const cat = pile.pop()!;
      const ok = await spawnOne(cat);
      if (!ok) pile.unshift(cat);
    }

    if (pile.length) throw new Error(`Could not mint ${pile.length} accounts (collision limit)`);

    await service.from("automation_generation_jobs").update({
      status: "completed",
      progress_pct: 100,
      processed: done,
      message: `Done — ${done} creators`,
    }).eq("id", jobId);
  }

  const { data: batch, error: bErr } = await service.from("test_creator_batches").insert({
    batch_name: batchName,
    creator_count: 0,
    status: "active",
  }).select("id").single();

  if (bErr || !batch?.id) {
    return corsJson({ error: bErr?.message ?? "failed to create batch" }, 500);
  }

  const { data: job, error: jErr } = await service.from("automation_generation_jobs").insert({
    batch_id: batch.id,
    kind: "generate_test_creators",
    status: "queued",
    progress_pct: 0,
    processed: 0,
    total,
    message: "Queued…",
  }).select("id").single();

  if (jErr || !job?.id) {
    return corsJson({ error: jErr?.message ?? "failed to create job" }, 500);
  }

  const jobIdStr = job.id as string;
  const batchIdStr = batch.id as string;

  const run = orchestrate(jobIdStr, batchIdStr).catch(async (e) => {
    const detail = e instanceof Error ? e.message : String(e);
    await service.from("automation_generation_jobs").update({
      status: "failed",
      error_detail: detail,
      message: "Failed",
    }).eq("id", jobIdStr);
  });

  if (typeof EdgeRuntime !== "undefined") EdgeRuntime.waitUntil(run);
  else await run.catch(() => undefined);

  return corsJson({ batch_id: batchIdStr, job_id: jobIdStr }, 200);
});
