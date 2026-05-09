-- Run manually in Supabase SQL Editor after prior manual migrations.
-- Support tickets, cosmetics, leaderboard points cache, optional anime category.

-- ─── Campaign category: anime (for category leaderboard filter) ──────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'campaign_category' AND e.enumlabel = 'anime'
  ) THEN
    ALTER TYPE public.campaign_category ADD VALUE 'anime';
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- ─── Support tickets ─────────────────────────────────────────────────────────
-- Idempotent: skip CREATE TYPE if enum already exists (safe to re-run whole file).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typname = 'support_ticket_type'
  ) THEN
    CREATE TYPE public.support_ticket_type AS ENUM (
      'bug_report',
      'payment_issue',
      'campaign_dispute',
      'account_issue',
      'submission_issue',
      'feature_request',
      'other'
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typname = 'support_ticket_status'
  ) THEN
    CREATE TYPE public.support_ticket_status AS ENUM (
      'open',
      'in_progress',
      'resolved',
      'closed'
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typname = 'support_ticket_priority'
  ) THEN
    CREATE TYPE public.support_ticket_priority AS ENUM (
      'low',
      'medium',
      'high'
    );
  END IF;
END $$;

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
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.ticket_number IS NULL THEN
    NEW.ticket_number := 'TKT-' || lpad(nextval('public.support_ticket_number_seq')::text, 5, '0');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_support_tickets_number ON public.support_tickets;
CREATE TRIGGER trg_support_tickets_number
  BEFORE INSERT ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.support_tickets_set_number();

DROP TRIGGER IF EXISTS trg_support_tickets_updated ON public.support_tickets;
CREATE TRIGGER trg_support_tickets_updated
  BEFORE UPDATE ON public.support_tickets
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
  sender_role text NOT NULL CHECK (sender_role IN ('creator', 'admin')),
  message text NOT NULL CHECK (char_length(message) <= 4000),
  is_internal boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ticket_messages_ticket_id_idx ON public.ticket_messages(ticket_id);

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "support_tickets_select_own_or_admin" ON public.support_tickets;
CREATE POLICY "support_tickets_select_own_or_admin"
  ON public.support_tickets FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "support_tickets_insert_own" ON public.support_tickets;
CREATE POLICY "support_tickets_insert_own"
  ON public.support_tickets FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "support_tickets_update_admin" ON public.support_tickets;
CREATE POLICY "support_tickets_update_admin"
  ON public.support_tickets FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "ticket_attachments_select" ON public.ticket_attachments;
CREATE POLICY "ticket_attachments_select"
  ON public.ticket_attachments FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.support_tickets t
      WHERE t.id = ticket_id AND (t.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
  );

DROP POLICY IF EXISTS "ticket_attachments_insert_own_ticket" ON public.ticket_attachments;
CREATE POLICY "ticket_attachments_insert_own_ticket"
  ON public.ticket_attachments FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.support_tickets t
      WHERE t.id = ticket_id AND t.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "ticket_messages_select" ON public.ticket_messages;
CREATE POLICY "ticket_messages_select"
  ON public.ticket_messages FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.support_tickets t
      WHERE t.id = ticket_id AND (t.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
    AND (
      NOT is_internal
      OR public.has_role(auth.uid(), 'admin')
    )
  );

DROP POLICY IF EXISTS "ticket_messages_insert_creator" ON public.ticket_messages;
CREATE POLICY "ticket_messages_insert_creator"
  ON public.ticket_messages FOR INSERT TO authenticated
  WITH CHECK (
    sender_role = 'creator'
    AND is_internal = false
    AND EXISTS (
      SELECT 1 FROM public.support_tickets t
      WHERE t.id = ticket_id AND t.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "ticket_messages_insert_admin" ON public.ticket_messages;
CREATE POLICY "ticket_messages_insert_admin"
  ON public.ticket_messages FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    AND sender_role = 'admin'
  );


-- ─── Cosmetics ────────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typname = 'cosmetic_item_type'
  ) THEN
    CREATE TYPE public.cosmetic_item_type AS ENUM ('avatar', 'banner');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typname = 'cosmetic_unlock_type'
  ) THEN
    CREATE TYPE public.cosmetic_unlock_type AS ENUM ('default', 'rank_reward', 'admin_grant');
  END IF;
