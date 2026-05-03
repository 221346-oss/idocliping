# Clipper — MVP Plan

A scope this large needs to be built in phases. This plan covers **Phase 1 (MVP foundation)** so we ship something usable quickly. Later phases (payouts, fraud detection, messaging, mobile, AI) get their own plans once Phase 1 is live.

## Phase 1 Goals

1. Rebrand "Triage" → "Clipper" everywhere (logo text, auth page, sidebar, landing, meta tags). Keep the current visual style.
2. Add a 3-role system: `admin`, `brand`, `creator` (default for new signups = `creator`).
3. Role-based dashboards behind one login.
4. Campaign marketplace + submission flow.
5. Creator earnings + referral tracking (manual admin verification, no payment processor yet).
6. Keep the existing bug-tracking system intact, but scoped to admins only (becomes an internal tool inside the admin dashboard).

## Roles & Routing

```text
/auth                  → single login (existing)
/                      → landing (existing, rebranded)

After login, redirect by role:
  admin    → /admin            (current Dashboard becomes admin home)
  brand    → /brand
  creator  → /creator          (default for new signups)
```

A `RoleRoute` wrapper guards each section. Role is read from the existing `user_roles` table (we'll extend the `app_role` enum with `brand` and `creator`).

## Database Changes (migration)

Extend enum + add new tables. No existing tables get destructive changes.

- `app_role` enum → add `'brand'`, `'creator'` (keep `admin`, `user`).
- `handle_new_user()` trigger → default new signups to `creator` instead of `user`.
- New tables:
  - `brands` — id, name, logo_url, website, owner_user_id (the invited brand account), created_at
  - `campaigns` — id, brand_id, title, description, instructions, thumbnail_url, category (enum: music/clipping/gaming/logo/ugc/other), platforms (text[]), payout_per_1m_views (numeric), budget_total, budget_remaining, status (draft/active/paused/ended), badges (text[]), created_at, updated_at
  - `campaign_participants` — id, campaign_id, creator_id, joined_at (creator joins a campaign)
  - `submissions` — id, campaign_id, creator_id, platform, post_url, manual_views, status (pending/approved/rejected), reject_reason, reviewed_by, reviewed_at, created_at
  - `social_accounts` — id, user_id, platform (tiktok/instagram/youtube/x), handle, profile_url, verified
  - `earnings` — id, creator_id, submission_id, amount, type (campaign/referral), created_at
  - `referrals` — id, referrer_id, referred_user_id, code, commission_rate, created_at
  - `referral_codes` — id, user_id, code (unique), uses_count
  - `withdrawal_requests` — id, creator_id, amount, method (paypal/usdt/bank), payout_details (jsonb), status (pending/approved/paid/rejected), notes, created_at
- Storage bucket: `campaign-assets` (public) for thumbnails.
- RLS: per project knowledge, team-wide visibility — authenticated users can SELECT most tables; mutations are scoped (creators write own submissions, brands write own campaigns via admin-managed `brands.owner_user_id`, admins manage everything).

## Pages To Build

### Creator dashboard (`/creator/*`)

- `/creator` — overview: total earnings, campaign balance, referral balance, withdraw CTA, submission history list, simple earnings graph (Recharts).
- `/creator/campaigns` — marketplace grid of active campaigns (cards with thumbnail, category, budget remaining, CPM, platforms, badges).
- `/creator/campaigns/:id` — details + Join button + submission form (paste post URL).
- `/creator/submissions` — table of own submissions with status.
- `/creator/referrals` — referral code, link, list of referred users, commission earned.
- `/creator/wallet` — withdrawal request form (PayPal / USDT / Bank), history, min-payout notice.
- `/creator/social` — connect/list social handles (manual entry for MVP, no OAuth yet).

### Brand dashboard (`/brand/*`) — read-only for MVP

- `/brand` — overview of own brand's campaigns + aggregate stats.
- `/brand/campaigns` — list of campaigns admin created for this brand.
- `/brand/campaigns/:id` — view details, submissions, performance. (Approve/reject is admin-only in MVP, brand just views.)

### Admin dashboard (`/admin/*`)

- `/admin` — current Dashboard (KPIs adapted to platform-wide stats).
- `/admin/brands` — create/edit brands, invite brand owner by email (uses existing `invitations` table; on signup that user gets `brand` role).
- `/admin/campaigns` — create/edit/approve campaigns on behalf of brands.
- `/admin/submissions` — review queue: approve/reject, set manual view count, which writes an `earnings` row.
- `/admin/users` — list, ban, change role.
- `/admin/withdrawals` — approve/mark paid/reject withdrawal requests.
- `/admin/bugs` — existing bug system moves under admin (internal tool). Settings/Analytics stay in admin.

## Rebrand Checklist

- `StackedLogo` keeps current 3-rectangle mark.
- All "Triage" strings → "CLIPPER" (uppercase, tracking 0.08em — same memory rule).
- Update: `index.html` title/meta, `Landing.tsx`, `Auth.tsx`, `AppSidebar.tsx`, `AppLayout.tsx` mobile header, README.
- Update memory: `mem://ui/branding-and-logo` to record the new name.

## What Is NOT In Phase 1 (deferred)

These are big enough to be their own phases. We'll plan each separately when we get to it:

- Real payment processing (Stripe/PayPal/crypto) — MVP is manual admin payout marking.
- OAuth into TikTok/IG/YT/X — MVP uses manual handle entry + manual URL submissions.
- Automated view tracking, fraud detection, AI moderation — MVP is manual admin entry of view counts.
- Messaging/chat, notifications system, leaderboard, multi-language, public API, mobile app.
- Email notifications (we can layer in later via the auth-email-hook + transactional templates).

## Technical Notes

- Reuse existing patterns: `AuthContext`, `ProtectedRoute`, `AppLayout`, shadcn UI, dark theme, square-ish cards.
- Add a `useRole()` hook reading from `user_roles` (cached in `AuthContext`) and a `<RoleRoute roles={["admin"]}>` wrapper.
- Sidebar nav items become role-aware (different items rendered for admin/brand/creator).
- Validate all form inputs with `zod` (per project security rules).
- Keep the existing bug system tables and pages — just move routes under `/admin/bugs/*`.

## Suggested Build Order (after approval)

1. Migration: extend `app_role` enum, change default role to `creator`, create new tables + RLS + storage bucket.
2. Rebrand pass (Triage → Clipper).
3. Role infrastructure: `useRole`, `RoleRoute`, role-based redirect after login, role-aware sidebar.
4. Creator marketplace + submission flow.
5. Admin: brands, campaigns CRUD, submission review queue (with manual view count → earnings).
6. Brand read-only dashboard.
7. Referral codes + earnings rollup.
8. Withdrawal requests (manual admin approval).
9. Move bug tracker under `/admin/bugs`.

## Open Questions Before I Build

1. **Default landing after login for an admin** — keep current Dashboard as `/admin` (recommended) or make a new admin home? /admin
2. **Brand creation** — confirm: admin creates the brand record AND invites the brand-owner user by email; that invitee signs up and is auto-linked to the brand and given `brand` role. OK? yes 
3. **Earnings formula** — for MVP: `earnings = (manual_views / 1,000,000) * campaign.payout_per_1m_views`. Confirm? yup
4. **Min withdrawal threshold + referral commission %** — any default values you want (e.g. $50 min, 5% referral)? I'll pick sensible defaults if you don't care. okay

Once you approve, I'll start with the migration + rebrand in the first build, then work through the order above in follow-up messages so each step is reviewable.