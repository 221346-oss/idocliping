-- Combined manual migrations 006 + 007
-- 006: support tickets, cosmetics, leaderboard points cache, anime category
-- 007: grant_rank_reward_cosmetics RPC

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'campaign_category' AND e.enumlabel = 'anime'
  ) THEN
    ALTER TYPE public.campaign_category ADD VALUE 'anime';
  END IF;
END $$;

DO $$ BEGIN
  CREATE TYPE public.support_ticket_type AS ENUM (
    'bug_report','payment_issue','campaign_dispute','account_issue',
    'submission_issue','feature_request','other'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.support_ticket_status AS ENUM ('open','in_progress','resolved','closed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.support_ticket_priority AS ENUM ('low','medium','high');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE SEQUENCE IF NOT EXISTS public.support_ticket_number_seq START WITH 1 INCREMENT BY 1;

CREATE TABLE IF NOT EXISTS public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  ticket_number text UNIQUE,
  type public.support_ticket_type NOT NULL DEFAULT 'other',
  subject text NOT NULL CHECK (char_length(subject) <= 100),
  description text NOT NULL CHECK (char_length(description) <= 1000),
  priority public.support_ticket_priority NOT NULL DEFAULT 'medium',
  status public.support_ticket_status NOT NULL DEFAULT 'open',
  internal_notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS support_tickets_user_id_idx ON public.support_tickets(user_id);
CREATE INDEX IF NOT EXISTS support_tickets_status_idx ON public.support_tickets(status);

CREATE OR REPLACE FUNCTION public.support_tickets_set_number()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.ticket_number IS NULL THEN
    NEW.ticket_number := 'TKT-' || lpad(nextval('public.support_ticket_number_seq')::text, 5, '0');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_support_tickets_number ON public.support_tickets;
CREATE TRIGGER trg_support_tickets_number BEFORE INSERT ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.support_tickets_set_number();

DROP TRIGGER IF EXISTS trg_support_tickets_updated ON public.support_tickets;
CREATE TRIGGER trg_support_tickets_updated BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.ticket_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  file_url text NOT NULL,
  uploaded_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ticket_attachments_ticket_id_idx ON public.ticket_attachments(ticket_id);

CREATE TABLE IF NOT EXISTS public.ticket_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  sender_role text NOT NULL CHECK (sender_role IN ('creator','admin')),
  message text NOT NULL CHECK (char_length(message) <= 4000),
  is_internal boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ticket_messages_ticket_id_idx ON public.ticket_messages(ticket_id);

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "support_tickets_select_own_or_admin" ON public.support_tickets;
CREATE POLICY "support_tickets_select_own_or_admin" ON public.support_tickets FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS "support_tickets_insert_own" ON public.support_tickets;
CREATE POLICY "support_tickets_insert_own" ON public.support_tickets FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "support_tickets_update_admin" ON public.support_tickets;
CREATE POLICY "support_tickets_update_admin" ON public.support_tickets FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "ticket_attachments_select" ON public.ticket_attachments;
CREATE POLICY "ticket_attachments_select" ON public.ticket_attachments FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.support_tickets t WHERE t.id = ticket_id AND (t.user_id = auth.uid() OR public.has_role(auth.uid(),'admin'))));
DROP POLICY IF EXISTS "ticket_attachments_insert_own_ticket" ON public.ticket_attachments;
CREATE POLICY "ticket_attachments_insert_own_ticket" ON public.ticket_attachments FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.support_tickets t WHERE t.id = ticket_id AND t.user_id = auth.uid()));

DROP POLICY IF EXISTS "ticket_messages_select" ON public.ticket_messages;
CREATE POLICY "ticket_messages_select" ON public.ticket_messages FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.support_tickets t WHERE t.id = ticket_id AND (t.user_id = auth.uid() OR public.has_role(auth.uid(),'admin')))
    AND (NOT is_internal OR public.has_role(auth.uid(),'admin')));
DROP POLICY IF EXISTS "ticket_messages_insert_creator" ON public.ticket_messages;
CREATE POLICY "ticket_messages_insert_creator" ON public.ticket_messages FOR INSERT TO authenticated
  WITH CHECK (sender_role = 'creator' AND is_internal = false
    AND EXISTS (SELECT 1 FROM public.support_tickets t WHERE t.id = ticket_id AND t.user_id = auth.uid()));
