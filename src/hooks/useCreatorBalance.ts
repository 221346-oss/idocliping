import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const MIN_WITHDRAWAL = 50;

export type CreatorBalance = {
  available: number;
  pending: number;
  lifetime: number;
  withdrawn: number;
  loading: boolean;
  reload: () => Promise<void>;
};

/**
 * Wallet rules:
 * - earnings.status = 'pending'  → counted as Pending (post is eligible, campaign not paid out yet)
 * - earnings.status = 'paid'     → counted toward Available balance (withdrawable)
 * - withdrawal requests that are pending/approved/paid reserve the available balance
 */
export function useCreatorBalance(): CreatorBalance {
  const { user } = useAuth();
  const [available, setAvailable] = useState(0);
  const [pending, setPending] = useState(0);
  const [lifetime, setLifetime] = useState(0);
  const [withdrawn, setWithdrawn] = useState(0);
  const [loading, setLoading] = useState(true);

  const reload = async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    const [{ data: earnings }, { data: reqs }] = await Promise.all([
      supabase.from("earnings").select("amount, status").eq("creator_id", user.id),
      supabase.from("withdrawal_requests").select("amount, status").eq("creator_id", user.id),
    ]);

    const rows = (earnings ?? []) as any[];
    const paidEarned = rows
      .filter((r) => r.status === "paid")
      .reduce((a, r) => a + Number(r.amount ?? 0), 0);
    const pendingEarned = rows
      .filter((r) => r.status !== "paid")
      .reduce((a, r) => a + Number(r.amount ?? 0), 0);

    const requests = (reqs ?? []) as any[];
    const reserved = requests.filter((r) => r.status !== "rejected").reduce((a, b) => a + Number(b.amount ?? 0), 0);
    const paidOut = requests.filter((r) => r.status === "paid").reduce((a, b) => a + Number(b.amount ?? 0), 0);

    setLifetime(paidEarned + pendingEarned);
    setWithdrawn(paidOut);
    setPending(pendingEarned);
    setAvailable(Math.max(0, paidEarned - reserved));
    setLoading(false);
  };


  useEffect(() => {
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  return { available, pending, lifetime, withdrawn, loading, reload };
}
