# Clean slate + campaign, onboarding, submission and wallet overhaul

Rebuild the core money and account flows so they behave the way the reference screens show, on a completely empty database. Visual language stays exactly as it is today (lime accent, Sora/Manrope, rounded cards, floating pill nav) — every new screen mirrors the existing mobile-first UI.

## 1. Wipe the database

Delete every user, profile, campaign, submission, earning, withdrawal, referral, ticket and social account. Nothing is kept.

New rule: the first time `atifnazir105@gmail.com` signs in, that account is granted the admin role automatically; everyone else becomes a creator.

## 2. Drop unused tables

Removed entirely, along with their pages, routes, functions and edge functions:

- Bug tracker: bugs, comments, attachments, activity log, projects, notification preferences, company settings
- Test-creator automation: internal creator flags, test batches, campaign test assignments, automation logs and jobs, the Automation Lab admin page and its 4 edge functions
- Cosmetics and badges: cosmetic items, creator cosmetics, profile cosmetic settings, leaderboard badge tiers, badge overrides, plus the Cosmetics and Badges admin pages and the cosmetics profile panel

Brands and invitations stay.

## 3. Sign-in, onboarding and profile (fixes #3 and #4)

Confirmed root cause: the database has a `handle_new_user` function but **no trigger attached to it**, so signing up with Google or email never creates a profile or role row. That is why a fresh account has no data and the profile tab is inaccessible.

Fix:

- Attach the signup trigger so every new account gets a profile row and a `creator` role (admin for the owner email).
- After first sign-in, route the user to onboarding: pick a **unique username** (live availability check, lowercase, 3-20 chars, letters/numbers/underscore), optional display name and avatar. Username is locked afterwards; display name, avatar and bio remain editable.
- The username gate blocks all app routes until onboarding is done, and the auth context waits for the profile row before deciding where to send the user.

## 4. Admin campaign builder (#2)

One full-width admin form that owns **every field the creator campaign detail page renders**, so nothing on that page is hardcoded:

- Identity: title, brand, thumbnail, category (UGC / Clipping / Edits / Anime), platforms
- Description box (rich multi-line, shown as the Details description)
- Instructions / content requirements, allowed and not-allowed lists
- Example posts: paste post links directly, stored on the campaign and rendered in Details
- Sounds / song link, Discord link
- Payout per 1M views, total budget, max earnings per post and per creator, submission caps per day/account
- Eligibility: min followers, min views for earnings, min engagement rate, min duration
- Status: draft / active / paused / pending payout / ended — only `active` is visible to creators; pausing hides it immediately

Admin campaign list gets status filters, budget-used progress and quick pause/resume.

## 5. Account connection by bio verification (#5)

Creator adds a platform handle, gets a one-time code, pastes it in their profile bio, then taps Verify. Status flows unverified → pending → verified, and submissions are only accepted from verified accounts on that platform.

## 6. Submission lifecycle (#7)

```text
creator submits
   -> processing        (6 seconds, real, for every submission)
   -> eligible          appears in the admin views queue
        admin updates views  -> earnings for that post recalculated live
   campaign budget hits 100%
   -> admin sets campaign to "pending payout"
        admin reviews each post: approve  -> paid
                                 reject   -> not paid, reason shown to creator
        admin can send the campaign back to "active" if posts need rework
```

- Updating views no longer approves a post — it only updates views and recomputes that post's earnings from the campaign rate and caps.
- Approval and payment only happen in the campaign-level pending-payout review.
- Creator's submission report shows the exact stage, current views, current earning, and the rejection reason when rejected.

## 7. Wallet (#8)

Three figures, computed one way everywhere (nav chip, wallet, profile):

- **Pending** — earnings on eligible posts not yet paid out
- **Available** — paid-out earnings minus withdrawals already requested or paid; this is the only withdrawable amount
- **Lifetime** — everything ever earned

Withdrawals can only be requested against Available, with the existing $50 minimum. Transactions list shows each earning with its stage and each withdrawal with its status.

## Technical notes

- Migrations: truncate all data; drop the removed tables and their functions/policies; add `earnings.status` (`pending` / `paid`) plus `paid_at`; add campaign status value `pending_payout`; add `submissions.eligible_at`; attach the `on_auth_user_created` trigger; add a unique index on `profiles.profile_slug`; RLS + GRANTs updated for the new columns and the dropped tables.
- `useCreatorBalance` currently selects `earnings.status`, a column that does not exist — that query silently fails today and is fixed by the new column plus the pending/available split.
- Earning recomputation lives in a security-definer function called from the admin views update, so caps and budget are enforced server-side rather than in the client.
- The 6-second processing window is stored as `eligible_at = created_at + 6s`; the UI and the admin queue both read from it, so it survives refreshes.
- Routes removed: `/admin/automation-lab`, `/admin/cosmetics`, `/admin/badges`. Route added: `/admin/campaigns/new`.
