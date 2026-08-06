# iClips

iClips is a creator clipping marketplace. Brands fund campaigns, creators post clips on TikTok,
Instagram, YouTube and X, and earnings accrue per 1M eligible views until the campaign budget runs out.

## Core functionality

- **Sign in** — Google OAuth or email one-time code (10-minute expiry), then a one-time unique `@username`.
- **Discover** — browse active campaigns by category (UGC, clipping, edits, gaming, music, anime) and platform.
- **Campaign detail** — Details / Activity / Leaderboard tabs, payout rate, budget progress, requirements.
- **Submit content** — paste a post link; the platform is auto-detected and must be both accepted by the
  campaign and verified on the creator's connected accounts.
- **Submission report** — per-post total views, eligible views, engagement rate, earnings breakdown and status.
- **Wallet** — balance, $50 minimum withdrawals (PayPal, Amazon gift card, Visa prepaid, USDT) and full ledger.
- **Rewards & leaderboard** — weekly published rewards, ranked creators, badge tiers and cosmetics.
- **Referrals** — 5% commission on referred creator earnings.
- **Support** — ticketing with attachments.
- **Admin** — campaigns, submission review, withdrawals, rewards, verification queue, rules, badges,
  cosmetics, users, tickets, automation lab and platform analytics.

## Tech stack

- React 18 + TypeScript + Vite
- Tailwind CSS with semantic design tokens (lime `#63ec00` accent, Sora + Manrope)
- Lovable Cloud backend: Postgres with row-level security, auth, storage, edge functions

## Docs

- `docs/clipster-creator-app.md` — living reference for the creator experience and how to request changes.
- `docs/parity-audit.md` — design/functionality audit that drove the current build.