DROP POLICY IF EXISTS "ticket_messages_insert_admin" ON public.ticket_messages;
CREATE POLICY "ticket_messages_insert_admin" ON public.ticket_messages FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin') AND sender_role = 'admin');

-- Cosmetics
DO $$ BEGIN CREATE TYPE public.cosmetic_item_type AS ENUM ('avatar','banner');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.cosmetic_unlock_type AS ENUM ('default','rank_reward','admin_grant');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.cosmetic_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type public.cosmetic_item_type NOT NULL,
  name text NOT NULL,
  image_url text NOT NULL,
  unlock_type public.cosmetic_unlock_type NOT NULL DEFAULT 'default',
  rank_reward_condition jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.creator_cosmetics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  cosmetic_id uuid NOT NULL REFERENCES public.cosmetic_items(id) ON DELETE CASCADE,
  unlocked_at timestamptz NOT NULL DEFAULT now(),
  unlocked_reason text NOT NULL DEFAULT 'default',
  UNIQUE (user_id, cosmetic_id)
);
CREATE INDEX IF NOT EXISTS creator_cosmetics_user_id_idx ON public.creator_cosmetics(user_id);

CREATE TABLE IF NOT EXISTS public.creator_profile_settings (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  equipped_avatar_id uuid REFERENCES public.cosmetic_items(id) ON DELETE SET NULL,
  equipped_banner_id uuid REFERENCES public.cosmetic_items(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.cosmetic_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creator_cosmetics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creator_profile_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cosmetic_items_select_active" ON public.cosmetic_items;
CREATE POLICY "cosmetic_items_select_active" ON public.cosmetic_items FOR SELECT TO authenticated
  USING (is_active = true OR public.has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS "cosmetic_items_admin_all" ON public.cosmetic_items;
CREATE POLICY "cosmetic_items_admin_all" ON public.cosmetic_items FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "creator_cosmetics_select_own" ON public.creator_cosmetics;
CREATE POLICY "creator_cosmetics_select_own" ON public.creator_cosmetics FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS "creator_cosmetics_insert_admin" ON public.creator_cosmetics;
CREATE POLICY "creator_cosmetics_insert_admin" ON public.creator_cosmetics FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS "creator_cosmetics_insert_default_unlock" ON public.creator_cosmetics;
CREATE POLICY "creator_cosmetics_insert_default_unlock" ON public.creator_cosmetics FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND EXISTS (SELECT 1 FROM public.cosmetic_items c
    WHERE c.id = cosmetic_id AND c.unlock_type = 'default' AND c.is_active = true));
DROP POLICY IF EXISTS "creator_cosmetics_delete_admin" ON public.creator_cosmetics;
CREATE POLICY "creator_cosmetics_delete_admin" ON public.creator_cosmetics FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "creator_profile_settings_select_own" ON public.creator_profile_settings;
CREATE POLICY "creator_profile_settings_select_own" ON public.creator_profile_settings FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS "creator_profile_settings_upsert_own" ON public.creator_profile_settings;
CREATE POLICY "creator_profile_settings_upsert_own" ON public.creator_profile_settings FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "creator_profile_settings_update_own" ON public.creator_profile_settings;
CREATE POLICY "creator_profile_settings_update_own" ON public.creator_profile_settings FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Leaderboard points cache
CREATE TABLE IF NOT EXISTS public.creator_leaderboard_points (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  points_week numeric NOT NULL DEFAULT 0,
  points_month numeric NOT NULL DEFAULT 0,
  points_all_time numeric NOT NULL DEFAULT 0,
  week_bucket_start date,
  month_bucket_start date,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.creator_leaderboard_points ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "creator_leaderboard_points_select_all" ON public.creator_leaderboard_points;
CREATE POLICY "creator_leaderboard_points_select_all" ON public.creator_leaderboard_points FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "creator_leaderboard_points_admin_write" ON public.creator_leaderboard_points;
CREATE POLICY "creator_leaderboard_points_admin_write" ON public.creator_leaderboard_points FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Storage buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) VALUES
  ('cosmetics','cosmetics',true,5242880,ARRAY['image/png','image/jpeg','image/webp','image/gif']::text[]),
  ('support-attachments','support-attachments',false,5242880,ARRAY['image/png','image/jpeg','image/webp','image/gif']::text[])
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "storage_cosmetics_public_read" ON storage.objects;
CREATE POLICY "storage_cosmetics_public_read" ON storage.objects FOR SELECT TO public USING (bucket_id = 'cosmetics');
DROP POLICY IF EXISTS "storage_cosmetics_admin_write" ON storage.objects;
CREATE POLICY "storage_cosmetics_admin_write" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'cosmetics' AND public.has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS "storage_cosmetics_admin_update" ON storage.objects;
CREATE POLICY "storage_cosmetics_admin_update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'cosmetics' AND public.has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS "storage_support_select_own" ON storage.objects;
CREATE POLICY "storage_support_select_own" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'support-attachments' AND (public.has_role(auth.uid(),'admin') OR (storage.foldername(name))[1] = auth.uid()::text));
DROP POLICY IF EXISTS "storage_support_insert_own" ON storage.objects;
CREATE POLICY "storage_support_insert_own" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'support-attachments' AND (storage.foldername(name))[1] = auth.uid()::text);

