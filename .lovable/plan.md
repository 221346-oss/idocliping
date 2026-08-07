# Landing + Login visual pass with your artwork

Use the uploaded artwork as real section imagery (no re-coding those sections in HTML), add the login background, glass cards, an auto-sliding trending rail powered by real campaigns, and a smooth light/dark + scroll experience.

## 1. Artwork pipeline (loading quality)

All 7 uploads go to the CDN as assets, plus a build/serve-time optimization step:

- Convert each PNG to WebP (and keep a PNG fallback) at 2 widths (mobile ~1080px, desktop ~1920px).
- Serve via `<picture>` with `srcset`/`sizes` so phones never download the desktop file.
- Every below-the-fold image: `loading="lazy"`, `decoding="async"`, explicit `width`/`height` (no layout shift), plus a tiny blurred placeholder that cross-fades to the real image on load.
- Backgrounds that must not block paint use CSS `image-set()` with the WebP first.
- The hero/top background is the one exception: preloaded with `fetchpriority="high"`.

## 2. "How it works" section

Replace the two existing screenshots with the new set, and make it theme-aware:

- Light theme -> `How_it_works_Light_-_Website` (desktop) / `How_it_works_light_Mobile_view` (mobile).
- Dark theme -> the matching dark pair.
- Both themes' images are layered and cross-faded on toggle (opacity transition), so switching light/dark never flashes.
- Desktop/mobile swap happens through `<picture>` media queries, so the transition when resizing the window is instant and smooth rather than a re-mount.

## 3. Login page

- Full-bleed background: mobile artwork on small screens, the wide dark/light background on desktop, theme-aware and cross-faded like above; fixed/cover positioned with a subtle parallax-free `background-attachment` safe fallback on iOS.
- The auth card becomes true glassmorphism: translucent surface, heavy backdrop blur, 1px light-edge border, inner highlight, soft outer shadow, subtle lime/pink glow bleeding from behind the card.
- Inputs, the Google button and the OTP slots get matching translucent treatment so the whole card reads as one glass panel.
- Same background is applied to the top section of the landing page where it fits.

## 4. Trending campaigns section

- Remove the "Trending campaigns" heading and the "View all" link entirely.
- Cards become the same glassmorphism style, sitting on the new background artwork (dark/light variants, cross-faded).
- The rail auto-slides continuously (marquee, seamless loop), pauses on hover/touch, and respects reduced-motion.
- Hover: card lifts slightly with a soft glow, smooth easing.
- Data comes from real campaigns instead of the hardcoded mock list.

## 5. Section motion

A shared scroll-reveal utility in global CSS/JS: sections fade+rise on enter and gently fade on exit, applied consistently down to the last section, with `prefers-reduced-motion` respected.

## 6. Later (noted, not in this pass)

Logo + favicon replacement and the light-theme top-section image once you send them. On mobile the top section will use only the background image, no foreground art.

## Technical notes

- Images uploaded through `lovable-assets` (CDN pointers), not committed binaries.
- New `src/components/media/ThemeArtwork.tsx` — one component handling theme pair + responsive `<picture>` + lazy/blur-up; reused by How-it-works, login, and trending backgrounds.
- Glass styling added as tokens/utilities in `src/index.css` (`.glass-card`, `.glass-input`) so it is reusable app-wide, no hardcoded colors.
- Marquee keyframes added to `tailwind.config.ts`.
- Backend: `campaigns` currently allows SELECT only for authenticated users, so the public landing page cannot read real campaigns. A migration adds an `anon` SELECT policy limited to `status = 'active'` plus the matching `GRANT SELECT`, exposing only the fields the card shows.
- `src/pages/Landing.tsx` trending block rewritten to fetch active campaigns (limit ~10) with a skeleton state and a graceful empty state.
