import { Link } from "react-router-dom";
import {
  ArrowRight,
  Check,
  Coffee,
  Cpu,
  Crown,
  DollarSign,
  Gamepad2,
  Instagram,
  Moon,
  MoreHorizontal,
  Music,
  Scissors,
  Sparkles,
  Sun,
  Twitter,
  Upload,
  Zap,
  Youtube,
} from "lucide-react";
import testimonialAvatarAsset from "@/assets/testimonial-avatar.jpg.asset.json";
import heroShowcaseAssetUrl from "@/assets/ChatGPT Image May 11, 2026, 02_07_36 AM.PNG?url";
import { useTheme } from "next-themes";
import { useEffect, useRef, useState } from "react";

import { StackedLogo } from "@/components/StackedLogo";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

/** Stable key sent to Supabase (`cookie_preferences.browser_key`). Old builds used consent-only localStorage keys below — migrated once. */
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
  return row as { consent_accepted?: boolean; analytics_enabled?: boolean; marketing_enabled?: boolean } | null;
}

const HERO_BG = "/marketing-campaign-banner-fallback.svg";

const TRENDING_MOCK: { id: string; title: string; budget: number; usedPct: number; thumb?: string }[] = [
  { id: "t1", title: "Pathos [CLIPPING]", budget: 3000, usedPct: 17 },
  { id: "t2", title: "Vault of Clips", budget: 12000, usedPct: 42 },
  { id: "t3", title: "Dual.com × Clips", budget: 8500, usedPct: 63 },
  { id: "t4", title: "Legacy Pack Collab", budget: 5000, usedPct: 9 },
  { id: "t5", title: "Neon Nights UGC", budget: 2200, usedPct: 55 },
];

