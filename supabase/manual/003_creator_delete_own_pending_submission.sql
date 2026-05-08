-- Run manually in Supabase SQL Editor.
-- Lets creators DELETE their own rows only while status = 'pending' (withdraw before review).

DROP POLICY IF EXISTS "Creators delete own pending submissions" ON public.submissions;

CREATE POLICY "Creators delete own pending submissions"
  ON public.submissions FOR DELETE TO authenticated
  USING (
    auth.uid() = creator_id AND status = 'pending'
  );
