
-- 1. SUBMISSIONS
DROP POLICY IF EXISTS "Submissions viewable by authenticated" ON public.submissions;
CREATE POLICY "Submissions viewable by owner admin brand" ON public.submissions
FOR SELECT TO authenticated
USING (
  auth.uid() = creator_id
  OR public.has_role(auth.uid(), 'admin')
  OR EXISTS (
    SELECT 1 FROM public.campaigns c
    JOIN public.brands b ON b.id = c.brand_id
    WHERE c.id = submissions.campaign_id AND b.owner_user_id = auth.uid()
  )
);

-- 2. EARNINGS
DROP POLICY IF EXISTS "Earnings viewable by authenticated" ON public.earnings;
CREATE POLICY "Earnings viewable by owner or admin" ON public.earnings
FOR SELECT TO authenticated
USING (auth.uid() = creator_id OR public.has_role(auth.uid(), 'admin'));

-- 3. SOCIAL ACCOUNTS
DROP POLICY IF EXISTS "Social accounts viewable by authenticated" ON public.social_accounts;

-- 4. REFERRAL CODES
DROP POLICY IF EXISTS "Referral codes viewable by authenticated" ON public.referral_codes;
CREATE POLICY "Referral codes viewable by admin" ON public.referral_codes
FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 5. REFERRALS
DROP POLICY IF EXISTS "Referrals viewable by authenticated" ON public.referrals;
CREATE POLICY "Referrals viewable by parties or admin" ON public.referrals
FOR SELECT TO authenticated
USING (auth.uid() = referrer_id OR auth.uid() = referred_user_id OR public.has_role(auth.uid(), 'admin'));

-- 6. WITHDRAWAL REQUESTS
DROP POLICY IF EXISTS "Withdrawals viewable by authenticated" ON public.withdrawal_requests;
CREATE POLICY "Withdrawals viewable by owner or admin" ON public.withdrawal_requests
FOR SELECT TO authenticated
USING (auth.uid() = creator_id OR public.has_role(auth.uid(), 'admin'));

-- 7. CAMPAIGN PARTICIPANTS
DROP POLICY IF EXISTS "Participants viewable by authenticated" ON public.campaign_participants;
CREATE POLICY "Participants viewable by owner admin brand" ON public.campaign_participants
FOR SELECT TO authenticated
USING (
  auth.uid() = creator_id
  OR public.has_role(auth.uid(), 'admin')
  OR EXISTS (
    SELECT 1 FROM public.campaigns c
    JOIN public.brands b ON b.id = c.brand_id
    WHERE c.id = campaign_participants.campaign_id AND b.owner_user_id = auth.uid()
  )
);

-- 8. SAFE PUBLIC AGGREGATE VIEWS (non-sensitive columns only)
CREATE OR REPLACE VIEW public.public_submissions
WITH (security_invoker = off) AS
SELECT s.id, s.creator_id, s.campaign_id, s.platform, s.manual_views,
       s.status, s.created_at, s.updated_at, s.is_test_submission
FROM public.submissions s
WHERE s.status = 'approved';

CREATE OR REPLACE VIEW public.public_creator_earnings
WITH (security_invoker = off) AS
SELECT e.creator_id, COALESCE(SUM(e.amount), 0)::numeric AS lifetime_campaign_earnings
FROM public.earnings e
WHERE e.type = 'campaign'
GROUP BY e.creator_id;

CREATE OR REPLACE VIEW public.public_campaign_creator_earnings
WITH (security_invoker = off) AS
SELECT e.creator_id, s.campaign_id, COALESCE(SUM(e.amount), 0)::numeric AS amount
FROM public.earnings e
JOIN public.submissions s ON s.id = e.submission_id
WHERE e.type = 'campaign'
GROUP BY e.creator_id, s.campaign_id;

CREATE OR REPLACE VIEW public.public_campaign_participant_counts
WITH (security_invoker = off) AS
SELECT cp.campaign_id, COUNT(*)::bigint AS participant_count
FROM public.campaign_participants cp
GROUP BY cp.campaign_id;

CREATE OR REPLACE VIEW public.public_creator_campaign_counts
WITH (security_invoker = off) AS
SELECT cp.creator_id, COUNT(*)::bigint AS campaign_count
FROM public.campaign_participants cp
GROUP BY cp.creator_id;

CREATE OR REPLACE VIEW public.public_creator_platforms
WITH (security_invoker = off) AS
SELECT DISTINCT sa.user_id, sa.platform
FROM public.social_accounts sa;

REVOKE ALL ON public.public_submissions, public.public_creator_earnings,
  public.public_campaign_creator_earnings, public.public_campaign_participant_counts,
  public.public_creator_campaign_counts, public.public_creator_platforms FROM PUBLIC, anon;
GRANT SELECT ON public.public_submissions, public.public_creator_earnings,
  public.public_campaign_creator_earnings, public.public_campaign_participant_counts,
  public.public_creator_campaign_counts, public.public_creator_platforms TO authenticated, service_role;

-- 9. STORAGE HARDENING
DROP POLICY IF EXISTS "Authenticated can upload bug attachments" ON storage.objects;
CREATE POLICY "Authenticated can upload own bug attachments" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'bug-attachments' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "storage_support_delete_own" ON storage.objects;
CREATE POLICY "storage_support_delete_own" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'support-attachments'
  AND (public.has_role(auth.uid(), 'admin') OR (storage.foldername(name))[1] = auth.uid()::text)
);