async function persistConsentToSupabase(
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

const Landing = () => {
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const [consentHydrated, setConsentHydrated] = useState(false);
  const [hasConsent, setHasConsent] = useState(false);
  const [prefsOpen, setPrefsOpen] = useState(false);
  const [analyticsOn, setAnalyticsOn] = useState(false);
  const [marketingOn, setMarketingOn] = useState(false);
  const [consentSaving, setConsentSaving] = useState(false);
  /** Landing-only nav hide on scroll down, show on scroll up (buttons only — no bar background). */
  const [landingNavHidden, setLandingNavHidden] = useState(false);
  const lastScrollYRef = useRef(0);
  /** Hero copy + art fade on scroll (nav stays fully opaque). */
  const heroScrollFadeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    lastScrollYRef.current = typeof window !== "undefined" ? window.scrollY : 0;
    const onScroll = () => {
      const y = window.scrollY;
      const prev = lastScrollYRef.current;

      const fadeEl = heroScrollFadeRef.current;
      if (fadeEl) {
        const h = fadeEl.offsetHeight || 520;
        /** Longer fade range = hero stays visible longer while scrolling into section 2 */
        const fadeRange = Math.max(320, Math.min(h * 1.05, 720));
        const o = Math.max(0, Math.min(1, 1 - y / fadeRange));
        fadeEl.style.opacity = String(o);
      }

      if (y < 48) setLandingNavHidden(false);
      else if (y > prev + 8) setLandingNavHidden(true);
      else if (y < prev - 8) setLandingNavHidden(false);
      lastScrollYRef.current = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    onScroll();
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

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

        // One-time migration from older localStorage-only keys
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
          await persistConsentToSupabase(browserKey, true, analytics, marketing);
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
        if (!cancelled) {
          toast({
            title: "Could not load cookie preferences",
            description: "Run supabase/manual/004_cookie_preferences.sql in Supabase. Banner may reappear until fixed.",
            variant: "destructive",
          });
        }
      } finally {
        if (!cancelled) setConsentHydrated(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [toast]);

  const openPrefs = async () => {
    try {
      const browserKey = getOrCreateBrowserKey();
      const row = await fetchConsentRow(browserKey);
      if (row) {
        setAnalyticsOn(!!row.analytics_enabled);
        setMarketingOn(!!row.marketing_enabled);
      } else {
        setAnalyticsOn(false);
        setMarketingOn(false);
      }
    } catch {
      setAnalyticsOn(false);
      setMarketingOn(false);
    }
    setPrefsOpen(true);
  };

  const acceptAll = async () => {
    setConsentSaving(true);
    try {
      const browserKey = getOrCreateBrowserKey();
      await persistConsentToSupabase(browserKey, true, true, true);
      setAnalyticsOn(true);
      setMarketingOn(true);
      setHasConsent(true);
      setPrefsOpen(false);
    } catch (e) {
      console.error(e);
      toast({
        title: "Could not save consent",
        description: "Run supabase/manual/004_cookie_preferences.sql and try again.",
        variant: "destructive",
      });
    } finally {
      setConsentSaving(false);
    }
  };

  const savePrefs = async () => {
    setConsentSaving(true);
    try {
      const browserKey = getOrCreateBrowserKey();
      await persistConsentToSupabase(browserKey, true, analyticsOn, marketingOn);
      setHasConsent(true);
      setPrefsOpen(false);
    } catch (e) {
      console.error(e);
      toast({
        title: "Could not save preferences",
        description: "Run supabase/manual/004_cookie_preferences.sql and try again.",
        variant: "destructive",
      });
    } finally {
      setConsentSaving(false);
    }
  };

  const isDark = theme === "dark";
  const diagonalLineColor = isDark ? "hsl(0 0% 26%)" : "hsl(0 0% 80%)";

  /** Hero + nav use `theme` (not Tailwind `dark:` only) so the hero asset + copy stay cohesive in light and dark. */
  const LIME = "#A3E635";
  const HOT_PINK = "#F43F5E";

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden pb-24">
      <div className={cn("relative overflow-hidden", isDark ? "bg-black text-white" : "bg-zinc-50 text-zinc-950")}>
        <nav
          className={cn(
            "fixed top-0 z-50 w-full bg-transparent px-4 pt-2 transition-[transform,opacity] duration-300 ease-out md:px-6 md:pt-3",
            landingNavHidden ? "-translate-y-[calc(100%+12px)] opacity-0 pointer-events-none" : "translate-y-0 opacity-100",
          )}
        >
          <div className="mx-auto flex min-h-[44px] max-w-[1200px] items-center justify-between gap-2 md:min-h-[48px]">
            <Link to="/" className="flex items-center gap-2.5 shrink-0 min-w-0">
              <img src="/favicon.ico" alt="" width={32} height={32} className="h-8 w-8 rounded-md object-cover ring-1 ring-white/15" />
              <span className={cn("text-[15px] font-semibold tracking-tight truncate lowercase", isDark ? "text-white" : "text-zinc-900")}>
                iclips
              </span>
            </Link>
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <button
                type="button"
                title="Toggle light / dark appearance"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className={cn(
                  "relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full shadow-sm backdrop-blur-sm transition-colors",
                  isDark
                    ? "border border-white/25 bg-black/35 text-white hover:bg-white/10"
                    : "border border-zinc-300/90 bg-white/70 text-zinc-800 hover:bg-white",
                )}
              >
                <Sun className="absolute h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              </button>
              <Link to="/auth">
                <span
                  className={cn(
                    "rounded-full px-3 py-2 text-[12px] font-semibold whitespace-nowrap shadow-sm backdrop-blur-sm sm:px-3.5 sm:text-[13px]",
                    "border transition-colors",
                    isDark
                      ? "border-white/35 bg-black/35 text-white hover:bg-white/[0.1]"
                      : "border-zinc-800/90 bg-white/75 text-zinc-900 hover:bg-white",
                  )}
                >
                  <span className="hidden sm:inline">Launch campaign</span>
                  <span className="sm:hidden">Launch</span>
                </span>
              </Link>
              <Link to="/auth">
                <span
                  className="inline-flex rounded-full px-3 py-2 text-[11px] font-semibold whitespace-nowrap text-white shadow-md transition-[filter] hover:brightness-110 sm:px-4 sm:text-[13px]"
                  style={{ backgroundColor: HOT_PINK }}
                >
                  <span className="hidden sm:inline">Join as creator</span>
                  <span className="sm:hidden">Join</span>
                </span>
              </Link>
            </div>
          </div>
        </nav>

        <div
          ref={heroScrollFadeRef}
          className="relative will-change-[opacity] transition-opacity duration-500 ease-out"
          style={{ opacity: 1 }}
        >
          <div
            aria-hidden
            className={cn(
              "pointer-events-none absolute inset-0 opacity-[0.06] hidden lg:block",
              "[background-image:radial-gradient(circle_at_20%_20%,white_0.5px,transparent_0)] [background-size:4px_4px]",
              isDark ? "mix-blend-screen" : "mix-blend-multiply opacity-[0.12]",
            )}
          />

          <section className="relative z-10 isolate px-4 pb-5 pt-[3.25rem] sm:px-6 sm:pb-6 sm:pt-[3.35rem] lg:min-h-0 lg:px-8 lg:pb-5 lg:pt-[3.25rem]">
            {/* Mobile: full-bleed hero art + gradient; copy vertically centered */}
            <div aria-hidden className="pointer-events-none absolute inset-0 -z-[1] lg:hidden">
              <img
                src={heroShowcaseAssetUrl}
                alt=""
                className="h-full w-full scale-105 object-cover object-[50%_32%]"
                decoding="async"
              />
              <div
                className={cn(
                  "absolute inset-0",
                  isDark ? "bg-gradient-to-b from-black/92 via-black/78 to-black" : "bg-gradient-to-b from-zinc-50/94 via-white/82 to-white",
                )}
              />
              <div className={cn(
                "absolute inset-0 opacity-[0.07] lg:hidden",
                "[background-image:radial-gradient(circle_at_30%_20%,white_0.5px,transparent_0)] [background-size:4px_4px]",
              )} />
            </div>

            <div className="mx-auto flex max-w-[1160px] min-h-[calc(100svh-env(safe-area-inset-bottom,0px)-4.5rem)] flex-col justify-center gap-10 text-center max-lg:-mt-1 lg:min-h-0 lg:flex-row lg:items-center lg:justify-center lg:gap-10 lg:text-left">
              <div className="relative z-[1] flex min-w-0 max-w-xl flex-shrink-0 flex-col items-center lg:max-w-[min(440px,calc(100%-24px))] lg:items-start">
                <h1 className={cn(
                  "relative font-marker uppercase tracking-[0.03em] text-[clamp(1.95rem,7vw,3.75rem)] leading-[0.98]",
                  "max-lg:drop-shadow-[0_2px_24px_rgba(0,0,0,0.65)]",
                  "lg:drop-shadow-[0_1px_0_rgba(0,0,0,0.25)]",
                )}
                >
                  <span className="relative mx-auto inline-block lg:mx-0">
                    <Crown className="pointer-events-none absolute -top-8 right-[-20%] h-10 w-10 opacity-95 sm:right-[-16%] lg:h-11 lg:w-11" strokeWidth={1.35} style={{ color: LIME }} aria-hidden />
                    <span className={isDark ? "text-white" : "text-zinc-950"}>Create.</span>
                  </span>
                  <span className="mt-1 block" style={{ color: LIME }}>
                    Post.
                  </span>
                  <span className="mt-1 block" style={{ color: HOT_PINK }}>
                    Get paid.
                  </span>
                </h1>

                <p
                  className={cn(
                    "mx-auto mt-4 max-w-md text-[14px] leading-relaxed sm:text-[15px] lg:mx-0 font-sans",
                    isDark ? "text-neutral-200 max-lg:text-neutral-100" : "text-zinc-600 max-lg:text-zinc-800",
                  )}
                >
                  {isDark ? (
                    <>
                      Turn your content into real income.
                      <br />
                      Join 100K+ creators on iclips.
                    </>
                  ) : (
                    <>
                      Join 100K+ creators on iclips.
                      <br />
                      Real content. Real views. Real income.
                    </>
                  )}
                </p>

                <div className="mx-auto mt-6 flex flex-col items-stretch gap-3 sm:mt-7 sm:flex-row sm:flex-wrap sm:justify-center lg:mx-0 lg:justify-end">
                  <Link to="/auth" className="inline-flex justify-center lg:justify-end">
                    <span
                      className="inline-flex items-center gap-2 rounded-full py-3 pl-6 pr-2 font-semibold text-black shadow-none transition-colors hover:brightness-110"
                      style={{ backgroundColor: LIME }}
                    >
                      Start earning
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-black text-white shadow-inner">
                        <ArrowRight className="h-3.5 w-3.5 shrink-0" aria-hidden />
                      </span>
                    </span>
                  </Link>
                  <Link to="/auth" className="inline-flex justify-center lg:justify-end">
                    <span
                      className={cn(
                        "inline-flex items-center gap-2 rounded-full border px-6 py-3 text-[13px] font-semibold transition-colors sm:text-[14px]",
                        isDark
                          ? "border-white/80 text-white hover:bg-white/[0.08] max-lg:border-white/60 max-lg:bg-black/25 max-lg:backdrop-blur-sm"
                          : "border-zinc-900 text-zinc-900 hover:bg-zinc-200/50 max-lg:bg-white/60 max-lg:backdrop-blur-sm",
                      )}
                    >
                      Launch a campaign
                      <Sparkles className="h-4 w-4 opacity-90" aria-hidden />
                    </span>
                  </Link>
                </div>
              </div>

              <div className="relative hidden w-[min(100%,520px)] max-w-full shrink-0 lg:flex lg:justify-end">
                <div className="relative w-full">
                  <img
                    src={heroShowcaseAssetUrl}
                    alt=""
                    decoding="async"
                    fetchPriority="high"
                    className={cn(
                      "relative z-[1] w-full select-none object-contain object-right pointer-events-none motion-safe:animate-float",
                      isDark ? "drop-shadow-[0_24px_48px_rgb(0,0,0,0.45)]" : "drop-shadow-[0_18px_40px_rgb(0,0,0,0.15)]",
                    )}
                  />
                  {!isDark && (
                    <div className="pointer-events-none absolute inset-0 rounded-3xl bg-gradient-to-tr from-transparent via-transparent to-white/35" />
                  )}
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* 2 · Trending campaigns */}
      <section className={cn("relative z-10 px-4 py-10 sm:px-6 sm:pb-11", "bg-neutral-950 text-white")}>
        <div className="mx-auto max-w-[1200px]">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 font-sans">
              <Zap className="h-5 w-5 shrink-0" strokeWidth={1.85} style={{ color: LIME }} aria-hidden />
              <h2 className="text-[15px] font-semibold tracking-tight md:text-[16px]">Trending campaigns</h2>
            </div>
            <Link to="/auth" className="group flex items-center gap-1 whitespace-nowrap text-[12px] font-medium text-white/85 hover:text-white">
              View all <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] snap-x snap-mandatory md:gap-4 [&::-webkit-scrollbar]:hidden">
            {TRENDING_MOCK.map((c) => (
              <article
                key={c.id}
                className="w-[208px] shrink-0 snap-start overflow-hidden rounded-xl border border-white/12 bg-[#151515]"
              >
                <div className="aspect-square border-b border-white/10">
                  <img src={HERO_BG} alt="" className="h-full w-full object-cover opacity-90" />
                </div>
                <div className="space-y-2 p-3">
                  <p className="line-clamp-2 min-h-[2.5rem] font-sans text-[12px] font-semibold leading-snug">{c.title}</p>
                  <p className="font-sans text-[14px] font-bold tabular-nums">${c.budget.toLocaleString()}</p>
                  <div className="h-1 w-full rounded-full bg-white/10">
                    <div className="h-full rounded-full" style={{ width: `${c.usedPct}%`, backgroundColor: LIME }} />
                  </div>
                  <p className="font-sans text-[10px] font-medium uppercase tracking-wide" style={{ color: LIME }}>
                    {c.usedPct}% used
                  </p>
                </div>
              </article>
            ))}
            <div className="flex w-[200px] shrink-0 snap-center flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-white/25 bg-black/40 p-4 text-center font-sans">
              <span className="flex h-12 w-12 items-center justify-center rounded-full border border-white/20 text-2xl font-light text-white/80">+</span>
              <p className="text-[12px] font-medium leading-snug text-white/85">300+ campaigns active now</p>
            </div>
          </div>
        </div>
      </section>

      {/* 3 · How iclips works */}
      <section id="how" className={cn("relative z-10 px-4 py-11 sm:px-6 sm:py-12", isDark ? "bg-black text-white" : "bg-white text-zinc-950")}>
        <div className={cn("mx-auto w-full max-w-[1040px] rounded-[2rem] border-2 px-5 py-7 font-sans sm:p-9 md:p-10", isDark ? "border-[#CCFF3366] bg-[#090909] shadow-[0_0_36px_-10px_rgba(163,230,53,0.45)]" : "border-[#A3E635]/85 bg-zinc-50 shadow-[0_0_28px_-12px_rgba(163,230,53,0.42)]")}>
          <h3 className="text-center font-sans text-[clamp(1.2rem,2.35vw,1.65rem)] font-bold tracking-tight">
            How <span className="relative inline-block"><span className="relative z-[1]">iclips</span><span className="absolute bottom-0 left-0 right-0 h-[3px] rounded-full opacity-90" style={{ backgroundColor: LIME }} aria-hidden /></span> works
          </h3>
          <p className="mx-auto mt-2 max-w-md px-2 text-center text-[12px] leading-snug text-muted-foreground dark:text-neutral-500">Clip, post, and earn — built for short-form performance.</p>

          <div className="mt-8 grid max-w-[980px] gap-8 lg:mx-auto lg:mt-10 lg:grid-cols-3 lg:gap-6">
            {[
              {
                n: 1,
                title: "Clip",
                desc: "Create short clips that hit hard.",
                body: (
                  <div className={cn("mt-4 space-y-2 rounded-xl border p-3", isDark ? "border-white/12 bg-black/40" : "border-zinc-200 bg-white")}>
                    <div className="relative aspect-video overflow-hidden rounded-lg bg-zinc-900">
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10">
                          <span className="ml-0.5 h-0 w-0 border-y-[7px] border-y-transparent border-l-[12px] border-l-white" aria-hidden />
                        </div>
                      </div>
                      <div className="absolute bottom-2 left-2 right-2 h-1 rounded-full bg-white/15">
                        <div className="h-full w-1/3 rounded-full bg-[#F43F5E]/90" />
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                      <Scissors className="h-3.5 w-3.5 shrink-0" style={{ color: LIME }} aria-hidden />
                      <span>Trim · preview · export</span>
                    </div>
                  </div>
                ),
              },
              {
                n: 2,
                title: "Post",
                desc: "Share to iclips in seconds.",
                body: (
                  <div className={cn("mt-4 space-y-3 rounded-xl border p-4 text-center", isDark ? "border-white/12 bg-black/40" : "border-zinc-200 bg-white")}>
                    <Upload className="mx-auto h-8 w-8 text-muted-foreground" strokeWidth={1.25} aria-hidden />
                    <p className="text-[11px] font-medium text-foreground/90">Drop your clip here or paste a link</p>
                    <div className="flex justify-center gap-2 pt-1">
                      {["TT", "IG", "YT"].map((x) => (
                        <span key={x} className={cn("rounded-md border px-2 py-1 text-[10px] font-semibold", isDark ? "border-white/15 bg-white/5" : "border-zinc-200 bg-zinc-100")}>
                          {x}
                        </span>
                      ))}
                    </div>
                  </div>
                ),
              },
              {
                n: 3,
                title: "Earn",
                desc: "Get paid when your content performs.",
                body: (
                  <div className={cn("mt-4 space-y-3 rounded-xl border p-4", isDark ? "border-white/12 bg-black/40" : "border-zinc-200 bg-white")}>
                    <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">My balance</p>
                    <p className="text-2xl font-bold tabular-nums tracking-tight">$8,512.71</p>
                    <button type="button" className="w-full rounded-lg py-2.5 text-[12px] font-semibold text-black transition-[filter] hover:brightness-110" style={{ backgroundColor: LIME }}>
                      Withdraw earnings
                    </button>
                  </div>
                ),
              },
            ].map((step) => (
              <div key={step.title} className="relative mx-auto flex w-full max-w-[300px] flex-col sm:max-w-[310px] lg:mx-auto lg:w-full lg:max-w-none">
                <div className="flex items-start gap-3 lg:flex-col lg:items-center lg:gap-2 lg:text-center">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[13px] font-black text-black lg:mx-auto" style={{ backgroundColor: LIME }}>
                    {step.n}
                  </span>
                  <div className="min-w-0 lg:max-w-[280px]">
                    <p className="font-sans text-[15px] font-bold">{step.title}</p>
                    <p className="mt-1 text-[13px] leading-snug opacity-85">{step.desc}</p>
                  </div>
                </div>
                <div className="w-full lg:flex lg:justify-center">{step.body}</div>
              </div>
            ))}
          </div>

          <div className="mt-9 flex justify-center sm:mt-10">
            <Link
              to="/auth"
              className="inline-flex items-center gap-2 rounded-full px-8 py-3.5 font-sans text-[14px] font-bold text-white shadow-lg transition-[filter] hover:brightness-110 sm:text-[15px]"
              style={{ backgroundColor: HOT_PINK }}
            >
              Start earning now
              <ArrowRight className="h-4 w-4 shrink-0" aria-hidden />
            </Link>
          </div>
        </div>
      </section>

      {/* 4 · Made for every creator */}
      <section className={cn("relative z-10 overflow-hidden px-4 py-10 sm:px-6 sm:py-12", isDark ? "bg-black text-white" : "bg-white text-zinc-950")}>
        <div className="mx-auto flex max-w-[960px] flex-col items-center text-center">
          <h2 className="font-sans text-[clamp(1.5rem,2.75vw,1.95rem)] font-bold tracking-tight">Made for every creator</h2>
          <div className="mt-7 flex flex-wrap justify-center gap-x-9 gap-y-7 sm:gap-x-11 sm:gap-y-8">
            {(
              [
                { Icon: Scissors, label: "Clipping" as const, border: LIME },
                { Icon: Gamepad2, label: "UGC" as const, border: "#22d3ee" },
                { Icon: Music, label: "Music" as const, border: HOT_PINK },
                { Icon: MoreHorizontal, label: "And more" as const, border: isDark ? "rgba(255,255,255,0.5)" : "#71717a" },
              ] as const
            ).map(({ Icon, label, border }) => (
              <div key={label} className="flex w-[72px] flex-col items-center sm:w-[76px]">
                <div className="flex h-[56px] w-[56px] items-center justify-center rounded-full border-2 bg-black/5 shadow-inner dark:bg-white/[0.04] sm:h-[60px] sm:w-[60px]" style={{ borderColor: border }}>
                  <Icon className="h-[24px] w-[24px] sm:h-[26px] sm:w-[26px]" strokeWidth={1.65} aria-hidden />
                </div>
                <span className="mt-2 font-sans text-[10px] font-semibold uppercase tracking-wide text-balance sm:text-[11px]">{label}</span>
              </div>
            ))}
          </div>
          <div className={cn("-rotate-2 font-marker mx-auto mt-9 max-w-md text-[clamp(1.45rem,3.9vw,2.5rem)] leading-[1.25] italic sm:max-w-xl")}>
            <p className={isDark ? "text-neutral-100" : "text-zinc-800"}>Your style.</p>
            <p style={{ color: LIME }} className="mt-1">
              Your content.
            </p>
            <p style={{ color: LIME }} className="relative mt-1 inline-block">
              Your income.
              <span
                aria-hidden
                className="absolute -bottom-1 left-0 h-[3px] w-[112%] max-w-none rounded-[2px] opacity-95"
                style={{
                  background: `linear-gradient(90deg, ${HOT_PINK}, ${LIME}33)`,
                }}
              />
            </p>
          </div>
          <Sparkles className="mt-5 h-8 w-8 opacity-80 sm:h-9 sm:w-9" strokeWidth={1.2} style={{ color: HOT_PINK }} aria-hidden />
        </div>
      </section>

      {/* 5 · Pick your playground */}
      <section className={cn("relative z-10 overflow-hidden px-4 pb-11 pt-8 sm:px-6 sm:pb-12", isDark ? "bg-black text-white" : "bg-zinc-50 text-zinc-950")}>
        <div className="mx-auto max-w-[980px] text-center lg:text-left">
          <p className={cn("font-sans text-[clamp(1.2rem,2.8vw,1.55rem)] font-extrabold italic tracking-tight", isDark ? "text-white" : "text-zinc-900")}>PICK YOUR</p>
          <p className="font-marker relative mt-0.5 inline-block text-[clamp(1.85rem,4.5vw,2.75rem)] uppercase leading-none italic" style={{ color: HOT_PINK }}>
            PLAYGROUND.
            <span className="absolute -bottom-0.5 left-0 right-3 h-[3px] rounded-full text-center" style={{ backgroundColor: LIME }} aria-hidden />
          </p>
        </div>
        <div className="mx-auto mt-8 flex max-w-[980px] flex-wrap justify-center gap-x-8 gap-y-7 md:justify-between lg:justify-center lg:gap-x-10">
          {(
            [
              { Icon: Sparkles, label: "Anime" as const, b: LIME },
              { Icon: Gamepad2, label: "Gaming" as const, b: "#e4e4e7" },
              { Icon: Music, label: "Music" as const, b: HOT_PINK },
              { Icon: Cpu, label: "Tech" as const, b: LIME },
              { Icon: Coffee, label: "Lifestyle" as const, b: "#facc15" },
              { Icon: DollarSign, label: "Finance" as const, b: HOT_PINK },
              { Icon: MoreHorizontal, label: "And more" as const, b: isDark ? "rgba(255,255,255,0.45)" : "#71717a" },
            ] as const
          ).map(({ Icon, label, b }) => (
            <div key={label} className="flex w-[72px] flex-col items-center gap-2">
              <div
                className={cn(
                  "flex h-[52px] w-[52px] items-center justify-center rounded-full border-2 shadow-inner",
                  isDark ? "bg-white/[0.05]" : "bg-white",
                )}
                style={{ borderColor: b }}
              >
                <Icon className="h-5 w-5" strokeWidth={1.6} aria-hidden />
              </div>
              <span className={cn("font-sans text-[10px] font-semibold uppercase tracking-wide", isDark ? "text-white/90" : "text-zinc-700")}>{label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* 6 · Growth / tools */}
      <section className="relative z-10 bg-neutral-950 px-4 py-14 text-white sm:px-6 sm:py-16">
        <div className="mx-auto grid max-w-[1100px] items-center gap-12 lg:grid-cols-2 lg:gap-14">
          <div className="font-sans text-center lg:text-left">
            <h2 className="text-[clamp(1.5rem,3.2vw,2.15rem)] font-black italic leading-tight tracking-tight">
              YOUR <span style={{ color: LIME }}>GROWTH</span>, UNFILTERED.
            </h2>
            <ul className="mx-auto mt-8 max-w-md space-y-5 text-left lg:mx-0">
              {[
                { t: "Real-time stats", d: "Track every click, view and earning live." },
                { t: "Smart matching", d: "Get matched with brands that fit your vibe." },
                { t: "Secure payouts", d: "Fast, safe and global withdrawals." },
              ].map((x) => (
                <li key={x.t} className="flex gap-3">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: `${LIME}33` }}>
                    <Check className="h-3.5 w-3.5" strokeWidth={2.5} style={{ color: LIME }} aria-hidden />
                  </span>
                  <div>
                    <p className="text-[14px] font-bold">{x.t}</p>
                    <p className="mt-1 text-[12px] leading-snug text-white/65">{x.d}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-white/12 bg-[#141414] p-5 shadow-xl">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-white/55">Overview</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {[
                { k: "Earnings", v: "$8,512.71", chip: "+12.5%" },
                { k: "Views", v: "2.4M", chip: "+8.1%" },
                { k: "Campaigns", v: "12", chip: "+2" },
              ].map((m) => (
                <div key={m.k} className="rounded-xl border border-white/10 bg-black/50 p-3">
                  <p className="text-[10px] text-white/55">{m.k}</p>
                  <p className="mt-1 text-lg font-bold tabular-nums">{m.v}</p>
                  <p className="mt-2 text-[10px] font-semibold" style={{ color: LIME }}>
                    {m.chip}
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-xl border border-white/10 bg-black/40 p-4">
              <p className="text-[11px] font-medium text-white/65">Earnings over time</p>
              <div className="mt-6 h-[100px] w-full rounded-lg bg-[linear-gradient(180deg,rgba(163,230,53,0.12)_0%,transparent_100%)]">
                <div className="h-full w-full opacity-90" style={{ background: "linear-gradient(90deg, transparent 0%, rgb(163,230,53,.45) 40%, rgb(244,63,94,.25) 100%)" }} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 7 · Testimonial */}
      <section className={cn("relative z-10 overflow-hidden px-4 py-14 sm:px-6 md:py-16", isDark ? "bg-black" : "bg-zinc-100")}>
        <div className="mx-auto grid max-w-[900px] items-center gap-10 md:grid-cols-[1fr_auto] md:gap-12">
          <div className="relative text-center md:text-left">
            <span className="pointer-events-none font-sans text-[clamp(3.5rem,12vw,6rem)] font-black leading-none" style={{ color: HOT_PINK }}>
              “
            </span>
            <blockquote className={cn("-mt-4 font-sans text-[clamp(1.15rem,2.5vw,1.45rem)] font-medium leading-snug", isDark ? "text-white/95" : "text-zinc-900")}>
              iclips changed the game. One post. Real payout. That&apos;s creator power.
            </blockquote>
          </div>
          <div className="flex flex-col items-center gap-3 sm:flex-row md:flex-col md:items-start">
            <img src={testimonialAvatarAsset.url} alt="" className="h-14 w-14 rounded-full border-2 border-white/10 object-cover" />
            <div className="text-center font-sans sm:text-left md:text-left">
              <p className="text-[14px] font-bold">@aniz_editz</p>
              <p className="text-[12px] text-muted-foreground">Anime Editor</p>
              <p className="mt-1 text-[12px] font-semibold" style={{ color: LIME }}>
                Earned $4.2K+
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 8 · CTA */}
      <section className={cn("relative z-10 px-4 py-16 sm:px-6 sm:py-20", isDark ? "bg-black text-white" : "bg-white text-zinc-950")}>
        <div className="mx-auto max-w-[640px] text-center font-sans">
          <h2 className="text-[clamp(1.65rem,3.5vw,2.35rem)] font-black italic leading-tight">
            YOUR CLIPS. <span style={{ color: LIME }}>YOUR CASH.</span>
          </h2>
          <p className="mx-auto mt-4 max-w-md text-[14px] leading-relaxed opacity-85">No gatekeeping. No fluff. Just you, your content and real rewards.</p>
          <div className="mt-8 flex justify-center">
            <Link
              to="/auth"
              className="inline-flex items-center gap-2 rounded-full px-8 py-3.5 text-[14px] font-bold text-black shadow-lg transition-[filter] hover:brightness-110"
              style={{ backgroundColor: LIME }}
            >
              Start earning now
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-black text-white">
                <ArrowRight className="h-3.5 w-3.5" aria-hidden />
              </span>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border bg-background">
        <div className="mx-auto max-w-[1200px] px-6 py-10">
          <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
            <div className="flex items-center gap-2.5">
              <img src="/favicon.ico" alt="" width={28} height={28} className="h-7 w-7 rounded-md object-cover" />
              <span className="text-[14px] font-bold tracking-tight lowercase">iclips</span>
            </div>
            <div className="grid flex-1 grid-cols-2 gap-8 sm:grid-cols-4 sm:gap-10">
              {(
                [
                  {
                    title: "Product",
                    links: [
                      { label: "How it works", href: "#how" },
                      { label: "Features", href: "#" },
                      { label: "Pricing", href: "#" },
                    ],
                  },
                  {
                    title: "Company",
                    links: [
                      { label: "About us", href: "#" },
                      { label: "Careers", href: "#" },
                      { label: "Contact", href: "#" },
                    ],
                  },
                  {
                    title: "Resources",
                    links: [
                      { label: "Help center", href: "#" },
                      { label: "Blog", href: "#" },
                      { label: "Creator guide", href: "#" },
                    ],
                  },
                  {
                    title: "Legal",
                    links: [
                      { label: "Terms of use", href: "#" },
                      { label: "Privacy policy", href: "#" },
                      { label: "Cookies", href: "#" },
                    ],
                  },
                ] as const
              ).map((col) => (
                <div key={col.title}>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{col.title}</p>
                  <ul className="mt-3 space-y-2">
                    {col.links.map((l) => (
                      <li key={l.label}>
                        <a href={l.href} className="text-[13px] text-foreground/90 hover:text-foreground hover:underline">
                          {l.label}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-border pt-6 sm:flex-row">
            <p className="text-center text-[12px] text-muted-foreground sm:text-left">© {new Date().getFullYear()} iclips. All rights reserved.</p>
            <div className="flex items-center gap-4 text-muted-foreground">
              <a href="#" aria-label="X" className="hover:text-foreground">
                <Twitter className="h-4 w-4" />
              </a>
              <a href="#" aria-label="Instagram" className="hover:text-foreground">
                <Instagram className="h-4 w-4" />
              </a>
              <a href="#" aria-label="YouTube" className="hover:text-foreground">
                <Youtube className="h-4 w-4" />
              </a>
            </div>
          </div>
        </div>
      </footer>

      {/* Cookie consent banner */}
      {consentHydrated && !hasConsent && (
        <div className="fixed bottom-0 left-0 right-0 z-[60] border-t border-border bg-background/95 backdrop-blur">
          <div className="mx-auto max-w-[1200px] px-6 py-4 flex items-center justify-between gap-4">
            <p className="text-[13px] text-muted-foreground max-w-[760px]">
              We use cookies to improve your experience. By continuing, you agree to our Cookie Policy.
            </p>
            <div className="flex items-center gap-2 shrink-0">
              <Button variant="default" onClick={() => void acceptAll()} disabled={consentSaving}>
                Accept All
              </Button>
              <Button variant="outline" onClick={() => void openPrefs()} disabled={consentSaving}>
                Manage Preferences
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Cookie preferences modal */}
      {prefsOpen && !hasConsent && consentHydrated && (
        <div
          className="fixed inset-0 z-[70] bg-black/80 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="w-full max-w-lg border border-border bg-background p-6 rounded-md shadow-lg">
            <div className="flex items-start justify-between gap-4">
              <div className="text-center flex-1">
                <div className="flex items-center justify-center">
                  <div className="text-destructive">
                    <StackedLogo size={20} />
                  </div>
                </div>
                <h2 className="mt-3 text-[16px] font-semibold text-foreground">Cookie Preferences</h2>
                <p className="mt-1 text-[13px] text-muted-foreground">
                  Choose which cookies we can use. Necessary cookies are always enabled.
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <Label className="text-[13px] font-medium">Necessary Cookies</Label>
                  <div className="text-[12px] text-muted-foreground">Required for core functionality</div>
                </div>
                <Switch checked disabled />
              </div>

              <div className="flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <Label className="text-[13px] font-medium">Analytics Cookies</Label>
                  <div className="text-[12px] text-muted-foreground">Help us understand usage</div>
                </div>
                <Switch checked={analyticsOn} onCheckedChange={setAnalyticsOn} />
              </div>

              <div className="flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <Label className="text-[13px] font-medium">Marketing Cookies</Label>
                  <div className="text-[12px] text-muted-foreground">Used for personalized offers</div>
                </div>
                <Switch checked={marketingOn} onCheckedChange={setMarketingOn} />
              </div>
            </div>

            <div className="mt-5">
              <Button className="w-full" onClick={() => void savePrefs()} disabled={consentSaving}>
                Save Preferences
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Landing;
