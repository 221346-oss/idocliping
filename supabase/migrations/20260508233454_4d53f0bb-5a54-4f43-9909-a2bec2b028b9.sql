
-- ─── 002: app_settings ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.app_settings (
  key text PRIMARY KEY,
  value text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read app_settings" ON public.app_settings;
CREATE POLICY "Anyone can read app_settings"
  ON public.app_settings FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Admins manage app_settings" ON public.app_settings;
CREATE POLICY "Admins manage app_settings"
  ON public.app_settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS trg_app_settings_updated ON public.app_settings;
CREATE TRIGGER trg_app_settings_updated
  BEFORE UPDATE ON public.app_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.app_settings (key, value) VALUES ('rules_version', '1') ON CONFLICT (key) DO NOTHING;
INSERT INTO public.app_settings (key, value) VALUES ('community_link', '') ON CONFLICT (key) DO NOTHING;

-- ─── platform_rules ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.platform_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_text text NOT NULL DEFAULT '',
  "order" int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.platform_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read active platform_rules" ON public.platform_rules;
CREATE POLICY "Anyone can read active platform_rules"
  ON public.platform_rules FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Admins manage platform_rules" ON public.platform_rules;
CREATE POLICY "Admins manage platform_rules"
  ON public.platform_rules FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS trg_platform_rules_updated ON public.platform_rules;
CREATE TRIGGER trg_platform_rules_updated
  BEFORE UPDATE ON public.platform_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ─── campaigns extra columns ──────────────────────────────────────────
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS community_link text;
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS allowed_niches_pages text[];
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS not_allowed text[];
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS content_requirements text;
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS song_link text;
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS example_ads text[];
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS requirements jsonb;
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS requirements_allowed text[];
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS requirements_not_allowed text[];
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS sounds jsonb;
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS max_submissions_per_account int;
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS max_earnings_per_creator numeric;
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS max_earnings_per_post numeric;

-- ─── 003: creator delete own pending submissions ──────────────────────
DROP POLICY IF EXISTS "Creators delete own pending submissions" ON public.submissions;
CREATE POLICY "Creators delete own pending submissions"
  ON public.submissions FOR DELETE TO authenticated
  USING (auth.uid() = creator_id AND status = 'pending');

-- ─── 004: cookie_preferences ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.cookie_preferences (
  browser_key uuid PRIMARY KEY,
  consent_accepted boolean NOT NULL DEFAULT false,
  analytics_enabled boolean NOT NULL DEFAULT false,
  marketing_enabled boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.cookie_preferences IS 'Per-browser cookie consent (landing); keyed by client-held UUID.';
ALTER TABLE public.cookie_preferences ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.cookie_preferences FROM PUBLIC;
GRANT ALL ON public.cookie_preferences TO postgres;
GRANT ALL ON public.cookie_preferences TO service_role;

CREATE OR REPLACE FUNCTION public.get_cookie_preferences(p_browser_key uuid)
RETURNS TABLE (consent_accepted boolean, analytics_enabled boolean, marketing_enabled boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT c.consent_accepted, c.analytics_enabled, c.marketing_enabled
  FROM public.cookie_preferences c WHERE c.browser_key = p_browser_key;
$$;

CREATE OR REPLACE FUNCTION public.upsert_cookie_preferences(
  p_browser_key uuid, p_consent_accepted boolean, p_analytics boolean, p_marketing boolean
) RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$
  INSERT INTO public.cookie_preferences (browser_key, consent_accepted, analytics_enabled, marketing_enabled)
  VALUES (p_browser_key, p_consent_accepted, p_analytics, p_marketing)
  ON CONFLICT (browser_key) DO UPDATE SET
    consent_accepted = EXCLUDED.consent_accepted,
    analytics_enabled = EXCLUDED.analytics_enabled,
    marketing_enabled = EXCLUDED.marketing_enabled,
    updated_at = now();
$$;

GRANT EXECUTE ON FUNCTION public.get_cookie_preferences(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_cookie_preferences(uuid, boolean, boolean, boolean) TO anon, authenticated;

-- ─── 005: leaderboard badges ──────────────────────────────────────────
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

CREATE TABLE IF NOT EXISTS public.creator_badge_overrides (
  creator_id uuid PRIMARY KEY REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  tier_order int NOT NULL CHECK (tier_order >= 1 AND tier_order <= 10),
  admin_note text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);

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
  ON public.creator_badge_overrides FOR SELECT TO authenticated USING (true);

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
