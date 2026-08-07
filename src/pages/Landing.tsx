import { Link } from "react-router-dom";
import { ArrowRight, Instagram, Moon, Sparkles, Sun, Twitter, Youtube } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";

import { AppShowcase } from "@/components/landing/AppShowcase";
import { CampaignMarquee } from "@/components/landing/CampaignMarquee";
import { CookieConsent } from "@/components/landing/CookieConsent";
import { Reveal } from "@/components/landing/Reveal";
import { cn } from "@/lib/utils";

const STATS = [
  { v: "100K+", l: "Creators" },
  { v: "$2.4M", l: "Paid out" },
  { v: "48h", l: "Payouts" },
];

const Landing = () => {
  const { theme, setTheme } = useTheme();
  const [navHidden, setNavHidden] = useState(false);
  const lastY = useRef(0);

  useEffect(() => {
    lastY.current = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      if (y < 48) setNavHidden(false);
      else if (y > lastY.current + 8) setNavHidden(true);
      else if (y < lastY.current - 8) setNavHidden(false);
      lastY.current = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const isDark = theme === "dark";

  return (
    <div className="min-h-screen overflow-x-hidden bg-background text-foreground">
      {/* Nav */}
      <nav
        className={cn(
          "fixed inset-x-0 top-0 z-50 px-4 pt-2 transition-[transform,opacity] duration-300 ease-out md:px-6 md:pt-3",
          navHidden ? "pointer-events-none -translate-y-[120%] opacity-0" : "translate-y-0 opacity-100",
        )}
      >
        <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-2 rounded-full border border-border bg-background/80 px-3 py-2 backdrop-blur-xl">
          <Link to="/" className="flex min-w-0 items-center gap-2">
            <img src="/favicon.ico" alt="" width={28} height={28} className="h-7 w-7 rounded-md object-cover" />
            <span className="truncate text-[15px] font-semibold lowercase tracking-tight">iclips</span>
          </Link>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              aria-label="Toggle theme"
              onClick={() => setTheme(isDark ? "light" : "dark")}
              className="icon-pill h-9 w-9"
            >
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <Link
              to="/auth"
              className="rounded-full bg-primary px-4 py-2 text-[13px] font-semibold text-primary-foreground transition-opacity press-scale hover:opacity-90"
            >
              Join
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative isolate overflow-hidden px-4 pb-14 pt-24 sm:px-6 sm:pb-20 sm:pt-32">
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-[-18%] -z-10 h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-primary/25 blur-[110px] sm:h-[620px] sm:w-[620px]"
        />
        <div className="mx-auto max-w-[820px] text-center">
          <Reveal>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-[11.5px] font-semibold text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-primary" /> Live campaigns paying now
            </span>
          </Reveal>

          <Reveal delay={80}>
            <h1 className="mt-5 font-display text-[clamp(2.4rem,10vw,4.75rem)] font-semibold uppercase leading-[0.95] tracking-tight">
              Create. Post.
              <span className="block text-primary">Get paid.</span>
            </h1>
          </Reveal>

          <Reveal delay={160}>
            <p className="mx-auto mt-4 max-w-[420px] text-[14.5px] leading-relaxed text-muted-foreground sm:text-[16px]">
              Clip it, post it, get paid per view.
            </p>
          </Reveal>

          <Reveal delay={220}>
            <div className="mt-7 flex flex-col items-stretch justify-center gap-3 sm:flex-row">
              <Link
                to="/auth"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-primary py-3.5 pl-6 pr-2 text-[15px] font-semibold text-primary-foreground transition-transform press-scale hover:scale-[1.02]"
              >
                Start earning
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-foreground text-background">
                  <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </Link>
              <Link
                to="/auth"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-border bg-card px-6 py-3.5 text-[15px] font-semibold transition-colors press-scale hover:bg-accent"
              >
                Launch a campaign
              </Link>
            </div>
          </Reveal>

          <Reveal delay={300}>
            <dl className="mx-auto mt-9 grid max-w-[420px] grid-cols-3 gap-2">
              {STATS.map((s) => (
                <div key={s.l} className="rounded-2xl border border-border bg-card px-2 py-3">
                  <dt className="font-display text-[19px] font-semibold tabular-nums sm:text-[22px]">{s.v}</dt>
                  <dd className="mt-0.5 text-[10.5px] uppercase tracking-wider text-muted-foreground">{s.l}</dd>
                </div>
              ))}
            </dl>
          </Reveal>
        </div>
      </section>

      {/* Live campaigns marquee */}
      <section className="relative py-10 sm:py-14">
        <Reveal className="mx-auto mb-5 flex max-w-[1200px] items-end justify-between gap-3 px-4 sm:mb-7 sm:px-6">
          <h2 className="font-display text-[20px] font-semibold tracking-tight sm:text-[28px]">Live campaigns</h2>
          <Link to="/auth" className="inline-flex items-center gap-1 text-[13px] font-semibold text-primary hover:underline">
            Browse all <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </Reveal>
        <Reveal delay={80}>
          <CampaignMarquee />
        </Reveal>
      </section>

      {/* Product in action */}
      <section id="how" className="px-4 py-12 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-[1200px]">
          <Reveal className="text-center">
            <h2 className="font-display text-[22px] font-semibold tracking-tight sm:text-[32px]">Three taps to a payout</h2>
          </Reveal>
          <Reveal delay={100} className="mt-8 sm:mt-12">
            <AppShowcase />
          </Reveal>
        </div>
      </section>

      {/* Quote */}
      <section className="bg-surface px-4 py-14 sm:px-6 sm:py-20">
        <Reveal className="mx-auto max-w-[760px] text-center">
          <blockquote className="font-display text-[clamp(1.15rem,4.5vw,1.75rem)] font-semibold leading-snug">
            “One clip. Real payout. That&apos;s creator power.”
          </blockquote>
          <p className="mt-3 text-[12.5px] text-muted-foreground">@atif · 1.2M views last month</p>
        </Reveal>
      </section>

      {/* CTA */}
      <section className="px-4 py-16 sm:px-6 sm:py-24">
        <Reveal className="mx-auto max-w-[640px] text-center">
          <h2 className="font-display text-[clamp(1.6rem,6vw,2.4rem)] font-semibold uppercase leading-tight">
            Your clips. <span className="text-primary">Your cash.</span>
          </h2>
          <Link
            to="/auth"
            className="mt-7 inline-flex items-center gap-2 rounded-full bg-primary py-3.5 pl-7 pr-2 text-[15px] font-bold text-primary-foreground transition-transform press-scale hover:scale-[1.02]"
          >
            Start earning now
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-foreground text-background">
              <ArrowRight className="h-3.5 w-3.5" />
            </span>
          </Link>
        </Reveal>
      </section>

      {/* Footer */}
      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-5 px-4 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex items-center gap-2">
            <img src="/favicon.ico" alt="" width={24} height={24} className="h-6 w-6 rounded-md object-cover" />
            <span className="text-[13px] font-bold lowercase">iclips</span>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-[12.5px] text-muted-foreground">
            <Link to="/legal/terms" className="hover:text-foreground">Terms</Link>
            <Link to="/legal/privacy" className="hover:text-foreground">Privacy</Link>
            <Link to="/legal/do-not-sell" className="hover:text-foreground">Do not sell</Link>
          </div>
          <div className="flex items-center gap-4 text-muted-foreground">
            <a href="#" aria-label="X" className="hover:text-foreground"><Twitter className="h-4 w-4" /></a>
            <a href="#" aria-label="Instagram" className="hover:text-foreground"><Instagram className="h-4 w-4" /></a>
            <a href="#" aria-label="YouTube" className="hover:text-foreground"><Youtube className="h-4 w-4" /></a>
          </div>
        </div>
        <p className="pb-8 text-center text-[11.5px] text-muted-foreground">
          © {new Date().getFullYear()} iclips
        </p>
      </footer>

      <CookieConsent />
    </div>
  );
};

export default Landing;
