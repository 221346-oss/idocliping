# Creator App — Reference Parity & Polish Pass

Bring the whole creator experience (mobile-first, plus web) to exact parity with the reference screens in `deisign assests/`, keeping our own brand: **lime `#63ec00` accent**, Sora + Manrope, "Clipper" name and existing logo/icons. Everything the references show in red becomes lime; everything else (layout, wording, spacing, iconography, behaviour) matches the references.

## 1. Global design layer (index.css / tailwind)

- **Card outline**: every card gets the visible 1px hairline outline seen in the references (`--border` at higher contrast in dark, softer in light) with a 20–22px radius. Fixes cards currently reading as flat blocks.
- **Selected/pressed states**: active chips, tabs and buttons use accent-at-opacity blends (`bg-primary/12` fill + `border-primary/55` outline + accent text) instead of solid fills, matching the reference "All" chip.
- **Progress bar tokens**: shared bar component where fill colour is driven by the % used — accent green up to 80%, amber 80–99%, muted/complete at 100%.
- **Bottom nav**: bigger, premium 24–26px glyphs, outline when inactive / solid-filled accent when active, with an accent dot-notch on the active item like the reference. Correct contrast in both light and dark. Applies app-wide.
- Shared status pill styles: Active, Pending, Paid Out, Eligible, Ineligible, Rejected, Processing.

## 2. Auth flow

- Sign-in card exactly as the attached modal: heading **"Welcome to Clipper"**, three provider tiles side by side, `or` divider, "Type your email…" pill input, full-width **Continue** button, and the "By signing up, I acknowledge and agree to the Creator Terms of Use and Privacy Policy" footer. Same card on mobile (bottom sheet over blurred app) and on web (centred modal over blurred app).
- Google continues via managed Google sign-in; email continues to the 6-digit OTP screen (10-minute expiry) already built.
- Note: our backend natively supports Google and Apple only — Discord is not available as a sign-in provider. The tile row will show Apple + Google unless you want a Discord tile that links to your Discord community instead.

## 3. Username onboarding

Matches the attached screens: sheet titled **"Choose your username"**, subtitle "Your username will be used for your profile URL:" with a live `clipper/@username` preview, plain input, helper "Only lowercase letters and numbers allowed.", disabled-until-valid Continue. Uniqueness checked live; permanent once set. Redirects to Discover.

## 4. Discover (Explore)

- Mobile: title "Discover" + gift/rewards circle button, search pill, filter icon + category chip rail, expandable Platforms row and "Sort By: Highest CPM" control, "80 of 80 campaigns" count, then one-per-row cards.
- Web: top bar (logo, Explore / My Activity, wallet balance, Invite & Earn, notifications, avatar), "Explore" title, search + "Campaign type" + "Sort by" dropdowns, platform pill row, "Showing X of Y campaigns", then a 4-column card grid (2 on tablet).
- **Card**: square thumbnail with category label burned into the bottom-left, title (2-line clamp), audience-requirement icon + platform icons row, bookmark toggle top-right, then `NN% / $budget` on the left and `$rate / 1M` on the right above the coloured progress bar. Web card adds the `Active` / `Rate` labels row.
- Bookmarking shows the "Saved to My Activity" floating toast.

## 5. Campaign Details

Header: circular back button + centred "Campaign Details". Card holds thumbnail, title, category in accent, share icon, then three tabs — **Details · Activity · Leaderboard** (Activity shows a count badge). Sticky bottom bar with bookmark circle + **Submit Content** pill.

- **Details**: `Paid out NN% / $budget` and `Rate $X / 1M` with progress bar; rows for Platforms, Cap per Post, Cap per Profile, Min. Duration; **Requirements** section with account-audience note and eligibility banner, green-check allowed items and red-x not-allowed items; **Campaign Discord** button; **Examples (n)** video thumbnails; **Available sounds (n)** list with open-link icon; then the parameter table — Max Submissions per Social Account, Max Submissions per Day per Social Account, Min Followers per Social Account, Min Views for Earnings, Min Engagement Rate — plus the closing compliance line. All values come from campaign fields set by admin; missing values render as `—`. Sections separated by hairlines.
- **Activity**: empty state ("Your activity will show up here once you submit content.") or your earnings figure, a 3-stat row (Submissions / Total Views / Rejected) and your submission rows (platform icon, status dot, views • earnings, relative time, chevron → Submission Report).
- **Leaderboard**: per-campaign ranking — medal for top 3, avatar initial, masked handle (`a***z`), clip-count with repeat icon, earnings on the right.

