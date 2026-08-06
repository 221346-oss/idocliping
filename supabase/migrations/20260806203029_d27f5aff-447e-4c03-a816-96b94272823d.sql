ALTER TABLE public.campaigns
  ADD COLUMN IF NOT EXISTS max_submissions_per_day integer,
  ADD COLUMN IF NOT EXISTS min_followers_per_account integer,
  ADD COLUMN IF NOT EXISTS min_views_for_earnings integer,
  ADD COLUMN IF NOT EXISTS min_engagement_rate numeric,
  ADD COLUMN IF NOT EXISTS min_duration_seconds integer,
  ADD COLUMN IF NOT EXISTS account_audience_requirements jsonb,
  ADD COLUMN IF NOT EXISTS discord_link text;

ALTER TABLE public.submissions
  ADD COLUMN IF NOT EXISTS total_views bigint,
  ADD COLUMN IF NOT EXISTS eligible_views bigint,
  ADD COLUMN IF NOT EXISTS engagement_rate numeric,
  ADD COLUMN IF NOT EXISTS next_refresh_at timestamptz,
  ADD COLUMN IF NOT EXISTS status_reason text;

ALTER TYPE public.withdrawal_method ADD VALUE IF NOT EXISTS 'amazon_giftcard';
ALTER TYPE public.withdrawal_method ADD VALUE IF NOT EXISTS 'visa_prepaid';

ALTER TABLE public.social_accounts
  ADD COLUMN IF NOT EXISTS verification_code text,
  ADD COLUMN IF NOT EXISTS verification_status text NOT NULL DEFAULT 'unverified',
  ADD COLUMN IF NOT EXISTS verification_requested_at timestamptz,
  ADD COLUMN IF NOT EXISTS verification_note text;

CREATE TABLE IF NOT EXISTS public.weekly_rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  week_start date NOT NULL,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  prize_text text NOT NULL DEFAULT '',
  is_published boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.weekly_rewards TO authenticated;
GRANT ALL ON public.weekly_rewards TO service_role;

ALTER TABLE public.weekly_rewards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Signed-in users can read published rewards"
  ON public.weekly_rewards FOR SELECT TO authenticated
  USING (is_published OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage rewards"
  ON public.weekly_rewards FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_weekly_rewards_updated
  BEFORE UPDATE ON public.weekly_rewards
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();