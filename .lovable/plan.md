# Clipper Redesign — Mobile-First Creator App

A full visual rebuild of the creator experience, modelled on the reference screens you supplied, but carrying your identity: acid lime `#63EC00`, the Clipper name and stacked-clapper mark. Mobile is the source of truth; web is the same system widened.

## What changes

### 1. Global design system (done once, used everywhere)
- **Typography**: Sora for headings/display, Manrope for body. Replaces Geist/Inter/Bebas globally. Big page titles are Sora ~32px semi-bold, left-aligned, no page-header chrome.
- **Color**: lime `#63EC00` becomes the primary action + active-state + progress color (buttons, filled bottom-nav icon, budget bars, "Eligible/Paid Out" states). Charcoal surface stack: page `#0F0F10`, card `#1B1B1D`, raised `#232326`. Destructive/rejected stays red. All values as HSL tokens in `index.css`; no hardcoded colors in components.
- **Shape**: radius jumps from 6px to fully rounded — 20px cards, 16px inner rows, pill buttons and pill filter chips. This is the single biggest visual shift toward the reference.
- **Global interaction layer**: one set of reusable classes/tokens for hover lift, press-scale, focus ring, row-press highlight, and skeleton shimmer — so every page picks them up automatically instead of each page re-inventing them.
- **Motion**: shared page-enter fade, staggered list-item entry, sheet slide-up, tab underline slide.

### 2. App shell
- **Mobile (< 768px)**: fixed floating bottom nav bar — rounded pill container, 4 items: Explore, My Activity, Wallet, Profile. Custom SVG glyphs drawn for Clipper (clapper-lens, flag, wallet, person), inactive = outline muted, active = lime filled. Small dot badge for unread. Content gets bottom padding so nothing hides behind it.
- **Web (≥ 768px)**: slim top bar — Clipper logo left, Explore / My Activity nav pills centre-left, wallet balance chip, Invite & Earn, notification bell, avatar menu (Profile / Settings / Help / Log Out) on the right. Replaces the current left sidebar for creators. Sidebar stays for admin/brand.
- Shared page container: max-width, consistent gutters, sticky sub-headers.

### 3. Creator pages rebuilt
- **Explore** (`CreatorMarketplace`): search field, filter-toggle button, horizontally scrolling category pills (All / Music / Logo / Clipping / UGC / Gaming), expandable panel with platform pills + "Sort by", live "N of M campaigns" count. Card = square thumbnail with category tag overlaid bottom-left, title, platform glyph row, bookmark toggle top-right, then `xx% / $budget` on the left and `$rate / 1M` on the right above a thin progress bar. Single column on mobile, 4-up grid on web.
- **Campaign Details**: header card (thumbnail, title, category), three tabs — **Details** (payout %, rate, platforms, cap per post/profile, min duration, requirements checklist with tick/cross, example videos, available sounds, submission limits table), **Activity** (your earnings, submissions/views/rejected trio, your submission rows), **Leaderboard** (rank medals, masked usernames, submission count, earnings). Sticky bottom action bar: bookmark button + full-width lime "Submit Content".
- **My Activity**: two tabs — **Campaigns** (filter pills All/Active/Pending/Paid Out; per-campaign card with earnings, progress, "Your Submissions: n") and **Submissions** (filter pills All/Processing/Ineligible/Eligible/Paid Out/Rejected; compact rows on mobile, full data table on web).
- **Submission Report**: status chip, earnings figure, reason text, Open Post button, next-refresh countdown, delete action when allowed, earnings breakdown (total views / eligible views / rate per 1M / your earnings), campaign details block.
- **Wallet / My Balance**: balance hero with pending chip, min-withdrawal note, lime Withdraw button (disabled state when under threshold), Lifetime Earnings row, Earn Rewards row, Transactions list with the 30-day-public notice and an "All Transactions" full page.
- **Referrals**: "Turn your network into earnings" panel with lime gift illustration, referral link copy, commission stats.
- **Profile**: avatar over card, `@username`, member-since, three stats (money earned / total videos / total views), then grouped rounded list sections — Connected accounts, Referrals, Language/Theme/Notifications, FAQ/Resources/Support, legal links, Login methods, Logout, Delete, app version footer.
- **Auth + Landing**: restyled onto the same tokens — rounded cards, Sora display, lime CTAs.

### 4. Functionality alignment (from the reference)
These behaviours exist in the reference and will be wired to your existing data where it already exists, and shown as read-only/empty where it doesn't yet:
- Bookmark/save a campaign, surfaced back on Explore and Profile
- Campaign leaderboard tab with masked usernames
- Submission status vocabulary standardised to: Processing, Ineligible, Eligible, Rejected, Paid Out
- Per-submission earnings breakdown and rejection reason
- Cap per post / cap per profile / min views / min engagement shown on campaign details
- Withdraw method sheet (PayPal, Gift Card, Prepaid Card, USDT)

No schema or business-logic changes in this pass. If a field the reference shows has no column behind it, it renders as `—` and I'll flag the list at the end so you can decide what to add next.

### 5. Loading + empty states
Skeletons refreshed to the new card shapes, and every list gets a centred illustrated empty state instead of a bare sentence.

## Technical notes
- Tokens live in `src/index.css` and `tailwind.config.ts`; new radius scale, surface tokens, lime state colors, shadow + hover utilities.
- New `src/components/shell/` — `CreatorShell`, `BottomNav`, `TopNav`, `PageContainer`.
- New `src/components/brand/icons/` — hand-authored SVG React components for the 4 nav glyphs plus platform glyphs.
- New shared primitives: `FilterPills`, `CampaignCard`, `StatTrio`, `ProgressRate`, `StatusChip`, `ListSection` / `ListRow`, `SheetPicker`.
- Creator routes move under the new shell in `App.tsx`; admin/brand keep `AppLayout` until their pass.
- Font loading swaps to Sora + Manrope in `index.css`.

## Order of work
1. Tokens, fonts, radius, global hover/motion utilities
2. Custom nav icons + mobile bottom nav + web top nav shell
3. Shared primitives (cards, pills, chips, list rows)
4. Explore → Campaign Details → My Activity → Submission Report → Wallet → Referrals → Profile
5. Auth + Landing
6. Skeletons, empty states, mobile/web pass at 390px and 1440px

Admin and brand dashboards keep working unchanged and get the same treatment in a follow-up pass.
