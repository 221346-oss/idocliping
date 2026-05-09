-- Testing automation lab: batch tables, assignments, cron workers (pg_cron), RLS.
-- Run in Supabase SQL Editor after earlier manuals. Uses public.has_role (existing).

-- ─── Public profile helpers (never store is_test_creator on profiles — use internal_creator_flags) ───

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS creator_public_id text,
  ADD COLUMN IF NOT EXISTS category_specialty public.campaign_category,
  ADD COLUMN IF NOT EXISTS honor_score_override numeric;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_creator_public_id_key
  ON public.profiles (creator_public_id) WHERE creator_public_id IS NOT NULL;

CREATE SEQUENCE IF NOT EXISTS public.creator_public_ic_seq START WITH 10001 INCREMENT BY 1;

ALTER TABLE public.submissions
  ADD COLUMN IF NOT EXISTS is_test_submission boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sim_view_cap bigint;

-- ─── Core automation tables ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.test_creator_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  creator_count int NOT NULL DEFAULT 0 CHECK (creator_count >= 0),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'destroyed'))
);

CREATE TABLE IF NOT EXISTS public.internal_creator_flags (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  is_test_creator boolean NOT NULL DEFAULT true,
  test_batch_id uuid REFERENCES public.test_creator_batches(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS internal_creator_flags_batch_idx
  ON public.internal_creator_flags(test_batch_id) WHERE is_test_creator;

COMMENT ON TABLE public.internal_creator_flags IS 'Admin-only: marks automation test accounts; never expose to public API.';

CREATE TABLE IF NOT EXISTS public.campaign_test_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  test_creator_id uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  submission_status text NOT NULL DEFAULT 'pending' CHECK (submission_status IN ('pending', 'submitted', 'approved')),
  scheduled_submit_at timestamptz NOT NULL,
  submission_id uuid REFERENCES public.submissions(id) ON DELETE SET NULL,
  UNIQUE (campaign_id, test_creator_id)
);

CREATE INDEX IF NOT EXISTS campaign_test_assignments_due_idx
  ON public.campaign_test_assignments(scheduled_submit_at)
  WHERE submission_status = 'pending';

CREATE INDEX IF NOT EXISTS submissions_test_grow_idx
  ON public.submissions(creator_id, status)
  WHERE is_test_submission = true AND status = 'approved';

CREATE TABLE IF NOT EXISTS public.automation_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_at timestamptz NOT NULL DEFAULT now(),
  job_name text NOT NULL,
  items_processed int NOT NULL DEFAULT 0,
  errors_count int NOT NULL DEFAULT 0,
  duration_ms int NOT NULL DEFAULT 0,
  details jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS automation_logs_run_idx ON public.automation_logs(run_at DESC);

CREATE TABLE IF NOT EXISTS public.automation_generation_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid REFERENCES public.test_creator_batches(id) ON DELETE SET NULL,
  kind text NOT NULL DEFAULT 'generate_test_creators',
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'completed', 'failed')),
  progress_pct int NOT NULL DEFAULT 0 CHECK (progress_pct >= 0 AND progress_pct <= 100),
  processed int NOT NULL DEFAULT 0,
  total int NOT NULL DEFAULT 0,
  message text NOT NULL DEFAULT '',
  error_detail text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS trg_automation_generation_jobs_updated ON public.automation_generation_jobs;
CREATE TRIGGER trg_automation_generation_jobs_updated
  BEFORE UPDATE ON public.automation_generation_jobs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.test_creator_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.internal_creator_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_test_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_generation_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS test_creator_batches_admin ON public.test_creator_batches;
CREATE POLICY test_creator_batches_admin
  ON public.test_creator_batches FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS internal_creator_flags_admin ON public.internal_creator_flags;
CREATE POLICY internal_creator_flags_admin
  ON public.internal_creator_flags FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS campaign_test_assignments_admin ON public.campaign_test_assignments;
CREATE POLICY campaign_test_assignments_admin
  ON public.campaign_test_assignments FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS automation_logs_admin ON public.automation_logs;
CREATE POLICY automation_logs_admin
  ON public.automation_logs FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS automation_generation_jobs_admin ON public.automation_generation_jobs;
CREATE POLICY automation_generation_jobs_admin
  ON public.automation_generation_jobs FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ─── Block withdrawals / payouts for synthetic creators ─────────────────────

