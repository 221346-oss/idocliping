-- Run manually in Supabase SQL Editor (Dashboard → SQL).
-- All manual patches (001–004) are concatenated in order in `supabase/lovable_full_schema_manual.sql` for Lovable one-shot runs.
-- After this succeeds, run `003_creator_delete_own_pending_submission.sql` so creators can remove pending posts.
--
-- Covers data the iClip frontend expects for:
--   • Creator “General Rules” modal (rules_version + platform_rules + community_link)
--   • Rich campaign detail fields + optional sounds JSON on `campaigns`
--
-- Cookies: stored in Postgres via `004_cookie_preferences.sql` (browser UUID in localStorage `iclip_cookie_browser_key`).

-- ─── 1. App settings (key/value) ─────────────────────────────────────────────
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

INSERT INTO public.app_settings (key, value) VALUES ('rules_version', '1')
  ON CONFLICT (key) DO NOTHING;

INSERT INTO public.app_settings (key, value) VALUES ('community_link', '')
  ON CONFLICT (key) DO NOTHING;


-- ─── 2. Platform rules ────────────────────────────────────────────────────────
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


-- ─── 3. Optional campaign columns (ignored if missing; app degrades gracefully) ─
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
