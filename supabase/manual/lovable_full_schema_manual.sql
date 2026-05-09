-- =============================================================================
-- iClip / Clipper — manual schema bundle for Lovable (or any Supabase SQL editor)
-- =============================================================================
-- Apply ONCE on a project whose base tables already exist (profiles, campaigns,
-- submissions, earnings, has_role, etc.) — typically after Supabase migrations.
--
-- Order:
--   1. submission appeals + realtime (001)
--   2. app_settings, platform_rules, campaign columns (002)
--   3. creator delete own pending submission (003)
--   4. cookie_preferences RPCs (004)
--   5. leaderboard badge tiers + overrides (005)
--
-- If a section errors with "already exists", skip that section or run the
-- granular files under supabase/manual/ instead.
-- =============================================================================

-- ---------- BEGIN 001_submission_appeals_and_realtime.sql ----------
-- Run manually in Supabase SQL Editor (Dashboard → SQL).
-- Submission appeals + realtime for `submissions` (creator submissions list updates live).

-- 1) Appeal lifecycle
CREATE TYPE public.submission_appeal_status AS ENUM ('pending', 'reviewed', 'closed');

CREATE TABLE public.submission_appeals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid NOT NULL REFERENCES public.submissions(id) ON DELETE CASCADE,
  creator_id uuid NOT NULL,
  message text NOT NULL,
  status public.submission_appeal_status NOT NULL DEFAULT 'pending',
  admin_note text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  resolved_by uuid
);

CREATE INDEX submission_appeals_submission_id_idx ON public.submission_appeals(submission_id);
CREATE INDEX submission_appeals_status_idx ON public.submission_appeals(status);

-- At most one open appeal per submission (submit again after admin closes the previous one)
CREATE UNIQUE INDEX submission_appeals_one_pending_per_submission
  ON public.submission_appeals (submission_id)
  WHERE (status = 'pending');

ALTER TABLE public.submission_appeals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "submission_appeals_select"
  ON public.submission_appeals FOR SELECT TO authenticated
  USING (
    auth.uid() = creator_id
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "submission_appeals_insert_creator"
  ON public.submission_appeals FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = creator_id
    AND EXISTS (
      SELECT 1 FROM public.submissions s
      WHERE s.id = submission_id
        AND s.creator_id = auth.uid()
        AND s.status = 'rejected'
    )
  );

CREATE POLICY "submission_appeals_admin_all"
  ON public.submission_appeals FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 2) Realtime (if this errors with "already member", the table is already published — safe to skip)
ALTER PUBLICATION supabase_realtime ADD TABLE public.submissions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.submission_appeals;
-- ---------- END 001 ----------


-- ---------- BEGIN 002_app_settings_platform_rules_campaign_extensions.sql ----------
-- Run manually in Supabase SQL Editor (Dashboard → SQL).
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
-- ---------- END 002 ----------


-- ---------- BEGIN 003_creator_delete_own_pending_submission.sql ----------
-- Run manually in Supabase SQL Editor.
-- Lets creators DELETE their own rows only while status = 'pending' (withdraw before review).

DROP POLICY IF EXISTS "Creators delete own pending submissions" ON public.submissions;

CREATE POLICY "Creators delete own pending submissions"
  ON public.submissions FOR DELETE TO authenticated
  USING (
    auth.uid() = creator_id AND status = 'pending'
  );
-- ---------- END 003 ----------


-- ---------- BEGIN 004_cookie_preferences.sql ----------
-- Run manually in Supabase SQL Editor (Dashboard → SQL).
--
-- Persists landing-page cookie consent + preference toggles in Postgres (not browser-only).
-- Anonymous visitors are keyed by a stable UUID the app stores in localStorage as `iclip_cookie_browser_key`.
--
-- Access model: the table has **no direct SELECT/INSERT for anon** — only SECURITY DEFINER RPCs
-- scoped by `browser_key`, so rows are not enumerable without guessing UUIDs.

