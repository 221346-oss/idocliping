
-- 1. Extend role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'brand';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'creator';

-- 2. New signups default to creator
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'creator');
  RETURN NEW;
END;
$$;

-- 3. Enums
CREATE TYPE public.campaign_category AS ENUM ('music','clipping','gaming','logo','ugc','other');
CREATE TYPE public.campaign_status AS ENUM ('draft','active','paused','ended');
CREATE TYPE public.submission_status AS ENUM ('pending','approved','rejected');
CREATE TYPE public.social_platform AS ENUM ('tiktok','instagram','youtube','x');
CREATE TYPE public.earning_type AS ENUM ('campaign','referral');
CREATE TYPE public.withdrawal_method AS ENUM ('paypal','usdt','bank');
CREATE TYPE public.withdrawal_status AS ENUM ('pending','approved','paid','rejected');

-- 4. Brands
CREATE TABLE public.brands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  logo_url text DEFAULT '',
  website text DEFAULT '',
  description text DEFAULT '',
  owner_user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Brands viewable by authenticated" ON public.brands FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage brands" ON public.brands FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Owner can update own brand" ON public.brands FOR UPDATE TO authenticated USING (auth.uid() = owner_user_id);
CREATE TRIGGER trg_brands_updated BEFORE UPDATE ON public.brands FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. Campaigns
CREATE TABLE public.campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id uuid REFERENCES public.brands(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text DEFAULT '',
  instructions text DEFAULT '',
  thumbnail_url text DEFAULT '',
  category public.campaign_category NOT NULL DEFAULT 'other',
  platforms text[] NOT NULL DEFAULT '{}',
  payout_per_1m_views numeric NOT NULL DEFAULT 0,
  budget_total numeric NOT NULL DEFAULT 0,
  budget_remaining numeric NOT NULL DEFAULT 0,
  status public.campaign_status NOT NULL DEFAULT 'draft',
  badges text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Campaigns viewable by authenticated" ON public.campaigns FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage campaigns" ON public.campaigns FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_campaigns_updated BEFORE UPDATE ON public.campaigns FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 6. Campaign participants
CREATE TABLE public.campaign_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  creator_id uuid NOT NULL,
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(campaign_id, creator_id)
);
ALTER TABLE public.campaign_participants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Participants viewable by authenticated" ON public.campaign_participants FOR SELECT TO authenticated USING (true);
CREATE POLICY "Creators can join campaigns" ON public.campaign_participants FOR INSERT TO authenticated WITH CHECK (auth.uid() = creator_id);
CREATE POLICY "Creators can leave campaigns" ON public.campaign_participants FOR DELETE TO authenticated USING (auth.uid() = creator_id OR public.has_role(auth.uid(),'admin'));

-- 7. Submissions
CREATE TABLE public.submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  creator_id uuid NOT NULL,
  platform public.social_platform NOT NULL,
  post_url text NOT NULL,
  manual_views bigint NOT NULL DEFAULT 0,
  status public.submission_status NOT NULL DEFAULT 'pending',
  reject_reason text DEFAULT '',
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Submissions viewable by authenticated" ON public.submissions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Creators can submit" ON public.submissions FOR INSERT TO authenticated WITH CHECK (auth.uid() = creator_id);
CREATE POLICY "Creators can update own pending submissions" ON public.submissions FOR UPDATE TO authenticated USING (auth.uid() = creator_id AND status = 'pending');
CREATE POLICY "Admins manage submissions" ON public.submissions FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_submissions_updated BEFORE UPDATE ON public.submissions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 8. Social accounts
CREATE TABLE public.social_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  platform public.social_platform NOT NULL,
  handle text NOT NULL,
  profile_url text DEFAULT '',
  verified boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, platform)
);
ALTER TABLE public.social_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Social accounts viewable by authenticated" ON public.social_accounts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users manage own social accounts" ON public.social_accounts FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins manage all social accounts" ON public.social_accounts FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- 9. Earnings
CREATE TABLE public.earnings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL,
  submission_id uuid REFERENCES public.submissions(id) ON DELETE SET NULL,
  amount numeric NOT NULL DEFAULT 0,
  type public.earning_type NOT NULL DEFAULT 'campaign',
  notes text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.earnings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Earnings viewable by authenticated" ON public.earnings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage earnings" ON public.earnings FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- 10. Referral codes
CREATE TABLE public.referral_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  code text NOT NULL UNIQUE,
  uses_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Referral codes viewable by authenticated" ON public.referral_codes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users manage own referral code" ON public.referral_codes FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 11. Referrals
CREATE TABLE public.referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid NOT NULL,
  referred_user_id uuid NOT NULL UNIQUE,
  code text NOT NULL,
  commission_rate numeric NOT NULL DEFAULT 0.05,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Referrals viewable by authenticated" ON public.referrals FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage referrals" ON public.referrals FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- 12. Withdrawal requests
CREATE TABLE public.withdrawal_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL,
  amount numeric NOT NULL,
  method public.withdrawal_method NOT NULL,
  payout_details jsonb NOT NULL DEFAULT '{}'::jsonb,
  status public.withdrawal_status NOT NULL DEFAULT 'pending',
  notes text DEFAULT '',
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.withdrawal_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Withdrawals viewable by authenticated" ON public.withdrawal_requests FOR SELECT TO authenticated USING (true);
CREATE POLICY "Creators can request withdrawals" ON public.withdrawal_requests FOR INSERT TO authenticated WITH CHECK (auth.uid() = creator_id);
CREATE POLICY "Creators can cancel own pending" ON public.withdrawal_requests FOR DELETE TO authenticated USING (auth.uid() = creator_id AND status = 'pending');
CREATE POLICY "Admins manage withdrawals" ON public.withdrawal_requests FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- 13. Storage bucket for campaign assets
INSERT INTO storage.buckets (id, name, public) VALUES ('campaign-assets','campaign-assets', true) ON CONFLICT (id) DO NOTHING;
CREATE POLICY "Campaign assets public read" ON storage.objects FOR SELECT USING (bucket_id = 'campaign-assets');
CREATE POLICY "Admins upload campaign assets" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'campaign-assets' AND public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins update campaign assets" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'campaign-assets' AND public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins delete campaign assets" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'campaign-assets' AND public.has_role(auth.uid(),'admin'));
