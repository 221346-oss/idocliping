-- Run manually in Supabase SQL Editor (Dashboard → SQL).
--
-- Persists landing-page cookie consent + preference toggles in Postgres (not browser-only).
-- Anonymous visitors are keyed by a stable UUID the app stores in localStorage as `iclip_cookie_browser_key`.
--
-- Access model: the table has **no direct SELECT/INSERT for anon** — only SECURITY DEFINER RPCs
-- scoped by `browser_key`, so rows are not enumerable without guessing UUIDs.

CREATE TABLE IF NOT EXISTS public.cookie_preferences (
  browser_key uuid PRIMARY KEY,
  consent_accepted boolean NOT NULL DEFAULT false,
  analytics_enabled boolean NOT NULL DEFAULT false,
  marketing_enabled boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.cookie_preferences IS 'Per-browser cookie consent (landing); keyed by client-held UUID.';

ALTER TABLE public.cookie_preferences ENABLE ROW LEVEL SECURITY;

-- No policies: deny direct table access from PostgREST for anon/authenticated.

REVOKE ALL ON public.cookie_preferences FROM PUBLIC;
GRANT ALL ON public.cookie_preferences TO postgres;
GRANT ALL ON public.cookie_preferences TO service_role;

CREATE OR REPLACE FUNCTION public.get_cookie_preferences(p_browser_key uuid)
RETURNS TABLE (
  consent_accepted boolean,
  analytics_enabled boolean,
  marketing_enabled boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.consent_accepted, c.analytics_enabled, c.marketing_enabled
  FROM public.cookie_preferences c
  WHERE c.browser_key = p_browser_key;
$$;

CREATE OR REPLACE FUNCTION public.upsert_cookie_preferences(
  p_browser_key uuid,
  p_consent_accepted boolean,
  p_analytics boolean,
  p_marketing boolean
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO public.cookie_preferences (
    browser_key,
    consent_accepted,
    analytics_enabled,
    marketing_enabled
  )
  VALUES (
    p_browser_key,
    p_consent_accepted,
    p_analytics,
    p_marketing
  )
  ON CONFLICT (browser_key) DO UPDATE SET
    consent_accepted = EXCLUDED.consent_accepted,
    analytics_enabled = EXCLUDED.analytics_enabled,
    marketing_enabled = EXCLUDED.marketing_enabled,
    updated_at = now();
$$;

GRANT EXECUTE ON FUNCTION public.get_cookie_preferences(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_cookie_preferences(uuid, boolean, boolean, boolean) TO anon, authenticated;