END $$;

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
CREATE POLICY "cosmetic_items_select_active"
  ON public.cosmetic_items FOR SELECT TO authenticated
  USING (is_active = true OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "cosmetic_items_admin_all" ON public.cosmetic_items;
CREATE POLICY "cosmetic_items_admin_all"
  ON public.cosmetic_items FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "creator_cosmetics_select_own" ON public.creator_cosmetics;
CREATE POLICY "creator_cosmetics_select_own"
  ON public.creator_cosmetics FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "creator_cosmetics_insert_admin" ON public.creator_cosmetics;
CREATE POLICY "creator_cosmetics_insert_admin"
  ON public.creator_cosmetics FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "creator_cosmetics_insert_default_unlock" ON public.creator_cosmetics;
CREATE POLICY "creator_cosmetics_insert_default_unlock"
  ON public.creator_cosmetics FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.cosmetic_items c
      WHERE c.id = cosmetic_id AND c.unlock_type = 'default' AND c.is_active = true
    )
  );

DROP POLICY IF EXISTS "creator_cosmetics_delete_admin" ON public.creator_cosmetics;
CREATE POLICY "creator_cosmetics_delete_admin"
  ON public.creator_cosmetics FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "creator_profile_settings_select_own" ON public.creator_profile_settings;
CREATE POLICY "creator_profile_settings_select_own"
  ON public.creator_profile_settings FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "creator_profile_settings_upsert_own" ON public.creator_profile_settings;
CREATE POLICY "creator_profile_settings_upsert_own"
  ON public.creator_profile_settings FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "creator_profile_settings_update_own" ON public.creator_profile_settings;
CREATE POLICY "creator_profile_settings_update_own"
  ON public.creator_profile_settings FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- ─── Leaderboard points cache (optional client refresh) ───────────────────────
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
CREATE POLICY "creator_leaderboard_points_select_all"
  ON public.creator_leaderboard_points FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "creator_leaderboard_points_admin_write" ON public.creator_leaderboard_points;
CREATE POLICY "creator_leaderboard_points_admin_write"
  ON public.creator_leaderboard_points FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));


-- Storage buckets (create in Dashboard if insert fails)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('cosmetics', 'cosmetics', true, 5242880, ARRAY['image/png','image/jpeg','image/webp','image/gif']::text[]),
  ('support-attachments', 'support-attachments', false, 5242880, ARRAY['image/png','image/jpeg','image/webp','image/gif']::text[])
ON CONFLICT (id) DO NOTHING;

-- Storage: cosmetics public read; support uploads scoped to ticket owner path support-attachments/{user_id}/...
DROP POLICY IF EXISTS "storage_cosmetics_public_read" ON storage.objects;
CREATE POLICY "storage_cosmetics_public_read"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'cosmetics');

DROP POLICY IF EXISTS "storage_cosmetics_admin_write" ON storage.objects;
CREATE POLICY "storage_cosmetics_admin_write"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'cosmetics' AND public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "storage_cosmetics_admin_update" ON storage.objects;
CREATE POLICY "storage_cosmetics_admin_update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'cosmetics' AND public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "storage_support_select_own" ON storage.objects;
CREATE POLICY "storage_support_select_own"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'support-attachments'
    AND (
      public.has_role(auth.uid(), 'admin')
      OR (storage.foldername(name))[1] = auth.uid()::text
    )
  );

DROP POLICY IF EXISTS "storage_support_insert_own" ON storage.objects;
CREATE POLICY "storage_support_insert_own"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'support-attachments'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ─── Seed default cosmetics (idempotent) ───────────────────────────────────────
INSERT INTO public.cosmetic_items (type, name, image_url, unlock_type)
SELECT 'avatar'::public.cosmetic_item_type, 'Starter', '/marketing-campaign-banner-fallback.svg', 'default'::public.cosmetic_unlock_type
WHERE NOT EXISTS (
  SELECT 1 FROM public.cosmetic_items ci
  WHERE ci.type = 'avatar' AND ci.name = 'Starter' AND ci.unlock_type = 'default'
);

INSERT INTO public.cosmetic_items (type, name, image_url, unlock_type)
SELECT 'banner'::public.cosmetic_item_type, 'Starter Strip', '/marketing-campaign-banner-fallback.svg', 'default'::public.cosmetic_unlock_type
WHERE NOT EXISTS (
  SELECT 1 FROM public.cosmetic_items ci
  WHERE ci.type = 'banner' AND ci.name = 'Starter Strip' AND ci.unlock_type = 'default'
);
-- ---------- END 006 ----------
