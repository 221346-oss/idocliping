-- 1. Status vocab fixes
ALTER TABLE public.submissions DROP CONSTRAINT IF EXISTS submissions_status_check;
ALTER TABLE public.submissions ADD CONSTRAINT submissions_status_check
  CHECK (status = ANY (ARRAY['processing','eligible','pending','approved','rejected']));

-- 2. Single-admin lock
DELETE FROM public.user_roles ur
 WHERE ur.role = 'admin'
   AND ur.user_id NOT IN (SELECT id FROM auth.users WHERE lower(email) = 'mairaghaffar005@gmail.com');

INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::public.app_role FROM auth.users WHERE lower(email) = 'mairaghaffar005@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;

CREATE OR REPLACE FUNCTION public.enforce_single_admin()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_email text;
BEGIN
  IF NEW.role = 'admin' THEN
    SELECT lower(email) INTO v_email FROM auth.users WHERE id = NEW.user_id;
    IF v_email IS DISTINCT FROM 'mairaghaffar005@gmail.com' THEN
      RAISE EXCEPTION 'admin role is reserved';
    END IF;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_enforce_single_admin ON public.user_roles;
CREATE TRIGGER trg_enforce_single_admin BEFORE INSERT OR UPDATE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.enforce_single_admin();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, avatar_url)
  VALUES (NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    NEW.raw_user_meta_data->>'avatar_url')
  ON CONFLICT DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id,
    CASE WHEN lower(NEW.email) = 'mairaghaffar005@gmail.com' THEN 'admin'::public.app_role
         ELSE 'creator'::public.app_role END)
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END; $$;

-- 3. Social accounts: follower count + global uniqueness
ALTER TABLE public.social_accounts
  ADD COLUMN IF NOT EXISTS follower_count bigint,
  ADD COLUMN IF NOT EXISTS last_synced_at timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS social_accounts_platform_handle_uidx
  ON public.social_accounts (platform, lower(handle));

-- 4. Submissions: link to the social account + unique post url
ALTER TABLE public.submissions
  ADD COLUMN IF NOT EXISTS social_account_id uuid REFERENCES public.social_accounts(id) ON DELETE SET NULL;

-- remove pre-existing duplicate post links (keep the oldest)
DELETE FROM public.earnings e USING public.submissions s
 WHERE e.submission_id = s.id AND s.id IN (
   SELECT id FROM (
     SELECT id, row_number() OVER (
       PARTITION BY lower(regexp_replace(post_url, '\?.*$', '')) ORDER BY created_at
     ) rn FROM public.submissions
   ) t WHERE t.rn > 1);

DELETE FROM public.submissions WHERE id IN (
  SELECT id FROM (
    SELECT id, row_number() OVER (
      PARTITION BY lower(regexp_replace(post_url, '\?.*$', '')) ORDER BY created_at
    ) rn FROM public.submissions
  ) t WHERE t.rn > 1);

CREATE UNIQUE INDEX IF NOT EXISTS submissions_post_url_uidx
  ON public.submissions (lower(regexp_replace(post_url, '\?.*$', '')));

-- 5. Submission validation
CREATE OR REPLACE FUNCTION public.submissions_validate()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  acct record; c record; v_day int; v_total int; v_url text;
BEGIN
  v_url := lower(NEW.post_url);

  SELECT * INTO acct FROM public.social_accounts sa
   WHERE sa.user_id = NEW.creator_id
     AND sa.platform = NEW.platform
     AND (sa.verified = true OR sa.verification_status = 'verified')
     AND position(lower(replace(sa.handle,'@','')) in v_url) > 0
   LIMIT 1;

  IF acct IS NULL AND NEW.platform = 'youtube' THEN
    SELECT * INTO acct FROM public.social_accounts sa
     WHERE sa.user_id = NEW.creator_id AND sa.platform = 'youtube'
       AND (sa.verified = true OR sa.verification_status = 'verified')
     LIMIT 1;
  END IF;

  IF acct IS NULL THEN
    RAISE EXCEPTION 'This link does not belong to one of your verified linked accounts.';
  END IF;

  NEW.social_account_id := acct.id;

  SELECT * INTO c FROM public.campaigns WHERE id = NEW.campaign_id;

  IF c.max_submissions_per_day IS NOT NULL THEN
    SELECT count(*) INTO v_day FROM public.submissions s
     WHERE s.social_account_id = acct.id AND s.created_at > now() - interval '24 hours';
    IF v_day >= c.max_submissions_per_day THEN
      RAISE EXCEPTION 'Daily submission limit reached for this account.';
    END IF;
  END IF;

  IF c.max_submissions_per_account IS NOT NULL THEN
    SELECT count(*) INTO v_total FROM public.submissions s
     WHERE s.social_account_id = acct.id AND s.campaign_id = NEW.campaign_id;
    IF v_total >= c.max_submissions_per_account THEN
      RAISE EXCEPTION 'Submission limit reached for this account on this campaign.';
    END IF;
  END IF;

  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_submissions_validate ON public.submissions;
CREATE TRIGGER trg_submissions_validate BEFORE INSERT ON public.submissions
FOR EACH ROW EXECUTE FUNCTION public.submissions_validate();

