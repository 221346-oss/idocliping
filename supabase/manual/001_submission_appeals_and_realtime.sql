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