CREATE OR REPLACE FUNCTION public.reject_withdrawal_internal_test_creator()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.internal_creator_flags f
    WHERE f.user_id = NEW.creator_id AND f.is_test_creator IS TRUE
  ) THEN
    RAISE EXCEPTION 'Withdrawals disabled for simulated creators';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_withdraw_no_test_creator ON public.withdrawal_requests;
CREATE TRIGGER trg_withdraw_no_test_creator
  BEFORE INSERT ON public.withdrawal_requests
  FOR EACH ROW EXECUTE FUNCTION public.reject_withdrawal_internal_test_creator();

-- ─── Helpers (random strings / URLs) ─────────────────────────────────────────-

CREATE OR REPLACE FUNCTION public.gen_random_digits(p_len int)
RETURNS text
LANGUAGE plpgsql VOLATILE SET search_path = public AS $$
DECLARE
  i int := 0;
  s text := '';
BEGIN
  FOR i IN 1..p_len LOOP
    s := s || (floor(random() * 10))::text;
  END LOOP;
  RETURN s;
END;
$$;

CREATE OR REPLACE FUNCTION public.gen_random_alphanumeric(p_len int)
RETURNS text
LANGUAGE plpgsql VOLATILE SET search_path = public AS $$
DECLARE
  alphabet text := 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  i int;
  out text := '';
BEGIN
  FOR i IN 1..p_len LOOP
    out := out || substr(alphabet, (floor(random() * length(alphabet)))::int + 1, 1);
  END LOOP;
  RETURN out;
END;
$$;

CREATE OR REPLACE FUNCTION public.alloc_creator_public_ids(p_n int)
RETURNS text[]
LANGUAGE sql
SECURITY DEFINER
SET search_path = public AS $$
  SELECT CASE
    WHEN p_n <= 0 THEN '{}'::text[]
    ELSE coalesce(array(
      SELECT 'IC-' || lpad(nextval(public.creator_public_ic_seq)::text, 5, '0')
      FROM generate_series(1, p_n)
    ), '{}')
  END;
$$;

