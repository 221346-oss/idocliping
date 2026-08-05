# Creator App Redesign — Reference Parity Pass

Rebuild the creator surfaces to match the 25 mobile and 8 web reference screens, structure for structure, while keeping the lime `#63ec00` identity, the Clipper clapperboard mark, and the custom nav glyphs. Mobile-first: every screen is designed at 390px and then widened for desktop.

## Locked design language

- **Accent**: lime `#63ec00` for primary CTAs, active nav, active filter chips, and links. Green `#3ddc84` stays reserved for money-positive amounts and budget progress. Crimson only for destructive/rejected/ineligible states.
- **Type**: Sora for headings, page titles, and all currency figures; Manrope for body and labels. Page titles are large, left-aligned, tight tracking — matching "Discover", "My Activity", "My Balance", "Profile".
- **Surfaces**: one card radius family (20–24px), one inset radius (16px), soft 1px border, no heavy shadows. Detail screens use a single tall card with hairline dividers between rows, exactly like the reference.
- **Nav**: floating pill bottom bar on mobile with the four existing glyphs (Explore, Activity, Wallet, Profile) — active glyph filled lime, unread dot top-right. Desktop keeps the slim top bar with wordmark, Explore / My Activity, wallet balance pill, Invite & Earn, notifications, avatar menu.

Everything below is expressed as shared global styles and shared components so it stays consistent as new pages are added.

## Global layer (done first, used everywhere)

- Extend `src/index.css` with the missing pieces the references need: sticky action bar, hairline divider row, tab underline, sheet handle, status pill variants (Eligible, Paid Out, Processing, Ineligible, Rejected), budget progress bar, currency-delta text (+green / −crimson), toast pill.
- Standardise hover/press/focus across all interactive elements: card lift on hover, 0.96 press scale, lime focus ring, staggered list entry. These already exist partially — they get finished and applied uniformly.
- Shared components refreshed or added: `CampaignCard`, `StatusChip`, `Pills` (filter chip rail with the leading filter-icon button), `SegmentedTabs`, `StickyActionBar`, `DetailRow`, `SectionDivider`, `MoneyDelta`, `BottomSheet`, `Skeletons`.

## Screens

**Explore** (`CreatorMarketplace`) — rebuilt card to match the reference exactly: square thumbnail with the category tag burned into the bottom-left, title on two lines, audience-requirement and platform glyph row beneath, then a footer line of `NN% / $budget` on the left and `$rate / 1M` on the right with the progress bar under it. Bookmark toggle top-right, filled when saved, with the "Saved to My Activity" floating pill toast. Above the list: search field, category chip rail with a leading filter button, platform chip rail, "Sort By" dropdown, and the "80 of 80 campaigns" counter. Desktop becomes a 4-up grid with search + campaign-type + sort as inline dropdowns.

**Campaign Detail** — single card with thumbnail, title, category in accent, share button, then Details / Activity / Leaderboard tabs with an underline indicator. Details tab: paid-out percentage and rate row with progress bar, Platforms / Cap per Post / Cap per Profile / Min Duration grid, Requirements list with check and cross markers plus the account-audience callout, Campaign Discord button, Examples grid with play overlays, Available sounds row, and the numeric limits table. Leaderboard tab: ranked rows with medal badges for the top three, masked handles, submission count, earnings. Sticky bottom bar with bookmark button and full-width lime Submit Content button.

**My Activity** — two tabs (My Campaigns, Submissions with count badge) plus a status chip rail per tab. Campaign cards show earnings figure, progress, and "Your Submissions: N". Submissions list rows show thumbnail, title, platform glyph, status icon, view count, relative time, chevron. On desktop the Submissions tab becomes the reference table: #, Campaign, Post, Status, Total views, Eligible views, Next refresh, Earnings, Submitted.

**Submission Report** (new screen) — date/time, earnings figure, status pill, engagement rate, status explanation copy, Open Post button, Delete submission for eligible items, next-refresh countdown, Earnings breakdown block (total views, eligible views, rate per 1M, your earnings) with the info note, and a Campaign details block. Desktop renders it as a centred modal card with previous/next circular arrows to page through submissions.

**Wallet** — balance card with the large figure, pending amber pill, explanation copy, minimum-withdrawal line, and a lime Withdraw button that disables below the minimum. Lifetime Earnings row, Earn rewards row, the 30-day compliance notice, a recent Transactions list capped at five with an "All Transactions" button, and a full All Transactions screen. Withdraw opens a bottom sheet with PayPal / Amazon Gift Card / Visa Prepaid Card / USDT (ERC20) methods. Desktop places the balance card beside the Invite & Earn promo panel.

**Profile** — circular avatar overlapping the top of the identity card, handle, member-since line, and the three-stat row (Money earned, Total videos, Total views) with an edit pencil. Then the grouped setting lists: Connected accounts (white highlighted pill), Referrals with "Earn 10%", Language / Theme / Notifications group, FAQ / Resources / Support group, legal group with external-link arrows, Login methods, Logout, and a crimson Delete row, closing with the Clipper mark and version string.

**Auth** — carried over to the finished token set so it matches the rest.

## Functionality added alongside the visuals

- Campaign detail tab switching, bookmark persistence, share, Discord link-out.
- Submission report route with real status logic, countdown timer, and delete.
- Withdraw method sheet with minimum-balance gating; All Transactions route.
- Explore search, category filter, platform filter, sort, result counter, saved-toast.
- Every smaller behaviour visible in the references: masked leaderboard handles, relative timestamps, disabled-state Withdraw, unread dot on the Profile tab, empty and loading states for each list.

## Technical notes

- All new tokens live in `src/index.css` / `tailwind.config.ts`; no hardcoded colors in components.
- Shared UI goes in `src/components/ui-kit` and `src/components/shell`; pages stay thin.
- New routes: `/creator/submissions/report/:id`, `/creator/wallet/transactions`.
- Work is sequenced: global layer → Explore → Campaign Detail → My Activity + Submission Report → Wallet → Profile, verifying each at 390px and 1440px before moving on.
- Scope is creator surfaces only; admin and brand pages are untouched this pass.
