import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { CreatorShell, PageContainer, DetailHeader } from "@/components/shell/CreatorShell";
import { EmptyState } from "@/components/EmptyState";
import { RowListSkeleton } from "@/components/ui-kit/Skeletons";
import { maskUsernameMiddle } from "@/lib/username-mask";
import { Gift, Trophy, ChevronRight } from "lucide-react";

type Reward = {
  id: string;
  week_start: string;
  title: string;
  description: string;
  prize_text: string;
};

type TopEarner = { user_id: string; name: string; amount: number };

const money = (n: number) =>
  n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Weekly rewards announced by admins + this week's top earners. */
export default function Rewards() {
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [top, setTop] = useState<TopEarner[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      const weekAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();

      const [rw, earn] = await Promise.all([
        supabase
          .from("weekly_rewards")
          .select("id, week_start, title, description, prize_text")
          .eq("is_published", true)
          .order("week_start", { ascending: false })
          .limit(6),
        supabase
          .from("earnings")
          .select("creator_id, amount, created_at")
          .gte("created_at", weekAgo),
      ]);

      const totals = new Map<string, number>();
      for (const e of earn.data ?? []) {
        totals.set(e.creator_id, (totals.get(e.creator_id) ?? 0) + Number(e.amount ?? 0));
      }
      const ids = [...totals.keys()];
      let names = new Map<string, string>();
      if (ids.length) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("user_id, full_name, profile_slug")
          .in("user_id", ids);
        names = new Map((profs ?? []).map((p) => [p.user_id, p.profile_slug || p.full_name || ""]));
      }

      if (!alive) return;
      setRewards((rw.data as Reward[]) ?? []);
      setTop(
        [...totals.entries()]
          .map(([user_id, amount]) => ({
            user_id,
            amount,
            name: maskUsernameMiddle(names.get(user_id) || ""),
          }))
          .sort((a, b) => b.amount - a.amount)
          .slice(0, 10),
      );
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, []);

  return (
    <CreatorShell>
      <PageContainer className="min-w-0">
        <DetailHeader title="Rewards" />

        {loading ? (
          <RowListSkeleton count={5} />
        ) : (
          <div className="space-y-5 pb-8">
            <section className="space-y-3">
              <h2 className="font-display text-[16px] font-semibold">This week</h2>
              {rewards.length === 0 ? (
                <EmptyState
                  icon={Gift}
                  title="No rewards announced yet"
                  description="Weekly rewards show up here as soon as they go live."
                />
              ) : (
                rewards.map((r) => (
                  <article key={r.id} className="surface-card p-4">
                    <div className="flex items-start gap-3">
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/[0.14] text-primary">
                        <Gift className="h-5 w-5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-display text-[15px] font-semibold leading-tight">{r.title}</h3>
                        {r.description && (
                          <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">{r.description}</p>
                        )}
                        {r.prize_text && (
                          <p className="mt-2 inline-flex rounded-full bg-primary/[0.12] px-3 py-1 text-[12px] font-semibold text-primary">
                            {r.prize_text}
                          </p>
                        )}
                      </div>
                    </div>
                  </article>
                ))
              )}
            </section>

            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-[16px] font-semibold">Top earners this week</h2>
                <Link
                  to="/leaderboard"
                  className="inline-flex items-center gap-1 text-[13px] font-medium text-primary focus-ring rounded-full"
                >
                  Leaderboard <ChevronRight className="h-4 w-4" />
                </Link>
              </div>

              {top.length === 0 ? (
                <EmptyState
                  icon={Trophy}
                  title="No earnings this week"
                  description="Be the first to post and claim the top spot."
                />
              ) : (
                <div className="list-group">
                  {top.map((t, i) => (
                    <div key={t.user_id} className="list-row">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-surface-raised text-[12px] font-semibold tabular-nums">
                        {i + 1}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-[14px] font-medium">{t.name}</span>
                      <span className="font-display text-[14px] font-semibold tabular-nums text-success">
                        ${money(t.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </PageContainer>
    </CreatorShell>
  );
}
