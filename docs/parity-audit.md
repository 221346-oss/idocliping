# idocliping — Clipster-Parity Audit & Build Spec

**Repo:** `221346-oss/idocliping` (live: idocliping.lovable.app) · **Reference:** clipster.gg/discover
**Scope:** Mobile-first creator app across 4 campaign categories — UGC, Clipping, Logo, Music
**Prepared for:** handoff to a build agent (Lovable) — every section ends in concrete to-dos

---

## 0. How to use this document

For every screen: **① What Clipster does** (from the 25 mobile + 8 web screenshots you supplied) → **② What your code currently does** (from reading the actual source) → **③ Gap / bug** → **④ Agent action items**.

Read Section 1 first — it explains the single biggest structural issue in the codebase (a two-tier build), which affects almost every "what's left" list below.

---

## 1. The headline finding: this app is two codebases stitched together

Your creator-facing screens fall into two clearly different generations of build:

**Tier A — already rebuilt to match Clipster (mobile-first, on the new design system: `CreatorShell` / `PageContainer` / `surface-card` / pill buttons / bottom sheets):**
- Discover (`CreatorMarketplace.tsx`)
- Campaign Details (`CreatorCampaignDetail.tsx`)
- My Activity (`CreatorSubmissions.tsx`)
- Submission Report (`CreatorSubmissionReport.tsx`)
- Wallet (`CreatorWallet.tsx`)
- Transactions (`CreatorTransactions.tsx`)
- Profile / Account (`CreatorProfile.tsx` + `AccountProfileView.tsx`)
- Profile Edit (`CreatorProfileEdit.tsx`)
- Bottom Nav (`BottomNav.tsx`)

**Tier B — still the original Lovable "BugTrackr" scaffold layout (`AppLayout` + `PageHeader`, desktop-only grids, 11–13px text, plain bordered boxes, no bottom-sheet patterns, no pill buttons):**
- Connected Accounts (`CreatorSocial.tsx`)
- Referrals (`CreatorReferrals.tsx`) — and it **duplicates** a feature that's already built correctly inside Wallet
- Global Leaderboard (`CreatorLeaderboard.tsx`)
- Support / FAQ (`CreatorSupportList.tsx`, `CreatorSupportNew.tsx`, `CreatorSupportDetail.tsx`)
- Account Settings (`Settings.tsx`)

This matters because **every one of these Tier‑B screens is reachable from your Profile page** (Connected accounts, Referrals, FAQ, Resources, Support, Language/Notifications → Settings) — so a user can be on a pixel-close Clipster clone one tap and land on the old bug-tracker UI the next. This is the single highest-leverage fix: **port Tier B onto the Tier A design system.** Section 4 gives per-screen instructions; Section 7 has the copy-paste "house style" rules so the agent doesn't have to reverse-engineer Tier A's conventions each time.

Admin (`/admin/*`) and Brand (`/brand/*`) panels are internal tools and correctly stay on the desktop `AppLayout` — that's not a gap, leave those alone unless asked.

---

## 2. Information architecture (as-built)

```
/auth                          Email-OTP + Google sign-in
/onboarding/username            Forced username step (new users)
/                                Index (role router)

Creator (bottom-nav tabs)
├─ /creator (= /creator/campaigns)      Discover
│   └─ /creator/campaigns/:id            Campaign Details (Details / Sounds / Leaderboard tabs)
├─ /creator/submissions                  My Activity (Campaigns tab / Submissions tab)
│   ├─ /creator/submissions/:campaignId  Per-campaign submissions (desktop <table>)
│   └─ /creator/submissions/report/:id   Submission Report
├─ /creator/wallet                       Wallet ("My Balance")
│   └─ /creator/wallet/transactions      All Transactions
├─ /profile/me  (= /creator/profile/me)  Profile → Account view
│   ├─ /creator/profile/edit             Edit profile
│   ├─ /creator/profile/:username        Public profile (tabs: Overview/Stats/Campaigns/…)
│   ├─ /creator/social                   Connected accounts        [Tier B]
│   ├─ /creator/referrals                Referrals                [Tier B, duplicate]
│   ├─ /creator/support(/new, /:id)      FAQ / Resources / Support [Tier B]
│   └─ /settings                         Account settings          [Tier B]
└─ /creator/leaderboard                  Global leaderboard        [Tier B, not in Clipster ref]

Brand:  /brand, /brand/campaigns
Admin:  /admin, /admin/brands, /campaigns, /campaigns/:id, /rules, /badges,
        /submissions, /withdrawals, /users, /tickets, /cosmetics,
        /creator-profiles, /automation-lab, /analytics
Legacy: /bugs, /bugs/new, /bugs/:id — original BugTrackr scaffold, admin-only,
        unrelated to the product. Safe to delete once you confirm nothing links to it.
```