**Submit Content sheet** (bottom sheet on mobile, dialog on web): "Submit Content", "Carefully review requirements before your submission.", link input, Send button. On submit it detects the platform from the URL (TikTok / Instagram / YouTube / X) and blocks with a clear message if the platform isn't allowed by the campaign or if that platform isn't a connected account on your profile.

## 6. My Activity

Title "My Activity" with two tabs: **My Campaigns** and **Submissions (count)**.

- My Campaigns: filter chips All / Active / Pending / Paid Out. Card = thumbnail + title, status pill when Pending/Paid Out, big earnings figure with "Your earnings", percent/budget + rate row with progress bar (amber near full), and a "Your Submissions: n" button that opens the campaign's Activity tab.
- Submissions: filter chips All / Processing / Ineligible / Eligible / Paid Out, then compact rows — thumbnail + campaign title, platform icon, status icon, views, relative time, chevron → Submission Report.

## 7. Submission Report

Back nav + "Submission Report". Card shows date/time, earnings figure, status pill, engagement rate, the status-specific explanation sentence, a "Next refresh in mm:ss" strip for eligible items, **Open Post** button, **Delete submission** (only while deletable), **Earnings breakdown** (Total views, Eligible views, Rate per 1M, Your earnings / Your potential earnings) with the info note, and **Campaign details** (thumbnail, title, category, Platforms, Cap per Post, Cap per Profile).

## 8. Wallet

Rebuilt as **"My Balance"**: balance card with big figure, `+ $X pending` amber pill, "Your pending earnings will become available once a campaign ends.", "Minimum withdrawal is 50$", full-width Withdraw button. Then "Lifetime Earnings" row, "Earn rewards" row with gift icon, then **Transactions** with the 30-day compliance notice card, transaction rows (circular $ icon, campaign title, date, +green / −red amount) and an **All Transactions** button → full ledger page with the same row design.

Withdraw opens a **Select Method** bottom sheet: "Choose a method to withdraw your earnings from Clipper." with PayPal, Amazon Gift Card, Visa Prepaid Card, USDT (ERC20) options, then the amount/details step.

## 9. Profile

Already close to the reference; finishing touches only — avatar circle overlap, `@handle`, "Member since", 3-stat row, highlighted "Connected accounts" row, Referrals · Earn 10%, Language / Theme / Notifications, FAQ / Resources / Support, legal group, Login methods, Logout, Delete, and the Clipper version footer.

## 10. Remaining creator pages on the new theme

Referrals, Connected accounts (social), Support list/new/detail, Leaderboard, Notifications and Settings screens all move to the shared shell, card, list-row, chip and button styles so nothing is left on the old look.

## Technical notes

- New/updated shared components: `CampaignCard`, `ProgressBar`, `StatusPill`, `FilterChipRail`, `UnderlineTabs`, `BottomSheet`, `ListSection`/`DataRow`, `NavGlyphs` (redrawn), plus a `usePlatformFromUrl` helper for submit validation.
- Submit validation reads the user's `social_accounts` rows and the campaign's `platforms` array — pure client-side gating, no schema change.
- Campaign detail parameter rows read existing `campaigns` columns (`requirements`, `requirements_allowed`, `requirements_not_allowed`, `sounds`, `example_ads`, `community_link`, `max_submissions_per_account`, `max_earnings_per_post`, `max_earnings_per_creator`); any field with no value renders `—`.
- Per-campaign leaderboard is aggregated from approved submissions/earnings for that campaign, with handles masked client-side.
- No database schema changes are required for this pass.
