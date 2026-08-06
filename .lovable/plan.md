# Finish the parity audit — every open item in docs/parity-audit.md

Goal: close out all remaining P0–P3 items from the audit so the whole creator app is on one design system, with matching admin controls, and no placeholder copy left.

## What I verified is already done (no rework)

- Routes/file names are Clipster-simplified (`/discover`, `/campaigns/:id`, `/activity`, `/wallet`, `/profile`, `/accounts`, `/support`).
- Discover has the "Showing N of N campaigns" counter and the gift icon (→ Rewards).
- Connected Accounts is rebuilt with bio-code verification.
- The DB already has the audit's Section 8 columns (`total_views`, `eligible_views`, `engagement_rate`, `next_refresh_at`, `status_reason`, all the campaign min/max fields) and the withdrawal methods `amazon_giftcard` / `visa_prepaid`.

## What's left, and what I'll do

### 1. Trust bugs (P0)

- **Referral rate**: Profile says "Earn 10%", Referrals page and Wallet say 5%. Standardize on **5%** everywhere (the value actually used in payout logic) and read the number from one shared constant.
- **Submission status**: delete `src/lib/submission-status.ts` and make `StatusChip.normalizeStatus()` the single source of truth (it has all 5 states; the old helper has no "paid" case). Update the three files importing it.
- **Legal pages**: build real `/legal/terms`, `/legal/privacy`, `/legal/data` screens and point the Profile rows at them instead of `href="/"`.

### 2. Mobile-first violations (P0)

- Per-campaign submissions view inside `Activity.tsx`: card rows below `md`, keep the table at `md:` and up.
- Same treatment for the Leaderboard table.

### 3. Submission Report (P1)

Rebuild to the reference's 5 states: timestamp caption → big $ figure → status pill → `status_reason` copy (fallback to generic per-state copy) → engagement rate → Total views / Eligible views / Rate per 1M / earnings breakdown → live "Next refresh in mm:ss" countdown for Eligible → "Delete submission" for Eligible/Processing → inline Campaign details card (thumbnail, title, category, platforms, cap per post/profile) instead of a bare link.

### 4. Activity filter pills (P1)

Secondary filter row under each tab: Campaigns → All / Active / Pending / Paid Out; Submissions → All / Processing / Ineligible / Eligible / Paid Out / Rejected.

### 5. Port the remaining Tier-B screens onto the new design system (P2)

Each gets `CreatorShell` + `PageContainer` + `surface-card` / `list-group` rows, pill buttons, bottom sheets — mobile-first with `md:` desktop treatment:

- **Referrals** (`/referrals`) — full page: code + copy button, stat trio, list of referred creators. Extract a shared `useReferralData()` hook so Wallet's `ReferralCard` and this page can never disagree.
- **Support / FAQ / Resources** — port list / new / detail; add real FAQ and Resources content screens so those Profile rows stop pointing at the ticket flow.
- **Settings** — fold the genuinely unique parts into a rebuilt Tier-A page reached from Profile; drop what's already inline on Profile (theme/language/notifications).
- **Global Leaderboard** — keep it as a product feature, port to Tier A (it already has a nav entry).

### 6. Wallet + Transactions polish (P3)

- Compliance banner with the exact reference copy about posts staying public and unchanged for 30 days.
- "Earn rewards — see what's unlocked at your current tier" row wired to the rewards/tier screen backed by `leaderboard_badge_tiers` / `cosmetic_items`.
- Transactions: join through to `campaigns.title` so earning rows show the real campaign name; withdrawals read "Withdrawal to {Method}" with a masked destination and eye-toggle reveal.

### 7. Rebrand + cleanup (P3)

- Replace the "Clipper" wordmark and hardcoded version string with the real product name and a version pulled from `package.json`.
- Sweep the repo for leftover "Clipster" / "BugTrackr" strings; rewrite `README.md` to describe this app.
- Remove `/bugs`, `/bugs/new`, `/bugs/:id`, `BugList/BugCreate/BugDetail`, and the unused bug-tracker pieces after confirming nothing links to them. `Dashboard.tsx` stays — it is the admin home.

### 8. Admin side, in step

- Admin submissions: set `status_reason`, `total_views`, `eligible_views`, `engagement_rate`, `next_refresh_at` when reviewing, so the new report states are real data and not client-side guesses.
- Admin controls for weekly rewards / tiers already exist; verify each new creator-facing field has an admin input.

### 9. Handover doc

Update `docs/clipster-creator-app.md` at the end to cover every screen, route, status flow and admin control, in the `CHANGE: replace X with Y` comment format.

## Decisions I'm making (say the word to flip any)

- Referral commission = **5%** app-wide.
- Submission states stay derived client-side from `pending | approved | rejected` + `status_reason` (no DB enum change) — simpler and already consistent once the duplicate helper is gone.
- Global Leaderboard is kept, not retired.
- `/settings` is kept as a deeper page rather than fully folded into Profile.

## Technical notes

- Single status source: `StatusChip.normalizeStatus()`; `lib/submission-status.ts` deleted.
- Single referral source: `useReferralData()` hook + a `REFERRAL_RATE` constant.
- Responsive rule for every ported screen: cards below `md`, tables/multi-column at `md:` and up.
- No color or font changes — lime `#63ec00`, Sora + Manrope stay.
