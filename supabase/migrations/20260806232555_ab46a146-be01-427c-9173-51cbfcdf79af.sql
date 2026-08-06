ALTER TABLE public.submission_appeals ADD COLUMN IF NOT EXISTS proof_url text;

DELETE FROM public.submission_appeals a
USING public.submission_appeals b
WHERE a.submission_id = b.submission_id AND a.ctid > b.ctid;

CREATE UNIQUE INDEX IF NOT EXISTS submission_appeals_one_per_submission
  ON public.submission_appeals (submission_id);