-- 6. Admin view + engagement update
CREATE OR REPLACE FUNCTION public.admin_update_submission_views(
  p_submission_id uuid, p_views bigint, p_engagement numeric DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE s record; c record; v_amount numeric; v_eid uuid; v_spent numeric; v_reason text; v_ok boolean := true;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT * INTO s FROM public.submissions WHERE id = p_submission_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'submission not found'; END IF;
  SELECT * INTO c FROM public.campaigns WHERE id = s.campaign_id;

  IF c.min_engagement_rate IS NOT NULL AND p_engagement IS NOT NULL
     AND p_engagement < c.min_engagement_rate THEN
    v_ok := false;
    v_reason := 'Below required engagement rate (' || c.min_engagement_rate || '%)';
  END IF;

  IF c.min_views_for_earnings IS NOT NULL AND p_views < c.min_views_for_earnings THEN
    v_ok := false;
    v_reason := COALESCE(v_reason, 'Below minimum views for earnings');
  END IF;

  v_amount := (GREATEST(p_views,0)::numeric / 1000000) * COALESCE(c.payout_per_1m_views,0);
  IF c.max_earnings_per_post IS NOT NULL THEN
    v_amount := LEAST(v_amount, c.max_earnings_per_post::numeric);
  END IF;
  IF NOT v_ok THEN v_amount := 0; END IF;

  UPDATE public.submissions
     SET manual_views = GREATEST(p_views,0),
         total_views = GREATEST(p_views,0),
         eligible_views = CASE WHEN v_ok THEN GREATEST(p_views,0) ELSE 0 END,
         engagement_rate = COALESCE(p_engagement, engagement_rate),
         status = CASE WHEN v_ok THEN status ELSE 'rejected' END,
         reject_reason = CASE WHEN v_ok THEN reject_reason ELSE v_reason END,
         status_reason = COALESCE(v_reason, status_reason),
         updated_at = now()
   WHERE id = p_submission_id;

  IF NOT v_ok THEN
    DELETE FROM public.earnings WHERE submission_id = p_submission_id AND status = 'pending';
  ELSE
    SELECT id INTO v_eid FROM public.earnings
      WHERE submission_id = p_submission_id AND type = 'campaign' LIMIT 1;
    IF v_eid IS NULL THEN
      INSERT INTO public.earnings (creator_id, submission_id, amount, type, status)
      VALUES (s.creator_id, p_submission_id, v_amount, 'campaign', 'pending');
    ELSE
      UPDATE public.earnings SET amount = v_amount WHERE id = v_eid AND status = 'pending';
    END IF;
  END IF;

  SELECT COALESCE(SUM(e.amount),0) INTO v_spent
    FROM public.earnings e JOIN public.submissions sub ON sub.id = e.submission_id
   WHERE sub.campaign_id = c.id AND e.type = 'campaign';

  UPDATE public.campaigns
     SET budget_remaining = GREATEST(c.budget_total - v_spent, 0),
         status = CASE WHEN v_spent >= c.budget_total AND status = 'active' THEN 'pending_payout' ELSE status END
   WHERE id = c.id;

  IF v_spent >= c.budget_total THEN
    UPDATE public.submissions SET status = 'pending', updated_at = now()
      WHERE campaign_id = c.id AND status IN ('processing','eligible');
  END IF;

  RETURN jsonb_build_object('views', GREATEST(p_views,0), 'amount', v_amount, 'spent', v_spent, 'eligible', v_ok);
END; $$;

CREATE OR REPLACE FUNCTION public.admin_set_campaign_review(p_campaign_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  UPDATE public.campaigns SET status = 'pending_payout' WHERE id = p_campaign_id;
  UPDATE public.submissions SET status = 'pending', updated_at = now()
    WHERE campaign_id = p_campaign_id AND status IN ('processing','eligible');
END; $$;

CREATE OR REPLACE FUNCTION public.admin_reactivate_campaign(p_campaign_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  UPDATE public.campaigns SET status = 'active' WHERE id = p_campaign_id;
  UPDATE public.submissions SET status = 'eligible', updated_at = now()
    WHERE campaign_id = p_campaign_id AND status = 'pending';
END; $$;

-- 7. Unlink guard: block removing an account that has live submissions unless forced
CREATE OR REPLACE FUNCTION public.creator_unlink_social_account(p_account_id uuid, p_force boolean DEFAULT false)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_live int;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.social_accounts WHERE id = p_account_id AND user_id = auth.uid()) THEN
    RAISE EXCEPTION 'not found';
  END IF;

  SELECT count(*) INTO v_live FROM public.submissions s
   WHERE s.social_account_id = p_account_id
     AND s.status IN ('processing','eligible','pending');

  IF v_live > 0 AND NOT p_force THEN
    RETURN jsonb_build_object('blocked', true, 'live_submissions', v_live);
  END IF;

  IF v_live > 0 THEN
    UPDATE public.submissions
       SET status = 'rejected',
           reject_reason = 'Linked account was disconnected by the creator',
           eligible_views = 0, updated_at = now()
     WHERE social_account_id = p_account_id AND status IN ('processing','eligible','pending');
    DELETE FROM public.earnings e USING public.submissions s
     WHERE e.submission_id = s.id AND s.social_account_id = p_account_id AND e.status = 'pending';
  END IF;

  DELETE FROM public.social_accounts WHERE id = p_account_id AND user_id = auth.uid();
  RETURN jsonb_build_object('deleted', true, 'dismissed_submissions', v_live);
END; $$;

REVOKE ALL ON FUNCTION public.creator_unlink_social_account(uuid, boolean) FROM public;
GRANT EXECUTE ON FUNCTION public.creator_unlink_social_account(uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_submission_views(uuid, bigint, numeric) TO authenticated;