-- 1. Saved campaigns (per-user bookmarks)
CREATE TABLE IF NOT EXISTS public.saved_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, campaign_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.saved_campaigns TO authenticated;
GRANT ALL ON public.saved_campaigns TO service_role;

ALTER TABLE public.saved_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own saved campaigns"
  ON public.saved_campaigns FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 2. Appeals: one per submission + proof attachments
ALTER TABLE public.submission_appeals
  ADD COLUMN IF NOT EXISTS proof_urls text[] NOT NULL DEFAULT '{}';

DELETE FROM public.submission_appeals a
  USING public.submission_appeals b
  WHERE a.submission_id = b.submission_id AND a.ctid > b.ctid;

CREATE UNIQUE INDEX IF NOT EXISTS submission_appeals_one_per_submission
  ON public.submission_appeals (submission_id);

-- 3. Rejection restores campaign budget
CREATE OR REPLACE FUNCTION public.admin_reject_submission(p_submission_id uuid, p_reason text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_campaign_id uuid;
  v_total numeric;
  v_spent numeric;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;

  SELECT campaign_id INTO v_campaign_id FROM public.submissions WHERE id = p_submission_id;
  IF v_campaign_id IS NULL THEN RAISE EXCEPTION 'submission not found'; END IF;

  UPDATE public.submissions
    SET status = 'rejected',
        reject_reason = COALESCE(NULLIF(p_reason,''),'No reason provided'),
        reviewed_by = auth.uid(), reviewed_at = now(), updated_at = now()
    WHERE id = p_submission_id;

  -- drop any unpaid earning tied to this post (views stay on record)
  DELETE FROM public.earnings WHERE submission_id = p_submission_id AND status = 'pending';

  -- recompute campaign spend from what remains
  SELECT COALESCE(SUM(e.amount),0) INTO v_spent
    FROM public.earnings e
    JOIN public.submissions s ON s.id = e.submission_id
    WHERE s.campaign_id = v_campaign_id AND e.type = 'campaign';

  SELECT budget_total INTO v_total FROM public.campaigns WHERE id = v_campaign_id;

  UPDATE public.campaigns
    SET budget_remaining = GREATEST(COALESCE(v_total,0) - v_spent, 0),
        status = CASE WHEN status = 'pending' AND v_spent < COALESCE(v_total,0) THEN 'active' ELSE status END
    WHERE id = v_campaign_id;
END;
$function$;