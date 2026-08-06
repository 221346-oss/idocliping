CREATE OR REPLACE FUNCTION public.admin_reject_submission(p_submission_id uuid, p_reason text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_campaign uuid;
  v_total numeric;
  v_spent numeric;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;

  SELECT campaign_id INTO v_campaign FROM public.submissions WHERE id = p_submission_id;
  IF v_campaign IS NULL THEN RAISE EXCEPTION 'submission not found'; END IF;

  UPDATE public.submissions
    SET status = 'rejected',
        reject_reason = COALESCE(NULLIF(p_reason,''),'No reason provided'),
        manual_views = 0,
        total_views = 0,
        eligible_views = 0,
        reviewed_by = auth.uid(), reviewed_at = now(), updated_at = now()
    WHERE id = p_submission_id;

  DELETE FROM public.earnings WHERE submission_id = p_submission_id AND status = 'pending';

  SELECT COALESCE(SUM(e.amount),0) INTO v_spent
    FROM public.earnings e
    JOIN public.submissions s ON s.id = e.submission_id
    WHERE s.campaign_id = v_campaign AND e.type = 'campaign';

  SELECT budget_total INTO v_total FROM public.campaigns WHERE id = v_campaign;

  UPDATE public.campaigns
    SET budget_remaining = GREATEST(COALESCE(v_total,0) - v_spent, 0)
    WHERE id = v_campaign;
END;
$function$;