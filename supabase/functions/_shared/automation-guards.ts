import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

export async function assertAdmin(req: Request, service: SupabaseClient): Promise<Response | null> {
  const auth = req.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  const token = auth.slice(7);
  const { data: ud, error: uErr } = await service.auth.getUser(token);
  if (uErr || !ud.user?.id) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { data: roles } = await service
    .from("user_roles")
    .select("role")
    .eq("user_id", ud.user.id)
    .eq("role", "admin")
    .limit(1);

  if (!roles?.length) {
    return new Response(JSON.stringify({ error: "Forbidden — admin required" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  return null;
}
