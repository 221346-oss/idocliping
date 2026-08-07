import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

/** Stable key sent to the backend (`cookie_preferences.browser_key`). */
const BROWSER_KEY_STORAGE = "iclip_cookie_browser_key";
const LEGACY_COOKIE_CONSENT_KEY = "iclip_cookie_consent";
const LEGACY_COOKIE_PREFS_KEY = "iclip_cookie_preferences";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function getOrCreateBrowserKey(): string {
  try {
    let k = localStorage.getItem(BROWSER_KEY_STORAGE);
    if (!k || !UUID_RE.test(k)) {
      k = crypto.randomUUID();
      localStorage.setItem(BROWSER_KEY_STORAGE, k);
    }
    return k;
  } catch {
    return crypto.randomUUID();
  }
}

async function fetchConsentRow(browserKey: string) {
  const { data, error } = await (supabase as any).rpc("get_cookie_preferences", {
    p_browser_key: browserKey,
  });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : null;
  return row as
    | { consent_accepted?: boolean; analytics_enabled?: boolean; marketing_enabled?: boolean }
    | null;
}

async function persistConsent(
  browserKey: string,
  consentAccepted: boolean,
  analytics: boolean,
  marketing: boolean,
) {
  const { error } = await (supabase as any).rpc("upsert_cookie_preferences", {
    p_browser_key: browserKey,
    p_consent_accepted: consentAccepted,
    p_analytics: analytics,
    p_marketing: marketing,
  });
  if (error) throw error;
}

export function CookieConsent() {
  const { toast } = useToast();
  const [hydrated, setHydrated] = useState(false);
  const [hasConsent, setHasConsent] = useState(false);
  const [prefsOpen, setPrefsOpen] = useState(false);
  const [analyticsOn, setAnalyticsOn] = useState(false);
  const [marketingOn, setMarketingOn] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const browserKey = getOrCreateBrowserKey();
        const row = await fetchConsentRow(browserKey);

        if (!cancelled && row?.consent_accepted) {
          setHasConsent(true);
          setAnalyticsOn(!!row.analytics_enabled);
          setMarketingOn(!!row.marketing_enabled);
          return;
        }

        if (!cancelled && localStorage.getItem(LEGACY_COOKIE_CONSENT_KEY) === "accepted") {
          let analytics = true;
          let marketing = true;
          try {
            const raw = localStorage.getItem(LEGACY_COOKIE_PREFS_KEY);
            if (raw) {
              const p = JSON.parse(raw) as { analytics?: boolean; marketing?: boolean };
              analytics = !!p.analytics;
              marketing = !!p.marketing;
            }
          } catch {
            /* keep defaults */
          }
          await persistConsent(browserKey, true, analytics, marketing);
          localStorage.removeItem(LEGACY_COOKIE_CONSENT_KEY);
          localStorage.removeItem(LEGACY_COOKIE_PREFS_KEY);
          if (!cancelled) {
            setHasConsent(true);
            setAnalyticsOn(analytics);
            setMarketingOn(marketing);
          }
        }
      } catch (e) {
        console.error("Cookie consent load failed", e);
      } finally {
        if (!cancelled) setHydrated(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const openPrefs = async () => {
    try {
      const row = await fetchConsentRow(getOrCreateBrowserKey());
      setAnalyticsOn(!!row?.analytics_enabled);
      setMarketingOn(!!row?.marketing_enabled);
    } catch {
      setAnalyticsOn(false);
      setMarketingOn(false);
    }
    setPrefsOpen(true);
  };

  const save = async (analytics: boolean, marketing: boolean) => {
    setSaving(true);
    try {
      await persistConsent(getOrCreateBrowserKey(), true, analytics, marketing);
      setAnalyticsOn(analytics);
      setMarketingOn(marketing);
      setHasConsent(true);
      setPrefsOpen(false);
    } catch (e) {
      console.error(e);
      toast({ title: "Could not save preferences", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (!hydrated || hasConsent) return null;

  return (
    <>
      <div className="fixed inset-x-0 bottom-0 z-[60] border-t border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p className="max-w-[720px] text-[13px] text-muted-foreground">
            We use cookies to improve your experience.
          </p>
          <div className="flex shrink-0 items-center gap-2">
            <Button onClick={() => void save(true, true)} disabled={saving}>
              Accept all
            </Button>
            <Button variant="outline" onClick={() => void openPrefs()} disabled={saving}>
              Manage
            </Button>
          </div>
        </div>
      </div>

      {prefsOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-background p-6 shadow-lg">
            <h2 className="text-center text-[16px] font-semibold">Cookie preferences</h2>
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between gap-4">
                <Label className="text-[13px]">Necessary</Label>
                <Switch checked disabled />
              </div>
              <div className="flex items-center justify-between gap-4">
                <Label className="text-[13px]">Analytics</Label>
                <Switch checked={analyticsOn} onCheckedChange={setAnalyticsOn} />
              </div>
              <div className="flex items-center justify-between gap-4">
                <Label className="text-[13px]">Marketing</Label>
                <Switch checked={marketingOn} onCheckedChange={setMarketingOn} />
              </div>
            </div>
            <Button className="mt-5 w-full" onClick={() => void save(analyticsOn, marketingOn)} disabled={saving}>
              Save preferences
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