REVOKE ALL ON FUNCTION public.alloc_creator_public_ids(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.alloc_creator_public_ids(integer) TO service_role;

-- ─── Submission worker (cron) ────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.process_scheduled_test_submissions()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public AS $$
DECLARE
  t0 timestamptz := clock_timestamp();
  rec record;
  sel_platform public.social_platform;
  post_url text;
  handle_base text;
  cap bigint;
  sub_id uuid;
  err_count int := 0;
  ok_count int := 0;
  camp_platforms public.social_platform[];
BEGIN
  FOR rec IN
    SELECT cta.id AS aid, cta.campaign_id, cta.test_creator_id,
           c.platforms AS camp_plats,
           pf.profile_slug AS slugish
    FROM public.campaign_test_assignments cta
    INNER JOIN public.campaigns c ON c.id = cta.campaign_id
    INNER JOIN public.profiles pf ON pf.user_id = cta.test_creator_id
    WHERE cta.submission_status = 'pending'
      AND cta.scheduled_submit_at <= now()
      AND EXISTS (
        SELECT 1 FROM public.internal_creator_flags icf
        WHERE icf.user_id = cta.test_creator_id AND icf.is_test_creator IS TRUE
      )
    LIMIT 250
    FOR UPDATE OF cta SKIP LOCKED
  LOOP
    BEGIN
      camp_platforms := rec.camp_plats;
      IF camp_platforms IS NULL OR array_length(camp_platforms, 1) IS NULL THEN
        camp_platforms := ARRAY['tiktok']::public.social_platform[];
      END IF;

      SELECT sa.platform INTO sel_platform FROM public.social_accounts sa
      WHERE sa.user_id = rec.test_creator_id AND sa.platform = ANY(camp_platforms)
      ORDER BY random() LIMIT 1;

      IF sel_platform IS NULL THEN
        sel_platform := camp_platforms[1 + floor(random() * array_length(camp_platforms, 1))];
      END IF;

      handle_base := regexp_replace(lower(split_part(split_part(coalesce(rec.slugish,''), '@', 1), ' ', 1)), '[^a-z0-9_]', '', 'g');
      IF length(handle_base) < 2 THEN handle_base := 'tc_user'; END IF;

      IF sel_platform = 'tiktok'::public.social_platform THEN
        post_url := format('https://www.tiktok.com/@%s/video/%s', handle_base, public.gen_random_digits(19));
      ELSIF sel_platform = 'youtube'::public.social_platform THEN
        post_url := format('https://www.youtube.com/watch?v=%s', public.gen_random_alphanumeric(11));
      ELSIF sel_platform = 'instagram'::public.social_platform THEN
        post_url := format('https://www.instagram.com/reel/%s/', public.gen_random_alphanumeric(11));
      ELSE
        post_url := format('https://x.com/%s/status/%s', handle_base, public.gen_random_digits(19));
      END IF;

      cap := (50000 + floor(random() * (2000000 - 50001)))::bigint;

      INSERT INTO public.submissions (
        campaign_id, creator_id, platform, post_url, manual_views,
        status, is_test_submission, reviewed_at, reviewed_by,
        reject_reason, sim_view_cap
      ) VALUES (
        rec.campaign_id, rec.test_creator_id, sel_platform, post_url, 0,
        'approved', true, now(), NULL, '', cap
      ) RETURNING id INTO sub_id;

      INSERT INTO public.earnings (creator_id, submission_id, amount, type)
      VALUES (rec.test_creator_id, sub_id, 0::numeric, 'campaign');

      UPDATE public.campaign_test_assignments
      SET submission_status = 'submitted', submission_id = sub_id
      WHERE id = rec.aid;

      INSERT INTO public.campaign_participants (campaign_id, creator_id)
      VALUES (rec.campaign_id, rec.test_creator_id)
      ON CONFLICT (campaign_id, creator_id) DO NOTHING;

      ok_count := ok_count + 1;
    EXCEPTION WHEN OTHERS THEN
      err_count := err_count + 1;
    END;
  END LOOP;

  INSERT INTO public.automation_logs (job_name, items_processed, errors_count, duration_ms, details)
  VALUES (
    'process_scheduled_test_submissions',
    ok_count,
    err_count,
    (extract(epoch FROM (clock_timestamp() - t0)) * 1000)::int,
    jsonb_build_object('note', 'submissions-created')
  );

  RETURN jsonb_build_object(
    'submissions_processed', ok_count,
    'errors', err_count,
    'duration_ms', (extract(epoch FROM (clock_timestamp() - t0)) * 1000)::int
  );
END;
$$;

REVOKE ALL ON FUNCTION public.process_scheduled_test_submissions() FROM PUBLIC;

-- ─── Views & earnings growth (cron) ─────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.sync_creator_leaderboard_points_delta(
  p_user uuid,
  p_delta_pts numeric
)
RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  INSERT INTO public.creator_leaderboard_points (user_id, points_week, points_month, points_all_time)
  VALUES (p_user, p_delta_pts, p_delta_pts, p_delta_pts)
  ON CONFLICT (user_id) DO UPDATE SET
    points_week = public.creator_leaderboard_points.points_week + EXCLUDED.points_week,
    points_month = public.creator_leaderboard_points.points_month + EXCLUDED.points_month,
    points_all_time = public.creator_leaderboard_points.points_all_time + EXCLUDED.points_all_time,
    updated_at = now();
$$;

REVOKE ALL ON FUNCTION public.sync_creator_leaderboard_points_delta(uuid, numeric) FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.grow_test_creator_views()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public AS $$
DECLARE
  t0 timestamptz := clock_timestamp();
  upd int := 0;
  err_count int := 0;
  r record;
  v_step bigint;
  rate_mult numeric;
  decay_mult numeric;
  viral_mult numeric;
  cand_v bigint;
  old_v bigint;
  cap bigint;
  rate numeric;
  old_earn numeric;
  earn_goal numeric;
  delta_ideal numeric;
  budget_rem numeric;
  delta_budget numeric;
  final_earn numeric;
  final_v bigint;
  delta_pts numeric;
BEGIN
  FOR r IN
    SELECT s.id AS sid,
           s.creator_id AS cid,
           s.campaign_id,
           s.manual_views,
           s.sim_view_cap,
           s.created_at AS sub_created,
           c.payout_per_1m_views,
           c.max_earnings_per_post,
           c.budget_remaining,
           e.id AS earning_id,
           e.amount AS earning_amt
    FROM public.submissions s
    INNER JOIN public.campaigns c ON c.id = s.campaign_id
    INNER JOIN public.earnings e ON e.submission_id = s.id AND e.type = 'campaign'
    INNER JOIN public.internal_creator_flags f ON f.user_id = s.creator_id AND f.is_test_creator IS TRUE
    WHERE s.is_test_submission IS TRUE AND s.status = 'approved'
      AND coalesce(s.sim_view_cap, 0) > 0
      AND s.manual_views < s.sim_view_cap
    ORDER BY random()
    LIMIT 400
  LOOP
    BEGIN
      old_v := r.manual_views::bigint;
      cap := coalesce(r.sim_view_cap, 0)::bigint;
      rate := greatest(coalesce(r.payout_per_1m_views, 0)::numeric, 0);
      IF cap <= old_v THEN CONTINUE; END IF;

      v_step := (800 + floor(random() * 7201))::bigint;
      rate_mult := 0.75 + (least(rate, 2500::numeric) / 2500::numeric) * 2.25;
      decay_mult := 1;
      IF r.sub_created < now() - interval '7 days' THEN decay_mult := 0.5; END IF;
      viral_mult := 1;
      IF random() < 0.02 THEN viral_mult := 10; END IF;

      cand_v := old_v + (v_step::numeric * rate_mult * decay_mult * viral_mult)::bigint;
      cand_v := least(cand_v, cap);

      IF cand_v <= old_v THEN CONTINUE; END IF;

      old_earn := coalesce(r.earning_amt, 0)::numeric;
      IF rate <= 0 THEN CONTINUE; END IF;

      earn_goal := (cand_v::numeric / 1000000) * rate;
      IF r.max_earnings_per_post IS NOT NULL THEN
        earn_goal := least(earn_goal, r.max_earnings_per_post::numeric);
      END IF;

      delta_ideal := earn_goal - old_earn;
      IF delta_ideal <= 0 THEN CONTINUE; END IF;

      budget_rem := greatest(coalesce(r.budget_remaining, 0)::numeric, 0);
      delta_budget := least(delta_ideal, budget_rem);
      IF delta_budget <= 0 THEN CONTINUE; END IF;

      mid_earn := old_earn + delta_budget;
      final_v := least(cap, floor(mid_earn / rate * 1000000)::bigint);
      IF final_v <= old_v THEN CONTINUE; END IF;

      final_earn := (final_v::numeric / 1000000) * rate;

      delta_budget := final_earn - old_earn;
      IF delta_budget <= 0 THEN CONTINUE; END IF;

      UPDATE public.submissions SET manual_views = final_v WHERE id = r.sid;
      UPDATE public.earnings SET amount = final_earn WHERE id = r.earning_id;

      IF delta_budget > 0 THEN
        UPDATE public.campaigns
          SET budget_remaining = greatest(budget_remaining - delta_budget, 0)
          WHERE id = r.campaign_id;
      END IF;

      delta_pts := (floor(final_v / 1000)::numeric - floor(old_v / 1000)::numeric);
      IF delta_pts <> 0 THEN
        PERFORM public.sync_creator_leaderboard_points_delta(r.cid, delta_pts);
      END IF;

      upd := upd + 1;
    EXCEPTION WHEN OTHERS THEN err_count := err_count + 1;
    END;
  END LOOP;

  INSERT INTO public.automation_logs (job_name, items_processed, errors_count, duration_ms, details)
  VALUES (
    'grow_test_creator_views',
    upd,
    err_count,
    (extract(epoch FROM (clock_timestamp() - t0)) * 1000)::int,
    jsonb_build_object('updated_submissions', upd)
  );

  RETURN jsonb_build_object(
    'submissions_updated', upd,
    'errors', err_count,
    'duration_ms', (extract(epoch FROM (clock_timestamp() - t0)) * 1000)::int
  );
END;
$$;

REVOKE ALL ON FUNCTION public.grow_test_creator_views() FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.automation_run_submissions_manual()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN public.process_scheduled_test_submissions();
END;
$$;

CREATE OR REPLACE FUNCTION public.automation_run_grow_manual()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN public.grow_test_creator_views();
END;
$$;

GRANT EXECUTE ON FUNCTION public.automation_run_submissions_manual() TO authenticated;
GRANT EXECUTE ON FUNCTION public.automation_run_grow_manual() TO authenticated;
REVOKE ALL ON FUNCTION public.automation_run_submissions_manual() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.automation_run_grow_manual() FROM PUBLIC;

-- ─── pg_cron (dashboard): run AFTER enabling pg_cron extension ─────────────────
--
-- SELECT cron.schedule(
--   'automation_process_test_submissions',
--   '*/15 * * * *',
--   $$SELECT public.process_scheduled_test_submissions();$$
-- );
--
-- SELECT cron.schedule(
--   'automation_grow_test_creator_views',
--   '*/30 * * * *',
--   $$SELECT public.grow_test_creator_views();$$
-- );

