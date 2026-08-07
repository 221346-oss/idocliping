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
import { ArtworkBackground, ThemeArtwork } from "@/components/media/ThemeArtwork";
import { TrendingRail } from "@/components/landing/TrendingRail";
const heroShowcaseAssetUrl = "/hero-showcase.png";

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

const TRENDING_MOCK: { id: string; title: string; budget: number; usedPct: number; bg: string }[] = [
  { id: "t1", title: "Pathos [CLIPPING]", budget: 3000, usedPct: 17, bg: "linear-gradient(135deg,#1a0808,#3a1010)" },
  { id: "t2", title: "Sienna Spiro – Material Lover", budget: 2500, usedPct: 20, bg: "linear-gradient(135deg,#1a0a1e,#4a1040)" },
  { id: "t3", title: "Duel.com [CLIPPING] 2", budget: 4000, usedPct: 42, bg: "linear-gradient(135deg,#0a1020,#1a3060)" },
  { id: "t4", title: "White Noise [EDITS]", budget: 5620, usedPct: 60, bg: "linear-gradient(135deg,#101020,#202040)" },
  { id: "t5", title: "OneState [GERMANY]", budget: 2625, usedPct: 0, bg: "linear-gradient(135deg,#0a1808,#1a3810)" },
  { id: "t6", title: "Cicada [ANIME]", budget: 1250, usedPct: 22, bg: "linear-gradient(135deg,#080818,#181840)" },
  { id: "t7", title: "WoT Heat [CLIPPING]", budget: 4785, usedPct: 12, bg: "linear-gradient(135deg,#141008,#281e10)" },
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
  const trendingFadeRef = useRef<HTMLDivElement>(null);
  const howItWorksFadeRef = useRef<HTMLDivElement>(null);
  const testimonialFadeRef = useRef<HTMLDivElement>(null);
  const ctaFadeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    lastScrollYRef.current = typeof window !== "undefined" ? window.scrollY : 0;
    const onScroll = () => {
      const y = window.scrollY;
      const prev = lastScrollYRef.current;
      const winH = window.innerHeight;
      
      /** 
       * Unified fade logic:
       * - entryPoint: distance from bottom of screen where fade-in starts.
       * - exitPoint: distance from top of screen where fade-out starts.
       */
      const entryPoint = winH * 0.85; 
      const exitPoint = 150;
      const fadeDist = 450; 

      const updateOpacity = (el: HTMLElement | null) => {
        if (!el) return;
        const rect = el.getBoundingClientRect();
        let opacity = 1;

        if (rect.top > entryPoint) {
          /** Entering from bottom (scrolling down) or leaving to bottom (scrolling up) */
          opacity = Math.max(0, 1 - (rect.top - entryPoint) / fadeDist);
        } else if (rect.bottom < exitPoint) {
          /** Leaving to top (scrolling down) or entering from top (scrolling up) */
          opacity = Math.max(0, rect.bottom / exitPoint);
        }
        el.style.opacity = String(opacity);
      };

      /** Apply to all tracked sections */
      updateOpacity(heroScrollFadeRef.current);
      updateOpacity(trendingFadeRef.current);
      updateOpacity(howItWorksFadeRef.current);
      updateOpacity(testimonialFadeRef.current);
      updateOpacity(ctaFadeRef.current);

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
          className="relative will-change-[opacity] transition-opacity duration-1000 ease-out"
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
            {/* Top section: artwork background (no foreground art on mobile) */}
            <div aria-hidden className="pointer-events-none absolute inset-0 -z-[1]">
              <ArtworkBackground priority />
              <div
                className={cn(
                  "absolute inset-0",
                  isDark
                    ? "bg-gradient-to-b from-black/80 via-black/70 to-black lg:from-black/70 lg:via-black/55 lg:to-black/85"
                    : "bg-gradient-to-b from-white/80 via-white/70 to-white lg:from-white/70 lg:via-white/55 lg:to-white/85",
                )}
              />
            </div>


            <div className="mx-auto flex max-w-[1160px] min-h-[calc(100svh-env(safe-area-inset-bottom,0px)-4.5rem)] flex-col justify-center gap-10 text-center max-lg:-mt-1 lg:min-h-0 lg:flex-row lg:items-center lg:justify-center lg:gap-10 lg:text-left">
              <div className="relative z-[1] flex min-w-0 max-w-xl flex-shrink-0 flex-col items-center lg:max-w-[40%] lg:items-start">
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

              <div className="relative hidden w-[50%] max-w-full shrink-0 lg:flex lg:justify-end">
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
        {/* End Hero fade wrapper */}

        {/* 2 · Live campaigns — auto-sliding glass rail on the theme artwork */}
        <div ref={trendingFadeRef} className="will-change-[opacity] transition-opacity duration-1000">
          <TrendingRail />
        </div>

        {/* 3 · How iclips works (artwork) */}
        <section id="how" className="relative z-10 px-4 py-12 sm:px-6 sm:py-20">
          <div
            ref={howItWorksFadeRef}
            className="mx-auto w-full max-w-[1200px] will-change-[opacity] transition-opacity duration-1000"
          >
            <ThemeArtwork
              set="how"
              alt="How iClips works: link your accounts, post your clips, get paid"
              sizes="(min-width: 1280px) 1200px, 100vw"
              imgClassName="h-auto w-full object-contain"
            />
          </div>
        </section>



        {/* 7 · Testimonial */}
        <section className={cn("relative z-10 overflow-hidden px-4 py-14 sm:px-6 md:py-20", isDark ? "bg-black" : "bg-zinc-100")}>
          <div 
            ref={testimonialFadeRef}
            className="mx-auto max-w-[800px] text-center will-change-[opacity] transition-opacity duration-1000"
          >
            <span className="pointer-events-none font-sans text-[clamp(3.5rem,12vw,6rem)] font-black leading-none" style={{ color: HOT_PINK }}>
              “
            </span>
            <blockquote className={cn("-mt-4 font-sans text-[clamp(1.25rem,3vw,1.75rem)] font-medium leading-snug", isDark ? "text-white/95" : "text-zinc-900")}>
              iclips changed the game. One post. Real payout. That&apos;s creator power.
            </blockquote>
          </div>
        </section>

        {/* 8 · CTA */}
        <section className={cn("relative z-10 px-4 py-16 sm:px-6 sm:py-20", isDark ? "bg-black text-white" : "bg-white text-zinc-950")}>
          <div 
            ref={ctaFadeRef}
            className="mx-auto max-w-[640px] text-center font-sans will-change-[opacity] transition-opacity duration-1000"
          >
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
        {/* End Theme background wrapper */}
      </div >

      {/* Cookie consent banner */}
      {
        consentHydrated && !hasConsent && (
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
        )
      }

      {/* Cookie preferences modal */}
      {
        prefsOpen && !hasConsent && consentHydrated && (
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
        )
      }
    </div >
  );
};

export default Landing;
