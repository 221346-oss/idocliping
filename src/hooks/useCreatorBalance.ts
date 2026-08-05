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

function countsTowardWithdrawable(row: {
  type?: string | null;
  submissions?: { is_test_submission?: boolean | null } | null;
}) {
  const isTest = !!row.submissions?.is_test_submission;
  if (isTest && (row.type === "campaign" || row.type === "referral")) return false;
  return true;
}

/** Single source of truth for creator wallet figures (nav chip, wallet page, profile stats). */
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
      supabase.from("earnings").select("amount, type, status, submissions(is_test_submission)").eq("creator_id", user.id),
      supabase.from("withdrawal_requests").select("amount, status").eq("creator_id", user.id),
    ]);

    const rows = (earnings ?? []) as any[];
    const earned = rows.reduce((acc, r) => {
      if (!countsTowardWithdrawable(r)) return acc;
      return acc + Number(r.amount ?? 0);
    }, 0);

    const requests = (reqs ?? []) as any[];
    const reserved = requests.filter((r) => r.status !== "rejected").reduce((a, b) => a + Number(b.amount ?? 0), 0);
    const paid = requests.filter((r) => r.status === "paid").reduce((a, b) => a + Number(b.amount ?? 0), 0);
    const inFlight = requests
      .filter((r) => r.status === "pending" || r.status === "approved")
      .reduce((a, b) => a + Number(b.amount ?? 0), 0);

    setLifetime(earned);
    setWithdrawn(paid);
    setPending(inFlight);
    setAvailable(Math.max(0, earned - reserved));
    setLoading(false);
  };

  useEffect(() => {
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  return { available, pending, lifetime, withdrawn, loading, reload };
}
