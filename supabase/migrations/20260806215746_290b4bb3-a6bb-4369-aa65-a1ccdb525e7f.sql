-- 1. Drop unused tables
DROP TABLE IF EXISTS public.activity_log CASCADE;
DROP TABLE IF EXISTS public.attachments CASCADE;
DROP TABLE IF EXISTS public.comments CASCADE;
DROP TABLE IF EXISTS public.bugs CASCADE;
DROP TABLE IF EXISTS public.projects CASCADE;
DROP TABLE IF EXISTS public.notification_preferences CASCADE;
DROP TABLE IF EXISTS public.company_settings CASCADE;

DROP TABLE IF EXISTS public.campaign_test_assignments CASCADE;
DROP TABLE IF EXISTS public.internal_creator_flags CASCADE;
DROP TABLE IF EXISTS public.automation_generation_jobs CASCADE;
DROP TABLE IF EXISTS public.test_creator_batches CASCADE;
DROP TABLE IF EXISTS public.automation_logs CASCADE;

DROP TABLE IF EXISTS public.creator_cosmetics CASCADE;
DROP TABLE IF EXISTS public.creator_profile_settings CASCADE;
DROP TABLE IF EXISTS public.cosmetic_items CASCADE;
DROP TABLE IF EXISTS public.creator_badge_overrides CASCADE;
DROP TABLE IF EXISTS public.leaderboard_badge_tiers CASCADE;

DROP FUNCTION IF EXISTS public.generate_tracking_id() CASCADE;
DROP FUNCTION IF EXISTS public.grant_rank_reward_cosmetics(text, timestamptz) CASCADE;
DROP FUNCTION IF EXISTS public.grow_test_creator_views() CASCADE;
DROP FUNCTION IF EXISTS public.process_scheduled_test_submissions() CASCADE;
DROP FUNCTION IF EXISTS public.automation_run_grow_manual() CASCADE;
DROP FUNCTION IF EXISTS public.automation_run_submissions_manual() CASCADE;
DROP FUNCTION IF EXISTS public.reject_withdrawal_internal_test_creator() CASCADE;
DROP FUNCTION IF EXISTS public.gen_random_alphanumeric(integer) CASCADE;
DROP FUNCTION IF EXISTS public.gen_random_digits(integer) CASCADE;
DROP FUNCTION IF EXISTS public.alloc_creator_public_ids(integer) CASCADE;
DROP SEQUENCE IF EXISTS public.bug_tracking_seq CASCADE;

-- 2. Wipe remaining data
TRUNCATE TABLE
  public.earnings,
  public.submission_appeals,
  public.submissions,
  public.campaign_participants,
  public.withdrawal_requests,
  public.referrals,
  public.referral_codes,
  public.social_accounts,
  public.ticket_attachments,
  public.ticket_messages,
  public.support_tickets,
  public.creator_leaderboard_points,
  public.campaigns,
  public.brands,
  public.invitations,
  public.user_roles,
  public.profiles
CASCADE;

DELETE FROM auth.users;

-- 3. Status columns -> text with checks
DROP POLICY IF EXISTS "submission_appeals_insert_creator" ON public.submission_appeals;
DROP POLICY IF EXISTS "Creators can update own pending submissions" ON public.submissions;
DROP POLICY IF EXISTS "Creators delete own pending submissions" ON public.submissions;
DROP VIEW IF EXISTS public.public_submissions;
DROP INDEX IF EXISTS public.submissions_test_grow_idx;

ALTER TABLE public.campaigns ALTER COLUMN status DROP DEFAULT;
ALTER TABLE public.campaigns ALTER COLUMN status TYPE text USING status::text;
ALTER TABLE public.campaigns ALTER COLUMN status SET DEFAULT 'draft';
ALTER TABLE public.campaigns ADD CONSTRAINT campaigns_status_check
  CHECK (status IN ('draft','active','paused','pending_payout','ended'));

ALTER TABLE public.submissions ALTER COLUMN status DROP DEFAULT;
ALTER TABLE public.submissions ALTER COLUMN status TYPE text USING status::text;
ALTER TABLE public.submissions ALTER COLUMN status SET DEFAULT 'processing';
ALTER TABLE public.submissions ADD CONSTRAINT submissions_status_check
  CHECK (status IN ('processing','eligible','approved','rejected'));

ALTER TABLE public.submissions
  DROP COLUMN IF EXISTS is_test_submission,
  DROP COLUMN IF EXISTS sim_view_cap,
  ADD COLUMN IF NOT EXISTS eligible_at timestamptz;

