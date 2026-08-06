import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const listeners = new Set<(ids: string[]) => void>();
let cache: string[] = [];

function broadcast(ids: string[]) {
  cache = ids;
  listeners.forEach((l) => l(ids));
}

/**
 * Campaigns the creator saved. Persisted per account so they follow the user
 * and show up under My Activity → My Campaigns.
 */
export function useSavedCampaigns() {
  const { user } = useAuth();
  const [ids, setIds] = useState<string[]>(cache);

  useEffect(() => {
    listeners.add(setIds);
    return () => {
      listeners.delete(setIds);
    };
  }, []);

  const refresh = useCallback(async () => {
    if (!user) {
      broadcast([]);
      return;
    }
    const { data } = await supabase.from("saved_campaigns").select("campaign_id").eq("user_id", user.id);
    broadcast((data ?? []).map((r) => String(r.campaign_id)));
  }, [user]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const toggle = useCallback(
    async (id: string) => {
      if (!user) return false;
      const saved = cache.includes(id);
      if (saved) {
        broadcast(cache.filter((x) => x !== id));
        await supabase.from("saved_campaigns").delete().eq("user_id", user.id).eq("campaign_id", id);
        return false;
      }
      broadcast([...cache, id]);
      await supabase.from("saved_campaigns").insert({ user_id: user.id, campaign_id: id });
      return true;
    },
    [user],
  );

  const isSaved = useCallback((id: string) => ids.includes(id), [ids]);

  return { saved: ids, isSaved, toggle, refresh };
}