**Agent action:** confirm `/bugs*` and `Dashboard.tsx` are dead weight and remove them from `App.tsx` — they're template debris, not part of idocliping.

---

## 3. Design system status — colors & fonts

**Colors: already correctly differentiated from Clipster, keep as-is.**
Your CSS variables (`src/index.css`) use a lime-green primary (`hsl(95 100% 46%)`) on a near-black surface (`hsl(240 3% 6%)`), which matches your existing GrainHero dark-forest/lime identity rather than Clipster's crimson/red. This is exactly the "their layout, your colors" brief — don't change it. State colors (`--state-eligible`, `--state-paid`, `--state-processing`, `--state-ineligible`, `--state-rejected`) are already modeled as a 5-state system, which is the right call (see Section 6.1 for why the backend doesn't fully support this yet).

**Fonts: currently Manrope (body) + Sora (display/headings).** This is a reasonable geometric-sans pairing and close in spirit to Clipster's clean, tight-tracking headline style. I could not extract Clipster's actual computed `font-family` through automated fetching (their site is JS-rendered and served no accessible CSS/font manifest to the fetch tool) — **if pixel-perfect font matching matters to you, the fastest path is opening clipster.gg in Chrome DevTools → Computed → font-family on an `<h1>`/body element and telling the agent the exact name**, rather than guessing. Until then, Manrope/Sora is a fine placeholder and not worth blocking on.

**Agent action:** no color change. Keep Manrope/Sora unless you supply the exact Clipster font names from DevTools.

---

## 4. Screen-by-screen audit

### 4.1 Discover (`/creator/campaigns` — `CreatorMarketplace.tsx`) — ✅ 90% done

**Clipster reference:** Header "Discover" + gift icon (top right) → search bar → category pills (All/Music/Logo/Clipping/UGC…) → a slider-icon button that expands a bottom sheet with Platform chips (All/Instagram/TikTok/YouTube/X) and a "Sort By" dropdown → "N of N campaigns" counter → campaign cards (thumbnail with category burned into corner, title, platform icons, progress bar showing `% / $budget` funded on the left and `$rate / 1M` on the right).

**Current state:** Search bar, category pills (driven live off distinct campaign categories, not hardcoded), a filter sheet with platform chips + sort options, bookmark/saved tab, empty states, and a `CampaignCard` component that already reproduces the thumbnail-with-burned-in-category-tag + platform row + progress bar pattern almost exactly.

**Gaps:**
- No "**N of N campaigns**" counter text above the list (reference always shows this, e.g. "80 of 80 campaigns").
- No **gift icon** in the top-right of the header. In the reference this is present on every Discover screenshot but its destination was never shown mid-tap in your captures — it most likely opens a rewards/streaks or "Invite & Earn" panel (the desktop nav confirms a separate "Invite & Earn" menu item exists on Clipster). Decide what it should open in your app (most likely: the Referrals feature) and wire it up — don't leave it decorative.
- Filter sheet in your code combines platforms + sort in one sheet behind a single icon; Clipster's expanded state (screenshot 19) shows Platforms as a horizontal chip row and Sort By as an inline dropdown sitting directly under the category pills (not hidden behind a slider icon after the categories are already visible) — cosmetic difference only, current approach (bottom sheet) is arguably better UX for mobile and fine to keep.

**Agent action items:**
1. Add a live "`{filtered.length} of {campaigns.length} campaigns`" line above the grid.
2. Add the gift/rewards icon button to the Discover header; wire it to `/creator/referrals` (once that page is rebuilt — see 4.9) or a new Rewards screen if you want streak/tier mechanics later.

---

### 4.2 Campaign Details (`/creator/campaigns/:id` — `CreatorCampaignDetail.tsx`) — 🟡 70% done, most valuable fixes are here

**Clipster reference:** Hero image → title → **Details / Activity / Leaderboard** tabs.
- **Details tab:** Paid-out progress bar + rate, platform icons, Cap per Post / Cap per Profile / Min. Duration, Requirements checklist (✓/✗ bullet list), account-audience requirements with a live eligibility check ("1 linked account is eligible"), "Campaign Discord" button, Available sounds list, and a data block: Max Submissions per Social Account, Max Submissions per Day per Social Account, Min Followers per Social Account, Min Views for Earnings, Min Engagement Rate.
- **Activity tab:** *the creator's own* stats for this campaign — big "$X.XX Your earnings", then a 3-up row (Submissions / Total Views / Rejected), then a plain list of that creator's own submissions for this campaign. Empty state: clapperboard icon + "Your activity will show up here once you submit content."
- **Leaderboard tab:** top creators across *all* users for this campaign, masked usernames, rank medals for top 3, $ earned.
- Sticky bottom bar: "Submit Content" (+ bookmark icon).

**Current state:** Hero image, rate, progress bar, platform chips — all present and good. Tabs are **Details / Sounds / Leaderboard** — not Details/Activity/Leaderboard. "Sounds" is rendered as its own tab; in the reference, sounds are a *subsection inside* Details, and the actual second tab (Activity) doesn't exist on this page at all. The Leaderboard tab is implemented well (top-3 medals, masked names, earnings) and matches reference closely.

**This is the most important gap in the whole app:** there is no per-campaign, per-creator activity view living on the Campaign Details page. The closest equivalent your code has is a *different route* (`/creator/submissions/:campaignId`), reached only from the separate "My Activity" page, and it renders as a **desktop-only HTML `<table>`** (see 4.3) — a clear mobile-first violation, and architecturally disconnected from Campaign Details (after submitting content, the user is navigated to that other route, not back to an "Activity" tab on the page they were just looking at).

**Data model gaps** (fields the reference UI needs that don't exist in `campaigns` table yet): `max_submissions_per_day`, `min_followers_per_account`, `min_views_for_earnings`, `min_engagement_rate`, `min_duration_seconds`, and a structured `account_audience_requirements` (e.g. "India ≤ 15%", "For Movies & TV creators only") distinct from the current freeform `requirements` JSON. `max_submissions_per_account` already exists and is used; the four "Min/Max …" stat rows shown in the reference Details tab (screenshots 17, 23) simply have nowhere to come from today.

**Agent action items:**
1. Rename tab 2 from "Sounds" → "**Activity**". Move the sounds list into a "Resources"/"Available sounds" subsection inside the **Details** tab (your code already has the sounds-rendering JSX — just relocate it, don't rebuild it).
2. Build the new Activity tab content: query `submissions` filtered by `campaign_id` + `creator_id = current user`, aggregate into a stat row (Submissions count / Total Views / Rejected count) plus "Your earnings" headline number, then list that creator's own submissions for this campaign (mobile card rows, tap-through to Submission Report) — reuse the row pattern already built in `CreatorSubmissions.tsx`'s "submissions" tab rather than inventing a new one. Use the exact empty-state copy from the reference: *"Your activity will show up here once you submit content."* with a clapperboard/`Film` icon.
3. Add the 4 missing campaign fields to the schema (`max_submissions_per_day`, `min_followers_per_account`, `min_views_for_earnings`, `min_engagement_rate`) and render them as `DataRow`s in Details (component + pattern already exists, just needs the fields).
4. Add `min_duration_seconds` and show it as "Min. Duration" next to Cap per Post / Cap per Profile.
5. Decide whether the post-submit redirect should go to the new "Activity" tab on this same page instead of the separate `/creator/submissions/:id` route — recommended, since it matches Clipster's model of "everything about this campaign, including your own activity in it, lives on one page."

---

### 4.3 My Activity — per-campaign submission list (`/creator/submissions/:campaignId`) — ❌ mobile-first violation

**Clipster reference:** Row list — platform icon, "Open post" link, status pill, view count, "3mo ago", tap to expand.

**Current state:** `CampaignSubmissionsView` inside `CreatorSubmissions.tsx` renders a literal `<table><thead><tr><td>` grid (platform / URL / views / earned / status / actions) — functional on desktop, **broken UX on a phone** (horizontal scroll or crushed columns). This directly contradicts the mobile-first requirement that governs the rest of the rebuild.

**Agent action items:**
1. Replace the `<table>` with the same row-card pattern already used everywhere else in Tier A (`press-row` / `surface-card divide-y` list, icon + two-line text + right-aligned value + status chip) — this pattern is already written in three other files in this codebase (`CreatorSubmissions.tsx` overview list, `CreatorTransactions.tsx`, `CreatorProfile`'s panels); copy the convention, don't reinvent it.
2. Keep a `<table>` behind a `md:` breakpoint if you want the richer desktop view Clipster's own web version uses (see WebView screenshot 3) — Clipster genuinely does render a table on desktop and cards would be a regression there. So: **cards below `md`, table at `md:` and up** — the current code only has the table.

---

### 4.4 Submission Report (`/creator/submissions/report/:id` — `CreatorSubmissionReport.tsx`) — 🟡 50% done

**Clipster reference (5 distinct states, all confirmed from your screenshots):**
| State | What's shown |
|---|---|
| **Rejected** | "$0", red "Rejected" pill, **Engagement rate: 0.39%**, reason text ("Inorganic engagement/Viewbotting is detected for this submission"), Open Post button, Campaign details block (thumbnail/title/category/platforms/cap-per-post/cap-per-profile) |
| **Ineligible** | Multiple distinct copy variants seen: *"You've already submitted the maximum number of posts for campaign in 24 hours. Try again later."* / *"Submission is too old for campaign. Create new post and try again."* / *"We couldn't verify ownership of the social account. Link the account and resubmit the post."* |
| **Eligible** | Green "Eligible" pill, Engagement rate %, **"Next refresh in 46:55" live countdown**, "Delete submission" red-outline button, earnings breakdown (Total views / Eligible views / Rate per 1M / Your potential earnings) |
| **Paid Out** | Green "Paid Out" pill, "Earnings have been finalized and credited to Clipster wallet.", earnings breakdown (Total views / Eligible views / Rate / Your earnings) |
| *(Processing, implied)* | Not explicitly captured but exists as a 5th state throughout the rest of the app |

Every state also shows the **exact submission timestamp** ("30 Jul 2026 / 00:15") as a small caption above the dollar figure, and an inline **"Campaign details" card** (thumbnail + title + category tag + platform icons + Cap per Post + Cap per Profile) below the report — not just a link to the campaign.

**Current state:** Your `CreatorSubmissionReport.tsx` shows one big centered card (Earned amount, status chip, one generic sentence per status from a 5-entry `STATUS_COPY` map), a "Performance" `DataRow` block (Views counted / Rate / Platform / Submitted-date), a reject-reason block if rejected, and a link-style "Open post" / "Open campaign" button pair. It's the right skeleton but meaningfully thinner than reference.

**Data model gaps:** the `submissions` table has only `manual_views` (a single number) — the reference needs **both** `total_views` and `eligible_views` as separate numbers (they differ, e.g. 894 vs 891), plus `engagement_rate` (numeric), plus a `next_refresh_at` timestamp for the live countdown, plus a structured **ineligibility reason** (today only `reject_reason` exists, and by its name it's clearly meant for the Rejected state, not Ineligible — you need a second reason field or a shared `status_reason` column so Ineligible can carry its own varied copy).

**Agent action items:**
1. Add columns: `total_views`, `eligible_views`, `engagement_rate`, `next_refresh_at`, `status_reason` (nullable text, used for both rejected and ineligible copy) to `submissions`.
2. Rebuild the report header to show: date/time caption → big $ figure → status pill → `status_reason` (fallback to your current generic `STATUS_COPY` if none set) → for Eligible only, a live "Next refresh in mm:ss" countdown computed from `next_refresh_at` (client-side `setInterval`, same pattern you already use for the OTP timer in `Auth.tsx` — reuse that logic).
3. Add an inline "Campaign details" card at the bottom of the report (thumbnail, title, category chip, platform icons, Cap per Post, Cap per Profile) instead of the current single "Open campaign" button — pull this straight from the `campaigns` row you already join in the query.
4. Add a "Delete submission" destructive-outline button, visible only while status is Eligible/Processing (not yet Paid), calling the same delete path already implemented for "pending" rows in `CreatorSubmissions.tsx`.

---

### 4.5 My Activity overview (`/creator/submissions` — `CreatorSubmissions.tsx`) — ✅ 90% done

**Clipster reference:** "My Activity" header, **Campaigns / Submissions** tabs (your code: ✅ exact match), status filter pills (All/Active/Pending/Paid Out on Campaigns tab; All/Processing/Ineligible/Eligible/Paid Out/Rejected on Submissions tab), campaign progress cards, submission row list.

**Current state:** Tabs, 3-up stat strip (Total earned / Campaigns / Submissions), campaign cards with progress + status chip, submissions row list with status chip — this is a strong match already.

**Gap:** the reference's status **filter pills** (All/Processing/Ineligible/…) aren't implemented — your version has the two top-level tabs but no secondary status filter row underneath either tab (screenshots 11 and 15 both show a filter-chip row directly under the tabs).

**Agent action items:**
1. Add a secondary `FilterPills` row under each tab: Campaigns tab → All/Active/Pending/Paid Out (filter on derived campaign payout status); Submissions tab → All/Processing/Ineligible/Eligible/Paid Out/Rejected (filter on `normalizeStatus(s.status)` — the mapping function already exists, just needs a UI control wired to it).

---

### 4.6 Wallet / "My Balance" (`/creator/wallet` — `CreatorWallet.tsx`) — ✅ 85% done

**Clipster reference:** Big balance + "+$X pending", disclaimer text, red "Withdraw" button opening a method sheet (**PayPal / Amazon Gift Card / Visa Prepaid Card / USDT (ERC20)**), "Lifetime Earnings" row, "Earn rewards — see what's unlocked at your current tier" teaser row, "Transactions" section with a compliance notice ("Rewarded campaign posts must remain public and unchanged for 30 days…") and a short recent list + "All Transactions" button. Desktop web view additionally shows a big "Turn your network into earnings" referral promo card next to the balance card.

**Current state:** Balance card, pending/minimum-withdrawal copy, Withdraw bottom sheet, Earned/Withdrawn/Pending stat trio, a `ReferralCard` (good — matches the desktop promo's spirit), recent activity list, "All transactions" link, and a Payout info block. Strong implementation.

**Gaps:**
1. **Withdrawal methods don't match:** code offers PayPal / USDT / Bank; reference offers PayPal / Amazon Gift Card / Visa Prepaid Card / USDT (ERC20). `withdrawal_method` enum in the DB is currently `paypal | usdt | bank` — needs `amazon_giftcard` and `visa_prepaid` added, and `bank` removed or kept as an extra (your call, but it's not in the reference).
2. No **"Earn rewards" tier teaser row** — the schema already has `leaderboard_badge_tiers`, `cosmetic_items`, `creator_cosmetics`, `creator_leaderboard_points` tables built for exactly this, they're just not surfaced on this screen yet.
3. No compliance notice banner ("Rewarded campaign posts must remain public and unchanged for 30 days…") — this is a static string, trivial to add, but legally meaningful copy so don't paraphrase it away.

**Agent action items:**
1. Update `withdrawal_method` enum to `paypal | amazon_giftcard | visa_prepaid | usdt`. Update `METHODS` array in `WithdrawSheet`.
2. Add the compliance notice banner (static `ListSection`-style info row) above or below Transactions, matching the exact legal copy from the reference.
3. Add an "Earn rewards" row linking to a new Rewards screen backed by the already-existing `leaderboard_badge_tiers`/`cosmetic_items` tables — this is schema-ready, purely a missing UI + route.

---

### 4.7 All Transactions (`/creator/wallet/transactions` — `CreatorTransactions.tsx`) — ✅ 90% done

**Clipster reference:** Grouped list, each row labelled with the **campaign name** ("Jordan Adetunji [CLIPPING] *closing in 12h*", "Withdrawal to Crypto – •••••• 👁"), signed $ amount, green/red coloring.

**Current state:** Correctly grouped by month, correct iconography, correct signed amounts — but earning rows are labelled generically ("Campaign earning" / "Referral commission") instead of the actual campaign title, and withdrawal rows say "`{method} withdrawal`" instead of "Withdrawal to Crypto – •••••• 👁" style with a redaction/reveal affordance.

**Agent action items:**
1. Join `earnings` → `submissions` → `campaigns.title` so each earning row shows the real campaign name (you already do this exact join pattern in `CreatorSubmissions.tsx` and `CreatorWallet.tsx`).
2. For withdrawal rows, label as "Withdrawal to {Method}" and consider masking the payout destination with an eye-toggle to reveal, matching the reference's privacy pattern.

---

### 4.8 Profile / Account (`/profile/me` — `AccountProfileView.tsx`) — ✅ ~95% done, best-matched screen in the app

**Clipster reference:** Overlapping avatar card, `@handle`, "Member since", 3-stat row (Money earned / Total videos / Total views), then grouped rows: Connected accounts (highlighted), Referrals ("Earn 10%"), Language/Theme/Notifications, FAQ/Resources/Support, legal links, Login methods, Logout, Delete, app logo + version footer.

**Current state:** This is close to a 1:1 rebuild — same overlapping-avatar layout, same stat row, same grouped-row structure and icons, and it even reproduces the exact version string style ("Version 0.2.49"). This is the strongest screen in the codebase relative to the reference.

**Gaps (small but real):**
1. **Referral commission copy is inconsistent across the app**: this screen says "Earn 10%" (matches reference), but `CreatorWallet.tsx`'s `ReferralCard` says "5% commission" and the standalone `/creator/referrals` page also says "5%". Pick one number and use it everywhere — three different numbers for the same program is a trust-breaking bug, not a cosmetic one.
2. Legal links ("Creators Terms of Use", "Privacy Policy", "Do Not Sell My Data") all point to `href="/"` — placeholders, not real documents.
3. Footer shows the placeholder wordmark "**Clipper**" and version "0.2.49" hardcoded — this, plus the favicon (`iclips-favicon.svg`) and any remaining "Clipster" strings elsewhere in the repo, need a full rebrand pass (Section 6).
4. "Language" and "Notifications" rows both link to `/settings`, which is still Tier B (old `AppLayout`) — see 4.13.

**Agent action items:**
1. Standardize the referral rate to one number app-wide (grep the whole repo for "5%"/"10%" referral copy and fix all three occurrences to match).
2. Write or link real Terms/Privacy/Data policy pages and swap the placeholder `href="/"`.
3. Rebrand pass: replace "Clipper" wordmark, version scheme, and favicon with your actual product name/identity.

---

### 4.9 Connected Accounts (`/creator/social` — `CreatorSocial.tsx`) — ❌ Tier B, needs full rebuild

**Clipster reference:** This is the screen gating campaign eligibility — reference Campaign Details shows live checks like "1 linked account is eligible" and ownership-verification failures ("We couldn't verify ownership of the social account. Link the account and resubmit the post.") tied directly to what's connected here.

**Current state:** Plain two-column desktop form (`AppLayout`/`PageHeader`, bordered boxes, 12–13px labels, generic shadcn `Select`/`Input`), lets a user add a platform + handle + profile URL, shows a `verified` boolean with no visible verification *flow* (no OAuth/ownership-check CTA — `verified` just sits there, presumably admin-set).

**Agent action items:**
1. Rebuild on `CreatorShell`/`PageContainer`/`list-group` (Tier A conventions) — mobile-first cards per platform, not a desktop form grid.
2. Design and build an actual **ownership verification flow** (even a lightweight one — e.g. "add this code to your bio" or an OAuth connect button per platform) since the reference product clearly gates campaign eligibility on verified-vs-unverified accounts, and today `verified` has no way to become `true` from the UI.
3. Surface verification status per account as a chip (Verified / Pending / Unverified) using the same `StatusChip` component already used everywhere else.

---

### 4.10 Referrals (`/creator/referrals` — `CreatorReferrals.tsx`) — ❌ Tier B *and* a duplicate

**Current state:** A full standalone page (old `AppLayout`) that re-implements — with slightly different copy and styling — the exact same feature already built correctly as the `ReferralCard` component inside `CreatorWallet.tsx`. Two UIs, two code paths, one feature, inconsistent commission copy (see 4.8).

**Agent action items:**
1. Decide which is canonical. Recommended: keep the compact `ReferralCard` in Wallet for quick access, and rebuild this dedicated `/creator/referrals` page (which Profile links to) as a fuller Tier‑A page — code/link/copy button, stat trio, and a list of referred creators with their individual contribution — rather than deleting one and losing the "full page" depth.
2. Either way, delete the duplicate data-fetching logic and extract one shared hook (`useReferralData()`) so both surfaces read from a single source of truth and can never show different numbers again.

---

### 4.11 Global Leaderboard (`/creator/leaderboard` — `CreatorLeaderboard.tsx`) — ⚠️ Tier B, and not in your reference screenshots

**Current state:** A full ranking page (weekly/monthly period filters, reset countdowns, masked usernames) — reasonably sophisticated, but built on old `AppLayout`, and it's **not reachable from the bottom nav** and never appeared in any of the 25 mobile / 8 web screenshots you supplied. It may be what the Discover page's unexplained gift icon is meant to open, or it may be a feature you're building ahead of Clipster's public surface.

**Agent action items:**
1. Clarify intent: is this meant to be a global (all-campaigns) leaderboard as a distinct product feature, or should it be retired now that a working per-campaign Leaderboard tab exists inside Campaign Details? Either decision is fine — just don't leave it in limbo on the old layout with no nav entry point.
2. If keeping it: port to Tier A conventions and give it an entry point (the Discover gift icon is the natural candidate).

---

### 4.12 Support / FAQ / Resources (`/creator/support*`) — ❌ Tier B

**Clipster reference:** Profile → FAQ / Resources / Support rows. FAQ and Resources likely open static content or an external help center; Support opens a ticket flow.

**Current state:** Functional ticket list/create/detail flow exists (`support_tickets`, `ticket_messages`, `ticket_attachments` tables are all built), but on the old `AppLayout`.

**Agent action items:**
1. Port `CreatorSupportList/New/Detail.tsx` to Tier A layout and row/card conventions.
2. Confirm FAQ and Resources should route here too (currently both do, per `AccountProfileView.tsx`) or split them into their own static content screens if you want genuinely different content for "how do I get paid" vs "file a support ticket."

---

### 4.13 Settings (`/settings` — `Settings.tsx`) — ❌ Tier B, and possibly redundant

**Current state:** A large (28KB) standalone settings page on old `AppLayout`. Meanwhile, `AccountProfileView.tsx` already inlines Language, Theme, and Notifications as rows directly on the Profile screen (Theme even works today, cycling light/dark/system on tap). This raises the same "two implementations of one feature" question as Referrals.

**Agent action items:**
1. Audit what's actually only available in `/settings` vs. what's duplicated inline on Profile, then either fold the unique parts into the Profile rows (matching Clipster's flat, no-separate-settings-page IA) or keep `/settings` as a deeper "advanced settings" page reached from Profile — but rebuild it on Tier A either way.

---

### 4.14 Auth & Onboarding (`/auth`, `/onboarding/username`) — ✅ functional, not visible in your reference screenshots

Email-OTP + Google sign-in, with a forced username step for new accounts. Not covered by your Clipster screenshots, so there's nothing to diff against — flagged here only for completeness. No action needed unless you want it restyled to match the Tier A visual language (it currently uses its own standalone styling, not `CreatorShell`).

---

### 4.15 Bottom Navigation (`BottomNav.tsx`) — ✅ done

Explore / My Activity / Wallet / Profile, floating pill nav with active-state icon fills — matches the reference bottom nav closely already. No action needed.

---

## 5. Web (desktop) view

Your `deisign assests/WebView` screenshots show Clipster's desktop layout is materially different from mobile — a top nav bar (logo, Explore, My Activity, wallet balance chip, "Invite & Earn", notification bell, avatar dropdown with Profile/Settings/Help/Logout) and a 4-column campaign grid, plus real HTML `<table>`s for submissions (confirming the fix in 4.3 — table is *correct* at desktop width, wrong at mobile width).

Your `TopNav.tsx` exists and should already cover most of this — worth a quick pass to confirm it has: the wallet-balance chip, "Invite & Earn" entry, and the avatar dropdown (Profile/Settings/Help/Logout) shown in web screenshot 8, since these weren't verified in this audit.

**Agent action:** treat "mobile-first" as *mobile-first, not mobile-only* — every Tier B page you rebuild should get the `md:` breakpoint treatment already used in Tier A files (see the `lg:grid lg:grid-cols-[...]` patterns in `CreatorCampaignDetail.tsx` and `CreatorWallet.tsx`) rather than being built mobile-only.

---

## 6. Cross-cutting issues

### 6.1 Submission status: 3 raw DB states pretending to be 5 UI states
`submission_status` enum = `pending | approved | rejected`. But the UI (correctly, matching Clipster) needs 5 states: Processing, Eligible, Ineligible, Rejected, Paid Out. Today, "Eligible" vs "Paid Out" and "Rejected" vs "Ineligible" are inferred client-side, and **inconsistently**: `StatusChip.tsx`'s `normalizeStatus()` handles all 5 buckets, but `lib/submission-status.ts`'s `submissionStatusLabel()`/`submissionStatusBadgeClass()` (used in the Tier‑B table in 4.3) only knows 3 and **has no "paid" case at all** — meaning a paid-out submission viewed in that table won't render correctly.

**Agent action:** either (a) expand the DB enum to the real 5 states and set it explicitly from your admin/backend logic, or (b) if keeping the derivation client-side, delete `lib/submission-status.ts` and make `StatusChip.normalizeStatus()` the single source of truth everywhere, including the table in 4.3.

### 6.2 Referral commission rate: 3 different numbers in the app
"Earn 10%" (Profile row) vs "5% commission" (Wallet card) vs "5%" (Referrals page). Pick one, fix all three. See 4.6/4.9/4.10.

### 6.3 Placeholder legal links and rebrand strings
`href="/"` for Terms/Privacy/Do-Not-Sell; hardcoded "Clipper" wordmark and "Version 0.2.49" in the Profile footer; `iclips-favicon.svg` filename. None of this blocks functionality but all of it is user-visible. See Section 6 checklist below.

### 6.4 Legacy scaffold routes
`/bugs`, `/bugs/new`, `/bugs/:id`, and `Dashboard.tsx` are the original Lovable "BugTrackr" template, unrelated to idocliping. Confirm nothing depends on them and remove.

---

## 7. Rebrand checklist (do this regardless of feature work)

- [ ] Replace "Clipper" wordmark string in `AccountProfileView.tsx` footer with your real product name.
- [ ] Replace/confirm app version scheme (currently mirrors Clipster's literal "0.2.49").
- [ ] Replace `public/iclips-favicon.svg` and any other Clipster-derived filenames/assets.
- [ ] Search the repo for any remaining literal "Clipster" strings in copy (toasts, empty states, README) and swap to your name — the `README.md` itself still describes the project as a generic "BugTrackr" bug-tracking system from the Lovable scaffold and should be rewritten to actually describe idocliping.
- [ ] Confirm the exact font-family Clipster uses via browser DevTools if pixel-matching typography matters (Section 3).

---

## 8. Data model changes needed (Supabase)

```sql
-- campaigns: fields the Details tab needs but doesn't have
ALTER TABLE campaigns ADD COLUMN max_submissions_per_day integer;
ALTER TABLE campaigns ADD COLUMN min_followers_per_account integer;
ALTER TABLE campaigns ADD COLUMN min_views_for_earnings integer;
ALTER TABLE campaigns ADD COLUMN min_engagement_rate numeric;
ALTER TABLE campaigns ADD COLUMN min_duration_seconds integer;
ALTER TABLE campaigns ADD COLUMN account_audience_requirements jsonb;

-- submissions: fields the Submission Report needs but doesn't have
ALTER TABLE submissions ADD COLUMN total_views integer;
ALTER TABLE submissions ADD COLUMN eligible_views integer;
ALTER TABLE submissions ADD COLUMN engagement_rate numeric;
ALTER TABLE submissions ADD COLUMN next_refresh_at timestamptz;
ALTER TABLE submissions ADD COLUMN status_reason text; -- covers both rejected & ineligible copy

-- withdrawal_method enum: match Clipster's actual 4 methods
ALTER TYPE withdrawal_method ADD VALUE 'amazon_giftcard';
ALTER TYPE withdrawal_method ADD VALUE 'visa_prepaid';
-- (decide whether to keep/deprecate 'bank', which isn't in the reference)

-- submission_status: optional, only if you go the "explicit backend state" route in 6.1
ALTER TYPE submission_status ADD VALUE 'ineligible';
ALTER TYPE submission_status ADD VALUE 'paid';
```

---

## 9. Prioritized roadmap

**P0 — trust & correctness bugs (fix first, small effort):**
1. Referral commission rate inconsistency (6.2)
2. Submission status derivation inconsistency between `StatusChip.tsx` and `lib/submission-status.ts` (6.1)
3. Mobile `<table>` in per-campaign submissions view (4.3)
4. Placeholder legal links (6.3)

**P1 — the core Clipster-parity gap:**
5. Campaign Details: rename Sounds tab → Activity, build the real per-creator Activity view (4.2)
6. Submission Report: 5-state copy, engagement rate, total/eligible views split, live refresh countdown, inline campaign-details card (4.4)
7. Data model additions in Section 8 to unblock #5 and #6

**P2 — port Tier B → Tier A design system:**
8. Connected Accounts (4.9) — also needs the new verification-flow feature, not just a visual port
9. Referrals dedicated page (4.10) — de-duplicate first
10. Support/FAQ (4.12)
11. Settings (4.13) — resolve overlap with Profile inline rows first
12. Global Leaderboard (4.11) — clarify intent before porting

**P3 — polish:**
13. Discover: campaign counter text + gift/rewards icon (4.1)
14. Wallet: withdrawal methods, rewards-tier teaser, compliance banner (4.6)
15. Transactions: real campaign names instead of generic labels (4.7)
16. Rebrand checklist (Section 7)
17. Remove `/bugs*` legacy scaffold (2, 6.4)

---

*This audit is based on a full clone of the repository and a screen-by-screen comparison against all 25 mobile and 8 desktop reference screenshots provided. Where a Clipster behavior wasn't directly visible in a screenshot (e.g. the Discover gift icon's destination), that's called out explicitly as an assumption rather than stated as fact.*