-- 007: grant_rank_reward_cosmetics
CREATE OR REPLACE FUNCTION public.grant_rank_reward_cosmetics(p_period text, p_ref timestamptz DEFAULT now())
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_jwt_role text; v_ok boolean; v_start timestamptz; v_end timestamptz;
  r_item record; v_cond jsonb; v_winner uuid; v_pos int;
  v_grants int := 0; v_skipped int := 0; v_scope text; v_plat text;
  v_cid uuid; v_cat text; v_item_period text; v_inserted int;
  v_log jsonb := '[]'::jsonb;
BEGIN
  v_jwt_role := coalesce(auth.jwt()->>'role','');
  v_ok := (v_jwt_role = 'service_role') OR (auth.uid() IS NOT NULL AND public.has_role(auth.uid(),'admin'));
  IF NOT v_ok THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF p_period NOT IN ('weekly','monthly') THEN RAISE EXCEPTION 'invalid p_period'; END IF;
  IF p_period = 'weekly' THEN v_end := date_trunc('week', p_ref); v_start := v_end - interval '7 days';
  ELSE v_end := date_trunc('month', p_ref); v_start := v_end - interval '1 month'; END IF;

  FOR r_item IN SELECT * FROM public.cosmetic_items WHERE unlock_type = 'rank_reward' AND is_active = true LOOP
    v_cond := r_item.rank_reward_condition;
    IF v_cond IS NULL THEN v_skipped := v_skipped + 1; CONTINUE; END IF;
    v_item_period := v_cond->>'period';
    IF v_item_period IS NULL OR v_item_period <> p_period THEN CONTINUE; END IF;
    BEGIN v_pos := (v_cond->>'position')::int;
    EXCEPTION WHEN others THEN v_skipped := v_skipped + 1; CONTINUE; END;
    IF v_pos IS NULL OR v_pos < 1 OR v_pos > 3 THEN v_skipped := v_skipped + 1; CONTINUE; END IF;
    v_scope := v_cond->>'scope'; v_winner := NULL;

    IF v_scope = 'platform' THEN
      v_plat := lower(trim(coalesce(v_cond->>'platform','tiktok')));
      WITH agg AS (SELECT s.creator_id,
        SUM(FLOOR(GREATEST(s.manual_views,0)::numeric/1000)+50)::bigint AS pts,
        SUM(GREATEST(s.manual_views,0))::bigint AS vws
        FROM public.submissions s WHERE s.status='approved'
          AND s.created_at >= v_start AND s.created_at < v_end
          AND s.platform = v_plat::public.social_platform GROUP BY s.creator_id),
      ranked AS (SELECT creator_id, ROW_NUMBER() OVER (ORDER BY pts DESC, vws DESC, creator_id) AS rnk FROM agg)
      SELECT creator_id INTO v_winner FROM ranked WHERE rnk = v_pos;
    ELSIF v_scope = 'campaign' THEN
      IF nullif(trim(v_cond->>'campaign_id'),'') IS NULL THEN v_skipped := v_skipped + 1; CONTINUE; END IF;
      v_cid := (v_cond->>'campaign_id')::uuid;
      WITH agg AS (SELECT s.creator_id,
        SUM(FLOOR(GREATEST(s.manual_views,0)::numeric/1000)+50)::bigint AS pts,
        SUM(GREATEST(s.manual_views,0))::bigint AS vws
        FROM public.submissions s WHERE s.status='approved'
          AND s.created_at >= v_start AND s.created_at < v_end
          AND s.campaign_id = v_cid GROUP BY s.creator_id),
      ranked AS (SELECT creator_id, ROW_NUMBER() OVER (ORDER BY pts DESC, vws DESC, creator_id) AS rnk FROM agg)
      SELECT creator_id INTO v_winner FROM ranked WHERE rnk = v_pos;
    ELSIF v_scope = 'category' THEN
      v_cat := lower(trim(coalesce(v_cond->>'category','music')));
      WITH agg AS (SELECT s.creator_id,
        SUM(FLOOR(GREATEST(s.manual_views,0)::numeric/1000)+50)::bigint AS pts,
        SUM(GREATEST(s.manual_views,0))::bigint AS vws
        FROM public.submissions s INNER JOIN public.campaigns c ON c.id = s.campaign_id
        WHERE s.status='approved' AND s.created_at >= v_start AND s.created_at < v_end
          AND c.category = v_cat::public.campaign_category GROUP BY s.creator_id),
      ranked AS (SELECT creator_id, ROW_NUMBER() OVER (ORDER BY pts DESC, vws DESC, creator_id) AS rnk FROM agg)
      SELECT creator_id INTO v_winner FROM ranked WHERE rnk = v_pos;
    ELSE v_skipped := v_skipped + 1; CONTINUE; END IF;

    IF v_winner IS NULL THEN
      v_log := v_log || jsonb_build_array(jsonb_build_object('cosmetic_id',r_item.id,'name',r_item.name,'result','no_qualifying_creator'));
      CONTINUE;
    END IF;
    INSERT INTO public.creator_cosmetics (user_id, cosmetic_id, unlocked_reason)
      VALUES (v_winner, r_item.id, 'rank_reward') ON CONFLICT (user_id, cosmetic_id) DO NOTHING;
    GET DIAGNOSTICS v_inserted = ROW_COUNT;
    IF v_inserted > 0 THEN v_grants := v_grants + 1;
      v_log := v_log || jsonb_build_array(jsonb_build_object('cosmetic_id',r_item.id,'name',r_item.name,'user_id',v_winner,'result','granted'));
    ELSE v_log := v_log || jsonb_build_array(jsonb_build_object('cosmetic_id',r_item.id,'name',r_item.name,'user_id',v_winner,'result','already_owned'));
    END IF;
  END LOOP;
  RETURN jsonb_build_object('period',p_period,'window_start',v_start,'window_end',v_end,
    'grants_new',v_grants,'rules_skipped_bad_config',v_skipped,'details',v_log);
END;
$$;

REVOKE ALL ON FUNCTION public.grant_rank_reward_cosmetics(text, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.grant_rank_reward_cosmetics(text, timestamptz) TO service_role;
GRANT EXECUTE ON FUNCTION public.grant_rank_reward_cosmetics(text, timestamptz) TO authenticated;

-- Seed default cosmetics
INSERT INTO public.cosmetic_items (type, name, image_url, unlock_type)
SELECT 'avatar'::public.cosmetic_item_type, 'Starter', '/marketing-campaign-banner-fallback.svg', 'default'::public.cosmetic_unlock_type
WHERE NOT EXISTS (SELECT 1 FROM public.cosmetic_items WHERE type='avatar' AND name='Starter' AND unlock_type='default');

INSERT INTO public.cosmetic_items (type, name, image_url, unlock_type)
SELECT 'banner'::public.cosmetic_item_type, 'Starter Strip', '/marketing-campaign-banner-fallback.svg', 'default'::public.cosmetic_unlock_type
WHERE NOT EXISTS (SELECT 1 FROM public.cosmetic_items WHERE type='banner' AND name='Starter Strip' AND unlock_type='default');