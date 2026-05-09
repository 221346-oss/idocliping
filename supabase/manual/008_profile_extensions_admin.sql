-- Profile bio, public slug, admin moderation flag

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS bio text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS profile_slug text,
  ADD COLUMN IF NOT EXISTS profile_hidden boolean NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_profile_slug_lower_idx ON public.profiles (lower(trim(profile_slug)))
  WHERE profile_slug IS NOT NULL AND trim(profile_slug) <> '';

CREATE INDEX IF NOT EXISTS profiles_profile_hidden_idx ON public.profiles (profile_hidden);

-- Admins may update moderation fields on any profile
DROP POLICY IF EXISTS "profiles_update_admin" ON public.profiles;
CREATE POLICY "profiles_update_admin"
  ON public.profiles FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