CREATE TABLE IF NOT EXISTS public.cookie_preferences (
  browser_key uuid PRIMARY KEY,
  consent_accepted boolean NOT NULL DEFAULT false,
  analytics_enabled boolean NOT NULL DEFAULT false,
  marketing_enabled boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.cookie_preferences IS 'Per-browser cookie consent (landing); keyed by client-held UUID.';

ALTER TABLE public.cookie_preferences ENABLE ROW LEVEL SECURITY;

-- No policies: deny direct table access from PostgREST for anon/authenticated.

REVOKE ALL ON public.cookie_preferences FROM PUBLIC;
GRANT ALL ON public.cookie_preferences TO postgres;
GRANT ALL ON public.cookie_preferences TO service_role;

CREATE OR REPLACE FUNCTION public.get_cookie_preferences(p_browser_key uuid)
RETURNS TABLE (
  consent_accepted boolean,
  analytics_enabled boolean,
  marketing_enabled boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.consent_accepted, c.analytics_enabled, c.marketing_enabled
  FROM public.cookie_preferences c
  WHERE c.browser_key = p_browser_key;
$$;

CREATE OR REPLACE FUNCTION public.upsert_cookie_preferences(
  p_browser_key uuid,
  p_consent_accepted boolean,
  p_analytics boolean,
  p_marketing boolean
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO public.cookie_preferences (
    browser_key,
    consent_accepted,
    analytics_enabled,
    marketing_enabled
  )
  VALUES (
    p_browser_key,
    p_consent_accepted,
    p_analytics,
    p_marketing
  )
  ON CONFLICT (browser_key) DO UPDATE SET
    consent_accepted = EXCLUDED.consent_accepted,
    analytics_enabled = EXCLUDED.analytics_enabled,
    marketing_enabled = EXCLUDED.marketing_enabled,
    updated_at = now();
$$;

GRANT EXECUTE ON FUNCTION public.get_cookie_preferences(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_cookie_preferences(uuid, boolean, boolean, boolean) TO anon, authenticated;
-- ---------- END 004 ----------


-- ---------- BEGIN 005_leaderboard_badges.sql ----------
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
-- ---------- END 005 ----------

-- ---------- BEGIN 006 ----------

-- Run manually in Supabase SQL Editor after prior manual migrations.
-- Support tickets, cosmetics, leaderboard points cache, optional anime category.

-- ─── Campaign category: anime (for category leaderboard filter) ──────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'campaign_category' AND e.enumlabel = 'anime'
  ) THEN
    ALTER TYPE public.campaign_category ADD VALUE 'anime';
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- ─── Support tickets ─────────────────────────────────────────────────────────
CREATE TYPE public.support_ticket_type AS ENUM (
  'bug_report',
  'payment_issue',
  'campaign_dispute',
  'account_issue',
  'submission_issue',
  'feature_request',
  'other'
);

CREATE TYPE public.support_ticket_status AS ENUM (
  'open',
  'in_progress',
  'resolved',
  'closed'
);

CREATE TYPE public.support_ticket_priority AS ENUM (
  'low',
  'medium',
  'high'
);

CREATE SEQUENCE IF NOT EXISTS public.support_ticket_number_seq START WITH 1 INCREMENT BY 1;

CREATE TABLE IF NOT EXISTS public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  ticket_number text UNIQUE,
  type public.support_ticket_type NOT NULL DEFAULT 'other',
  subject text NOT NULL CHECK (char_length(subject) <= 100),
  description text NOT NULL CHECK (char_length(description) <= 1000),
  priority public.support_ticket_priority NOT NULL DEFAULT 'medium',
  status public.support_ticket_status NOT NULL DEFAULT 'open',
  internal_notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS support_tickets_user_id_idx ON public.support_tickets(user_id);
CREATE INDEX IF NOT EXISTS support_tickets_status_idx ON public.support_tickets(status);

CREATE OR REPLACE FUNCTION public.support_tickets_set_number()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.ticket_number IS NULL THEN
    NEW.ticket_number := 'TKT-' || lpad(nextval('public.support_ticket_number_seq')::text, 5, '0');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_support_tickets_number ON public.support_tickets;
CREATE TRIGGER trg_support_tickets_number
  BEFORE INSERT ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.support_tickets_set_number();

DROP TRIGGER IF EXISTS trg_support_tickets_updated ON public.support_tickets;
CREATE TRIGGER trg_support_tickets_updated
  BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.ticket_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  file_url text NOT NULL,
  uploaded_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ticket_attachments_ticket_id_idx ON public.ticket_attachments(ticket_id);

CREATE TABLE IF NOT EXISTS public.ticket_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  sender_role text NOT NULL CHECK (sender_role IN ('creator', 'admin')),
  message text NOT NULL CHECK (char_length(message) <= 4000),
  is_internal boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ticket_messages_ticket_id_idx ON public.ticket_messages(ticket_id);

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "support_tickets_select_own_or_admin" ON public.support_tickets;
CREATE POLICY "support_tickets_select_own_or_admin"
  ON public.support_tickets FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "support_tickets_insert_own" ON public.support_tickets;
CREATE POLICY "support_tickets_insert_own"
  ON public.support_tickets FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "support_tickets_update_admin" ON public.support_tickets;
CREATE POLICY "support_tickets_update_admin"
  ON public.support_tickets FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "ticket_attachments_select" ON public.ticket_attachments;
CREATE POLICY "ticket_attachments_select"
  ON public.ticket_attachments FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.support_tickets t
      WHERE t.id = ticket_id AND (t.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
  );

DROP POLICY IF EXISTS "ticket_attachments_insert_own_ticket" ON public.ticket_attachments;
CREATE POLICY "ticket_attachments_insert_own_ticket"
  ON public.ticket_attachments FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.support_tickets t
      WHERE t.id = ticket_id AND t.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "ticket_messages_select" ON public.ticket_messages;
CREATE POLICY "ticket_messages_select"
  ON public.ticket_messages FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.support_tickets t
      WHERE t.id = ticket_id AND (t.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
    AND (
      NOT is_internal
      OR public.has_role(auth.uid(), 'admin')
    )
  );

DROP POLICY IF EXISTS "ticket_messages_insert_creator" ON public.ticket_messages;
CREATE POLICY "ticket_messages_insert_creator"
  ON public.ticket_messages FOR INSERT TO authenticated
  WITH CHECK (
    sender_role = 'creator'
    AND is_internal = false
    AND EXISTS (
      SELECT 1 FROM public.support_tickets t
      WHERE t.id = ticket_id AND t.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "ticket_messages_insert_admin" ON public.ticket_messages;
CREATE POLICY "ticket_messages_insert_admin"
  ON public.ticket_messages FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    AND sender_role = 'admin'
  );


-- ─── Cosmetics ────────────────────────────────────────────────────────────────
CREATE TYPE public.cosmetic_item_type AS ENUM ('avatar', 'banner');

CREATE TYPE public.cosmetic_unlock_type AS ENUM ('default', 'rank_reward', 'admin_grant');

CREATE TABLE IF NOT EXISTS public.cosmetic_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type public.cosmetic_item_type NOT NULL,
  name text NOT NULL,
  image_url text NOT NULL,
  unlock_type public.cosmetic_unlock_type NOT NULL DEFAULT 'default',
  rank_reward_condition jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.creator_cosmetics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  cosmetic_id uuid NOT NULL REFERENCES public.cosmetic_items(id) ON DELETE CASCADE,
  unlocked_at timestamptz NOT NULL DEFAULT now(),
  unlocked_reason text NOT NULL DEFAULT 'default',
  UNIQUE (user_id, cosmetic_id)
);

CREATE INDEX IF NOT EXISTS creator_cosmetics_user_id_idx ON public.creator_cosmetics(user_id);

CREATE TABLE IF NOT EXISTS public.creator_profile_settings (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  equipped_avatar_id uuid REFERENCES public.cosmetic_items(id) ON DELETE SET NULL,
  equipped_banner_id uuid REFERENCES public.cosmetic_items(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.cosmetic_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creator_cosmetics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creator_profile_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cosmetic_items_select_active" ON public.cosmetic_items;
CREATE POLICY "cosmetic_items_select_active"
  ON public.cosmetic_items FOR SELECT TO authenticated
  USING (is_active = true OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "cosmetic_items_admin_all" ON public.cosmetic_items;
CREATE POLICY "cosmetic_items_admin_all"
  ON public.cosmetic_items FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "creator_cosmetics_select_own" ON public.creator_cosmetics;
CREATE POLICY "creator_cosmetics_select_own"
  ON public.creator_cosmetics FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "creator_cosmetics_insert_admin" ON public.creator_cosmetics;
CREATE POLICY "creator_cosmetics_insert_admin"
  ON public.creator_cosmetics FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "creator_cosmetics_insert_default_unlock" ON public.creator_cosmetics;
CREATE POLICY "creator_cosmetics_insert_default_unlock"
  ON public.creator_cosmetics FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.cosmetic_items c
      WHERE c.id = cosmetic_id AND c.unlock_type = 'default' AND c.is_active = true
    )
  );

DROP POLICY IF EXISTS "creator_cosmetics_delete_admin" ON public.creator_cosmetics;
CREATE POLICY "creator_cosmetics_delete_admin"
  ON public.creator_cosmetics FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "creator_profile_settings_select_own" ON public.creator_profile_settings;
CREATE POLICY "creator_profile_settings_select_own"
  ON public.creator_profile_settings FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "creator_profile_settings_upsert_own" ON public.creator_profile_settings;
CREATE POLICY "creator_profile_settings_upsert_own"
  ON public.creator_profile_settings FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "creator_profile_settings_update_own" ON public.creator_profile_settings;
CREATE POLICY "creator_profile_settings_update_own"
  ON public.creator_profile_settings FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- ─── Leaderboard points cache (optional client refresh) ───────────────────────
CREATE TABLE IF NOT EXISTS public.creator_leaderboard_points (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  points_week numeric NOT NULL DEFAULT 0,
  points_month numeric NOT NULL DEFAULT 0,
  points_all_time numeric NOT NULL DEFAULT 0,
  week_bucket_start date,
  month_bucket_start date,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.creator_leaderboard_points ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "creator_leaderboard_points_select_all" ON public.creator_leaderboard_points;
CREATE POLICY "creator_leaderboard_points_select_all"
  ON public.creator_leaderboard_points FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "creator_leaderboard_points_admin_write" ON public.creator_leaderboard_points;
CREATE POLICY "creator_leaderboard_points_admin_write"
  ON public.creator_leaderboard_points FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));


-- Storage buckets (create in Dashboard if insert fails)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('cosmetics', 'cosmetics', true, 5242880, ARRAY['image/png','image/jpeg','image/webp','image/gif']::text[]),
  ('support-attachments', 'support-attachments', false, 5242880, ARRAY['image/png','image/jpeg','image/webp','image/gif']::text[])
ON CONFLICT (id) DO NOTHING;

-- Storage: cosmetics public read; support uploads scoped to ticket owner path support-attachments/{user_id}/...
DROP POLICY IF EXISTS "storage_cosmetics_public_read" ON storage.objects;
CREATE POLICY "storage_cosmetics_public_read"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'cosmetics');

DROP POLICY IF EXISTS "storage_cosmetics_admin_write" ON storage.objects;
CREATE POLICY "storage_cosmetics_admin_write"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'cosmetics' AND public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "storage_cosmetics_admin_update" ON storage.objects;
CREATE POLICY "storage_cosmetics_admin_update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'cosmetics' AND public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "storage_support_select_own" ON storage.objects;
CREATE POLICY "storage_support_select_own"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'support-attachments'
    AND (
      public.has_role(auth.uid(), 'admin')
      OR (storage.foldername(name))[1] = auth.uid()::text
    )
  );

DROP POLICY IF EXISTS "storage_support_insert_own" ON storage.objects;
CREATE POLICY "storage_support_insert_own"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'support-attachments'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ─── Seed default cosmetics (idempotent) ───────────────────────────────────────
INSERT INTO public.cosmetic_items (type, name, image_url, unlock_type)
SELECT 'avatar'::public.cosmetic_item_type, 'Starter', '/marketing-campaign-banner-fallback.svg', 'default'::public.cosmetic_unlock_type
WHERE NOT EXISTS (
  SELECT 1 FROM public.cosmetic_items ci
  WHERE ci.type = 'avatar' AND ci.name = 'Starter' AND ci.unlock_type = 'default'
);

INSERT INTO public.cosmetic_items (type, name, image_url, unlock_type)
SELECT 'banner'::public.cosmetic_item_type, 'Starter Strip', '/marketing-campaign-banner-fallback.svg', 'default'::public.cosmetic_unlock_type
WHERE NOT EXISTS (
  SELECT 1 FROM public.cosmetic_items ci
  WHERE ci.type = 'banner' AND ci.name = 'Starter Strip' AND ci.unlock_type = 'default'
);
-- ---------- END 006 ----------


-- ---------- BEGIN 007 ----------

-- Rank reward cosmetics: SECURITY DEFINER RPC for weekly/monthly leaderboard grants.
-- Call from Supabase Edge Function (service_role) or admin dashboard (authenticated admin).

CREATE OR REPLACE FUNCTION public.grant_rank_reward_cosmetics(
  p_period text,
  p_ref timestamptz DEFAULT now()
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_jwt_role text;
  v_ok boolean;
  v_start timestamptz;
  v_end timestamptz;
  r_item record;
  v_cond jsonb;
  v_winner uuid;
  v_pos int;
  v_grants int := 0;
  v_skipped int := 0;
  v_scope text;
  v_plat text;
  v_cid uuid;
  v_cat text;
  v_item_period text;
  v_inserted int;
  v_log jsonb := '[]'::jsonb;
BEGIN
  v_jwt_role := coalesce(auth.jwt()->>'role', '');
  v_ok := (v_jwt_role = 'service_role')
    OR (auth.uid() IS NOT NULL AND public.has_role(auth.uid(), 'admin'));
  IF NOT v_ok THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF p_period NOT IN ('weekly', 'monthly') THEN
    RAISE EXCEPTION 'invalid p_period (use weekly or monthly)';
  END IF;

  IF p_period = 'weekly' THEN
    v_end := date_trunc('week', p_ref);
    v_start := v_end - interval '7 days';
  ELSE
    v_end := date_trunc('month', p_ref);
    v_start := v_end - interval '1 month';
  END IF;

  FOR r_item IN
    SELECT *
    FROM public.cosmetic_items
    WHERE unlock_type = 'rank_reward' AND is_active = true
  LOOP
    v_cond := r_item.rank_reward_condition;
    IF v_cond IS NULL THEN
      v_skipped := v_skipped + 1;
      CONTINUE;
    END IF;

    v_item_period := v_cond->>'period';
    IF v_item_period IS NULL OR v_item_period <> p_period THEN
      CONTINUE;
    END IF;

    BEGIN
      v_pos := (v_cond->>'position')::int;
    EXCEPTION WHEN others THEN
      v_skipped := v_skipped + 1;
      CONTINUE;
    END;

    IF v_pos IS NULL OR v_pos < 1 OR v_pos > 3 THEN
      v_skipped := v_skipped + 1;
      CONTINUE;
    END IF;

    v_scope := v_cond->>'scope';
    v_winner := NULL;

    IF v_scope = 'platform' THEN
      v_plat := lower(trim(coalesce(v_cond->>'platform', 'tiktok')));
      WITH agg AS (
        SELECT
          s.creator_id,
          SUM(FLOOR(GREATEST(s.manual_views, 0)::numeric / 1000) + 50)::bigint AS pts,
          SUM(GREATEST(s.manual_views, 0))::bigint AS vws
        FROM public.submissions s
        WHERE s.status = 'approved'
          AND s.created_at >= v_start
          AND s.created_at < v_end
          AND s.platform = v_plat::public.social_platform
        GROUP BY s.creator_id
      ),
      ranked AS (
        SELECT creator_id, ROW_NUMBER() OVER (ORDER BY pts DESC, vws DESC, creator_id) AS rnk
        FROM agg
      )
      SELECT creator_id INTO v_winner FROM ranked WHERE rnk = v_pos;

    ELSIF v_scope = 'campaign' THEN
      IF nullif(trim(v_cond->>'campaign_id'), '') IS NULL THEN
        v_skipped := v_skipped + 1;
        CONTINUE;
      END IF;
      v_cid := (v_cond->>'campaign_id')::uuid;
      WITH agg AS (
        SELECT
          s.creator_id,
          SUM(FLOOR(GREATEST(s.manual_views, 0)::numeric / 1000) + 50)::bigint AS pts,
          SUM(GREATEST(s.manual_views, 0))::bigint AS vws
        FROM public.submissions s
        WHERE s.status = 'approved'
          AND s.created_at >= v_start
          AND s.created_at < v_end
          AND s.campaign_id = v_cid
        GROUP BY s.creator_id
      ),
      ranked AS (
        SELECT creator_id, ROW_NUMBER() OVER (ORDER BY pts DESC, vws DESC, creator_id) AS rnk
        FROM agg
      )
      SELECT creator_id INTO v_winner FROM ranked WHERE rnk = v_pos;

    ELSIF v_scope = 'category' THEN
      v_cat := lower(trim(coalesce(v_cond->>'category', 'music')));
      WITH agg AS (
        SELECT
          s.creator_id,
          SUM(FLOOR(GREATEST(s.manual_views, 0)::numeric / 1000) + 50)::bigint AS pts,
          SUM(GREATEST(s.manual_views, 0))::bigint AS vws
        FROM public.submissions s
        INNER JOIN public.campaigns c ON c.id = s.campaign_id
        WHERE s.status = 'approved'
          AND s.created_at >= v_start
          AND s.created_at < v_end
          AND c.category = v_cat::public.campaign_category
        GROUP BY s.creator_id
      ),
      ranked AS (
        SELECT creator_id, ROW_NUMBER() OVER (ORDER BY pts DESC, vws DESC, creator_id) AS rnk
        FROM agg
      )
      SELECT creator_id INTO v_winner FROM ranked WHERE rnk = v_pos;
    ELSE
      v_skipped := v_skipped + 1;
      CONTINUE;
    END IF;

    IF v_winner IS NULL THEN
      v_log := v_log || jsonb_build_array(jsonb_build_object(
        'cosmetic_id', r_item.id,
        'name', r_item.name,
        'result', 'no_qualifying_creator'
      ));
      CONTINUE;
    END IF;

    INSERT INTO public.creator_cosmetics (user_id, cosmetic_id, unlocked_reason)
    VALUES (v_winner, r_item.id, 'rank_reward')
    ON CONFLICT (user_id, cosmetic_id) DO NOTHING;

    GET DIAGNOSTICS v_inserted = ROW_COUNT;
    IF v_inserted > 0 THEN
      v_grants := v_grants + 1;
      v_log := v_log || jsonb_build_array(jsonb_build_object(
        'cosmetic_id', r_item.id,
        'name', r_item.name,
        'user_id', v_winner,
        'result', 'granted'
      ));
    ELSE
      v_log := v_log || jsonb_build_array(jsonb_build_object(
        'cosmetic_id', r_item.id,
        'name', r_item.name,
        'user_id', v_winner,
        'result', 'already_owned'
      ));
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'period', p_period,
    'window_start', v_start,
    'window_end', v_end,
    'grants_new', v_grants,
    'rules_skipped_bad_config', v_skipped,
    'details', v_log
  );
END;
$$;

REVOKE ALL ON FUNCTION public.grant_rank_reward_cosmetics(text, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.grant_rank_reward_cosmetics(text, timestamptz) TO service_role;
GRANT EXECUTE ON FUNCTION public.grant_rank_reward_cosmetics(text, timestamptz) TO authenticated;

