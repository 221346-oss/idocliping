-- Run manually in Supabase SQL Editor after 001–004 (or with base schema).
-- Ten placement tiers + perks (JSON) + optional per-creator overrides managed by admins.

CREATE TABLE IF NOT EXISTS public.leaderboard_badge_tiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tier_order int NOT NULL UNIQUE CHECK (tier_order >= 1 AND tier_order <= 10),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  rank_from int NOT NULL,
  rank_to int NOT NULL,
  perks jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT leaderboard_badge_tiers_rank_range CHECK (rank_from >= 1 AND rank_to >= rank_from)
);

COMMENT ON TABLE public.leaderboard_badge_tiers IS 'Rank bands → perks for leaderboard gamification; tier_order 10 = best (#1).';
COMMENT ON COLUMN public.leaderboard_badge_tiers.perks IS 'Suggested keys: withdrawal_minimum_reduction_usd (number), platform_fee_discount_percent (number), payout_bonus_percent (number), custom_note (string).';

CREATE TABLE IF NOT EXISTS public.creator_badge_overrides (
  creator_id uuid PRIMARY KEY REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  tier_order int NOT NULL CHECK (tier_order >= 1 AND tier_order <= 10),
  admin_note text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.creator_badge_overrides IS 'Admin-assigned tier for a creator (overrides rank-derived tier on leaderboard perks UI).';

ALTER TABLE public.leaderboard_badge_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creator_badge_overrides ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "leaderboard_badge_tiers_select_authenticated" ON public.leaderboard_badge_tiers;
CREATE POLICY "leaderboard_badge_tiers_select_authenticated"
  ON public.leaderboard_badge_tiers FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "leaderboard_badge_tiers_admin_all" ON public.leaderboard_badge_tiers;
CREATE POLICY "leaderboard_badge_tiers_admin_all"
  ON public.leaderboard_badge_tiers FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "creator_badge_overrides_select" ON public.creator_badge_overrides;
CREATE POLICY "creator_badge_overrides_select"
  ON public.creator_badge_overrides FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "creator_badge_overrides_admin_mutate" ON public.creator_badge_overrides;
CREATE POLICY "creator_badge_overrides_admin_mutate"
  ON public.creator_badge_overrides FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "creator_badge_overrides_admin_update" ON public.creator_badge_overrides;
CREATE POLICY "creator_badge_overrides_admin_update"
  ON public.creator_badge_overrides FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "creator_badge_overrides_admin_delete" ON public.creator_badge_overrides;
CREATE POLICY "creator_badge_overrides_admin_delete"
  ON public.creator_badge_overrides FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Seed / upsert default tiers (rank 1 … 9 unique bands, 10+ shares Contender)
INSERT INTO public.leaderboard_badge_tiers (tier_order, slug, title, rank_from, rank_to, perks) VALUES
  (10, 'sovereign', 'Sovereign', 1, 1, '{"withdrawal_minimum_reduction_usd":50,"platform_fee_discount_percent":10,"payout_bonus_percent":5}'::jsonb),
  (9, 'virtuoso', 'Virtuoso', 2, 2, '{"withdrawal_minimum_reduction_usd":45,"platform_fee_discount_percent":9}'::jsonb),
  (8, 'elite', 'Elite', 3, 3, '{"withdrawal_minimum_reduction_usd":40,"platform_fee_discount_percent":8}'::jsonb),
  (7, 'maestro', 'Maestro', 4, 4, '{"withdrawal_minimum_reduction_usd":35,"platform_fee_discount_percent":7}'::jsonb),
  (6, 'vanguard', 'Vanguard', 5, 5, '{"withdrawal_minimum_reduction_usd":30,"platform_fee_discount_percent":6}'::jsonb),
  (5, 'specialist', 'Specialist', 6, 6, '{"withdrawal_minimum_reduction_usd":25,"platform_fee_discount_percent":5}'::jsonb),
  (4, 'operator', 'Operator', 7, 7, '{"withdrawal_minimum_reduction_usd":20,"platform_fee_discount_percent":4}'::jsonb),
  (3, 'rising_star', 'Rising Star', 8, 8, '{"withdrawal_minimum_reduction_usd":15,"platform_fee_discount_percent":3}'::jsonb),
  (2, 'grinder', 'Grinder', 9, 9, '{"withdrawal_minimum_reduction_usd":10,"platform_fee_discount_percent":2}'::jsonb),
  (1, 'contender', 'Contender', 10, 2147483647, '{"withdrawal_minimum_reduction_usd":0,"platform_fee_discount_percent":0}'::jsonb)
ON CONFLICT (tier_order) DO NOTHING;