CREATE VIEW public.public_submissions WITH (security_invoker=on) AS
  SELECT id, creator_id, campaign_id, platform, manual_views, status, created_at, updated_at
  FROM public.submissions WHERE status = 'approved';
GRANT SELECT ON public.public_submissions TO authenticated;

CREATE POLICY "submission_appeals_insert_creator" ON public.submission_appeals
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = creator_id AND EXISTS (
    SELECT 1 FROM public.submissions s
    WHERE s.id = submission_id AND s.creator_id = auth.uid() AND s.status = 'rejected'));

CREATE POLICY "Creators can update own processing submissions" ON public.submissions
  FOR UPDATE TO authenticated
  USING (auth.uid() = creator_id AND status = 'processing');

CREATE POLICY "Creators delete own processing submissions" ON public.submissions
  FOR DELETE TO authenticated
  USING (auth.uid() = creator_id AND status = 'processing');

-- 4. Earnings payout state
ALTER TABLE public.earnings
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS paid_at timestamptz;
ALTER TABLE public.earnings ADD CONSTRAINT earnings_status_check
  CHECK (status IN ('pending','paid'));

-- 5. Unique username
CREATE UNIQUE INDEX IF NOT EXISTS profiles_profile_slug_key
  ON public.profiles (lower(profile_slug)) WHERE profile_slug IS NOT NULL;

-- 6. Signup trigger (profile + role, owner email becomes admin)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    NEW.id,
    CASE WHEN lower(NEW.email) = 'atifnazir105@gmail.com' THEN 'admin'::public.app_role
         ELSE 'creator'::public.app_role END
  )
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 7. Server-side earnings recompute when admin updates views
CREATE OR REPLACE FUNCTION public.admin_update_submission_views(p_submission_id uuid, p_views bigint)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  s record; c record; v_amount numeric; v_prev numeric := 0; v_eid uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT * INTO s FROM public.submissions WHERE id = p_submission_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'submission not found'; END IF;
  SELECT * INTO c FROM public.campaigns WHERE id = s.campaign_id;

  v_amount := (GREATEST(p_views,0)::numeric / 1000000) * COALESCE(c.payout_per_1m_views,0);
  IF c.max_earnings_per_post IS NOT NULL THEN
    v_amount := LEAST(v_amount, c.max_earnings_per_post::numeric);
  END IF;
  IF c.min_views_for_earnings IS NOT NULL AND p_views < c.min_views_for_earnings THEN
    v_amount := 0;
  END IF;

  UPDATE public.submissions
    SET manual_views = GREATEST(p_views,0), total_views = GREATEST(p_views,0), updated_at = now()
    WHERE id = p_submission_id;

  SELECT id, amount INTO v_eid, v_prev FROM public.earnings
    WHERE submission_id = p_submission_id AND type = 'campaign' LIMIT 1;

  IF v_eid IS NULL THEN
    INSERT INTO public.earnings (creator_id, submission_id, amount, type, status)
    VALUES (s.creator_id, p_submission_id, v_amount, 'campaign', 'pending');
    v_prev := 0;
  ELSE
    UPDATE public.earnings SET amount = v_amount WHERE id = v_eid AND status = 'pending';
  END IF;

  UPDATE public.campaigns
    SET budget_remaining = GREATEST(budget_total - (
      SELECT COALESCE(SUM(e.amount),0) FROM public.earnings e
      JOIN public.submissions sub ON sub.id = e.submission_id
      WHERE sub.campaign_id = c.id AND e.type = 'campaign'
    ), 0)
    WHERE id = c.id;

  RETURN jsonb_build_object('views', GREATEST(p_views,0), 'amount', v_amount);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_update_submission_views(uuid, bigint) TO authenticated;

-- 8. Payout a whole campaign's approved submissions
CREATE OR REPLACE FUNCTION public.admin_payout_campaign(p_campaign_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_count int;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;

  UPDATE public.earnings e
    SET status = 'paid', paid_at = now()
    FROM public.submissions s
    WHERE e.submission_id = s.id
      AND s.campaign_id = p_campaign_id
      AND s.status = 'approved'
      AND e.status = 'pending';
  GET DIAGNOSTICS v_count = ROW_COUNT;

  UPDATE public.campaigns SET status = 'ended' WHERE id = p_campaign_id;
  RETURN jsonb_build_object('paid_earnings', v_count);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_payout_campaign(uuid) TO authenticated;