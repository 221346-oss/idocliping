# Clipster Parity Pass — Verification, Rejections, Admin Analytics, Mobile UI

Eight workstreams. Every UI item below is measured against the Clipster reference screenshots supplied.

## 1. Automated bio verification

- Codes become `iclips 985RT3` format: literal prefix `iclips` + space + 6 random uppercase alphanumerics. Replace the current `clipster-xxxxxx` generator everywhere (creation and re-issue).
- New backend function `verify-social-bio`: takes the account id, fetches the creator's public profile page server-side, strips HTML, and searches for the code (case/whitespace tolerant).
  - Match found -> account flips to Verified instantly, code cleared.
  - No match -> stays unverified with "code not found in bio yet" so the creator can retry.
  - Page unreadable/blocked (common on Instagram) -> falls back to the existing admin review queue with status "In review".
- Accounts screen: "Verify" opens the sheet with the code, a copy button, and a "Check my bio" button that runs the automatic check with a spinner and inline result.
- Admin keeps the manual approve/reject fallback for queued accounts.

## 2. Rejections, budget restore, one-time appeals

- Rejecting a submission (single or from campaign review) now: keeps recorded views for the record, deletes the pending earning, recalculates campaign spend from remaining earnings, and restores `budget_remaining` and the campaign progress percentage accordingly. If the campaign had auto-flipped to review because budget hit 100%, it returns to active when the restore drops it back below 100%.
- Appeals: exactly one appeal per submission, enforced in the database. The appeal form allows attaching proof images to a new private `appeal-proof` bucket; only the appealing creator and admins can read them.
- Creator UI: after appealing, the button becomes "Appeal submitted" with the status; a second appeal is impossible.
- Admin ticket/submission view shows the appeal message and proof thumbnails with approve/reject resolution.

## 3. Admin analytics and submission management

- New per-campaign analytics tab on the admin campaign page: spend vs budget, submissions by status, views over time, top creators, average cost per 1M views.
- Global analytics page gains a campaign selector and the same breakdown across all campaigns.
- Admin submissions table gets a campaign filter plus a per-row action menu: update views, approve, reject with reason, open post, open creator, view appeal.

## 4. Discover page (mobile) — exact Clipster parity

Nav bar
- Remove the active dot/notch under the icon and the tinted pill background. Active state is icon fill only (filled glyph in accent, unfilled grey otherwise), matching the reference.
- Match the reference radius, icon size, and horizontal spacing of the floating bar.

Header
- Gift button becomes a solid white circular button with a dark gift glyph.
- Title row + gift button stay pinned while the campaign list scrolls beneath them.
- "Showing 1 of 1 campaigns" becomes the compact reference form: `1 of 1 campaigns`, small muted type, placed as in the reference.

Cards
- Rebuilt to the Clipster card: square rounded thumbnail on the left with the category label burned in over a soft dark blur at the bottom of the thumbnail; title in bright white on two lines; platform glyph row beneath; then one line with `NN% / $budget` on the left and `$rate / 1M` on the right; full-width progress bar as the card's bottom edge.
- Remove the "All" audience chip and the "New" badge.
- Tighter vertical padding so four cards fit on a mobile screen like the reference.
- More prominent card outline, brighter white text, no extra ornamentation.

Saving
- The bookmark control saves the campaign into My Activity → My Campaigns instead of behaving as a separate bookmark list. The Discover "Bookmarks" filter pill is removed. Saved campaigns persist per user in the database so they follow the account.

## 5. My Activity → Submissions tab (mobile)

One container, rows separated by hairline dividers. Each row:
- thumbnail/flag + campaign title on one line (truncated),
- second line: platform glyph, status icon (red X = ineligible/rejected, green tick = eligible, yellow clock = processing), eye icon with view count,
- right side: relative age (`5d ago`) and a chevron that opens the Submission Report.

Filter pills above: All / Processing / Ineligible / Eligible / Paid Out, with the filter icon button on the left. Tab header shows the submission count badge.

## 6. Submission Report

Three states, each containing exactly the elements from the reference and nothing else.
- Processing (the 6-second window): date, "Processing" chip, explanatory line, Open Post button, campaign details block.
- Ineligible: date, "Ineligible" chip, reason line, Open Post, campaign details (thumbnail, title, category, Platforms, Cap per Post, Cap per Profile).
- Eligible: date, dollar amount, "Eligible" chip, engagement rate row, description paragraph, Open Post, Earnings breakdown (Total views, Eligible views, Rate per 1M, Your potential earnings) with the note callout, then campaign details.

## 7. My Activity → My Campaigns tab (mobile)

Cards exactly as in the reference: thumbnail + campaign title, centred status tag (Active / Pending / Paid Out only), large centred earnings figure with "Your earnings" beneath, then a full-width "Your Submissions: N" button that opens that campaign's Campaign Details page. Filter pills: All / Active / Pending / Paid Out.

## 8. Campaign Details page

- Header: thumbnail, title, category, share button, three tabs (Details / Activity N / Leaderboard).
- Activity tab: large earnings figure with info icon, three-stat row (Submissions / Total Views / Rejected), then a divider-separated list where each row is platform glyph, status icon, eye icon with the full number (`2000`, not `2K`), a dot, dollar amount, then relative time and a chevron to the Submission Report.
- Footer: "Submit" button when the campaign is active; the "Campaign completed – payout processing" banner when it is not.

## General design rules applied to all of the above

- Stronger, more visible card outlines.
- Brighter pure-white primary text.
- Clean layout, no decorative extras beyond what the references show.
- All of it lives in shared tokens/components (`index.css`, StatusChip, CampaignCard, list row primitives) so it stays consistent app-wide.

## Technical notes

- Database: `iclips`-format verification codes; unique constraint for one appeal per submission; `appeal_proof_urls` column; private `appeal-proof` storage bucket with owner/admin policies; rejection logic moved into `admin_reject_submission` (drop earning, recompute spend, restore `budget_remaining`, unflip campaign status); `saved_campaigns` table with per-user RLS replacing the localStorage hook.
- Edge function `verify-social-bio` performs the server-side profile fetch and the code match, with the admin queue as fallback.
- Frontend: shared `SubmissionRow`, `StatusIcon`, and campaign-card components reused by Discover, Activity, and Campaign Details so the three lists cannot drift apart.
