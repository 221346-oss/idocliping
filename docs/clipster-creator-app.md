# Clipster creator app — how it works

Living reference for the creator experience. To request a change, add a comment under the relevant
section in the form: `CHANGE: replace X with Y` and hand this file back.

## 1. Routes (simplified, Clipster parity)

| Route | Page file | Purpose |
| --- | --- | --- |
| `/auth` | `src/pages/Auth.tsx` | Google OAuth + email OTP (10-min expiry) sign-in |
| `/onboarding/username` | `src/pages/OnboardingUsername.tsx` | One-time unique `@username` pick |
| `/discover` | `pages/creator/Discover.tsx` | Campaign grid, search, category/platform filters, sort, gift → rewards |
| `/campaigns/:id` | `pages/creator/CampaignDetail.tsx` | Details / Activity / Leaderboard tabs + Submit content sheet |
| `/activity`, `/activity/:campaignId` | `pages/creator/Activity.tsx` | My Campaigns + Submissions tabs |
| `/submissions/:id` | `pages/creator/SubmissionReport.tsx` | Single submission report, earnings breakdown, Open post |
| `/wallet` | `pages/creator/Wallet.tsx` | My Balance, withdraw sheet, recent transactions |
| `/wallet/transactions` | `pages/creator/Transactions.tsx` | Full ledger, filter All / Earnings / Withdrawals |
| `/rewards` | `pages/creator/Rewards.tsx` | Published weekly rewards + top earners this week |
| `/leaderboard` | `pages/creator/Leaderboard.tsx` | Global leaderboard |
| `/referrals` | `pages/creator/Referrals.tsx` | Referral link + commission stats |
| `/accounts` | `pages/creator/Accounts.tsx` | Connected accounts + bio-code verification |
| `/profile`, `/profile/edit`, `/u/:username` | `pages/creator/Profile.tsx`, `ProfileEdit.tsx` | Own account view, edit, public profile |
| `/support`, `/support/new`, `/support/:id` | `pages/creator/Support*.tsx` | Support tickets |

Old `/creator/*` and `/profile/me` paths redirect to the new ones (see `src/App.tsx`).

## 2. Design system

- Accent: lime `#63ec00` (`--primary`). Success/green for money, amber for pending, crimson for
  rejected/destructive only.
- Fonts: Sora (`font-display`) for titles and currency, Manrope for body.
- Shared classes in `src/index.css`: `.surface-card`, `.list-group` / `.list-row`, `.chip`,
  `.icon-pill`, `.status-pill`, `.btn-primary-pill`, `.btn-outline-pill`, `.sticky-action-bar`,
  `.hairline`, `.press-scale`, `.focus-ring`.
- Shared components: `components/shell/{CreatorShell,TopNav,BottomNav}`,
  `components/ui-kit/{CampaignCard,Pills,DataBits,StatusChip,Skeletons}`.
- Never hardcode colors in pages — use the tokens above so light/dark both work.

## 3. Auth flow

1. `/auth` → Continue with Google (`lovable.auth.signInWithOAuth`) or email → 6-digit OTP with a
   10-minute countdown, resend, and change-email.
2. `UsernameGate` forces any signed-in user without `profiles.profile_slug` to
   `/onboarding/username`; the handle is checked for uniqueness and is permanent.
3. Profile picture, display name and bio are editable at `/profile/edit`; the username is read-only.

## 4. Submitting content

- Submit sheet opens from the campaign detail sticky bar.
- The pasted link's platform is detected (`src/lib/detect-post-platform.ts`).
- Submission is blocked unless the platform is accepted by the campaign **and** the creator has that
  platform connected **and verified** in `/accounts`.
- Verification is a bio code: the creator copies `clipster-xxxxxx` into their bio, taps review, an
  admin confirms in `/admin/rewards` → the account flips to Verified.

## 5. Statuses

- Campaign: **Active** (can submit) · **Pending** (budget filled, no new submissions) · **Paid Out**.
- Submission: pending · approved · rejected (with reason shown on the report screen).
- Withdrawals: minimum $50; methods PayPal, Amazon Gift Card, Visa Prepaid Card, USDT (ERC20).
- Referral commission: 5%.

## 6. Admin controls

| Admin page | Controls |
| --- | --- |
| `/admin/campaigns` | Create campaigns incl. payout, budget, platforms, Discord link, max earnings/post, max submissions/day, min followers, min views for earnings, min engagement rate, min duration, audience requirement |
| `/admin/campaigns/:id` | Per-campaign detail and edits |
| `/admin/submissions` | Approve / reject with reason |
| `/admin/withdrawals` | Approve / mark paid / reject |
| `/admin/rewards` | Create + publish weekly rewards, review the account verification queue |
| `/admin/rules`, `/admin/badges`, `/admin/cosmetics`, `/admin/users`, `/admin/tickets` | Platform rules, leaderboard tiers, cosmetics, roles, support |
| `/admin` | Overview: active campaigns, submissions to review, pending withdrawals, open tickets, creators, total creator earnings |
| `/analytics` | Platform analytics: submission status split, submissions/day, earnings/day, top campaigns by views |

The legacy BugTrackr scaffold (`/bugs*`) has been removed.

## 7. Data model touchpoints

- `campaigns`: campaign parameters shown on the Details tab.
- `submissions`: `total_views`, `eligible_views`, `engagement_rate`, `next_refresh_at`, `status_reason`.
- `social_accounts`: `verification_code`, `verification_status`, `verification_requested_at`, `verified`.
- `weekly_rewards`: admin-published rewards surfaced on `/rewards`.
- `earnings`, `withdrawal_requests`: wallet balance and ledger.
