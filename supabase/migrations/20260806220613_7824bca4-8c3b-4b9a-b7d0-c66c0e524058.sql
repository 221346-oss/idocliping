
ALTER TABLE public.submissions ALTER COLUMN status SET DEFAULT 'processing';

-- Auto-promote processing -> eligible after the 6s window
CREATE OR REPLACE FUNCTION public.submissions_set_eligible_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.eligible_at IS NULL THEN
    NEW.eligible_at := now() + interval '6 seconds';
  END IF;
  IF NEW.status IS NULL OR NEW.status = 'pending' THEN
    NEW.status := 'processing';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_submissions_eligible_at ON public.submissions;
CREATE TRIGGER trg_submissions_eligible_at
BEFORE INSERT ON public.submissions
FOR EACH ROW EXECUTE FUNCTION public.submissions_set_eligible_at();

CREATE OR REPLACE FUNCTION public.promote_eligible_submissions()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_count int;
BEGIN
  UPDATE public.submissions
    SET status = 'eligible', updated_at = now()
    WHERE status = 'processing'
      AND eligible_at IS NOT NULL
      AND eligible_at <= now();
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- Recalculate views + earning for a submission (admin only), never approves
CREATE OR REPLACE FUNCTION public.admin_update_submission_views(p_submission_id uuid, p_views bigint)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  s record; c record; v_amount numeric; v_eid uuid; v_spent numeric;
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
    SET manual_views = GREATEST(p_views,0),
        total_views = GREATEST(p_views,0),
        updated_at = now()
    WHERE id = p_submission_id;

  SELECT id INTO v_eid FROM public.earnings
    WHERE submission_id = p_submission_id AND type = 'campaign' LIMIT 1;

  IF v_eid IS NULL THEN
    INSERT INTO public.earnings (creator_id, submission_id, amount, type, status)
    VALUES (s.creator_id, p_submission_id, v_amount, 'campaign', 'pending');
  ELSE
    UPDATE public.earnings SET amount = v_amount WHERE id = v_eid AND status = 'pending';
  END IF;

  SELECT COALESCE(SUM(e.amount),0) INTO v_spent
    FROM public.earnings e
    JOIN public.submissions sub ON sub.id = e.submission_id
    WHERE sub.campaign_id = c.id AND e.type = 'campaign';

  UPDATE public.campaigns
    SET budget_remaining = GREATEST(c.budget_total - v_spent, 0),
        status = CASE WHEN v_spent >= c.budget_total AND status = 'active' THEN 'pending' ELSE status END
    WHERE id = c.id;

  -- when budget is fully consumed, move eligible posts into final review
  IF v_spent >= c.budget_total THEN
    UPDATE public.submissions SET status = 'pending', updated_at = now()
      WHERE campaign_id = c.id AND status IN ('processing','eligible');
  END IF;

  RETURN jsonb_build_object('views', GREATEST(p_views,0), 'amount', v_amount, 'spent', v_spent);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_campaign_review(p_campaign_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  UPDATE public.campaigns SET status = 'pending' WHERE id = p_campaign_id;
  UPDATE public.submissions SET status = 'pending', updated_at = now()
    WHERE campaign_id = p_campaign_id AND status IN ('processing','eligible');
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_reactivate_campaign(p_campaign_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  UPDATE public.campaigns SET status = 'active' WHERE id = p_campaign_id;
  UPDATE public.submissions SET status = 'eligible', updated_at = now()
    WHERE campaign_id = p_campaign_id AND status = 'pending';
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_approve_submission(p_submission_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE s record;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT * INTO s FROM public.submissions WHERE id = p_submission_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'submission not found'; END IF;

  UPDATE public.submissions
    SET status = 'approved', reviewed_by = auth.uid(), reviewed_at = now(), updated_at = now()
    WHERE id = p_submission_id;

  UPDATE public.earnings
    SET status = 'paid', paid_at = now()
    WHERE submission_id = p_submission_id AND status = 'pending';
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_reject_submission(p_submission_id uuid, p_reason text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  UPDATE public.submissions
    SET status = 'rejected',
        reject_reason = COALESCE(NULLIF(p_reason,''),'No reason provided'),
        reviewed_by = auth.uid(), reviewed_at = now(), updated_at = now()
    WHERE id = p_submission_id;

  DELETE FROM public.earnings WHERE submission_id = p_submission_id AND status = 'pending';
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_payout_campaign(p_campaign_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_count int;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;

  UPDATE public.submissions
    SET status = 'approved', reviewed_by = auth.uid(), reviewed_at = now(), updated_at = now()
    WHERE campaign_id = p_campaign_id AND status IN ('eligible','pending');

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
