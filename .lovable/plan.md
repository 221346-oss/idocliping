# Landing polish: motion, hero art, typography, logo

Six fixes on top of the artwork pass, plus the new logo rolled out app-wide.

## 1. Scroll experience

Replace the current opacity-only scroll handler with a reusable reveal utility:

- Sections fade **and rise** on enter (translateY 24px -> 0), settle once revealed instead of flickering back.
- Staggered children inside each section (headline, copy, buttons, cards) with small delays.
- Hero art gets a gentle parallax drift; trending cards keep the hover lift.
- Everything disabled under `prefers-reduced-motion`.

## 2. "How it works" section sizing

The artwork is rendered at full container width, so on desktop it squashes into a short band. Fix:

- Constrain to the artwork's real aspect ratio, cap the height, and center it.
- Mobile uses the tall mobile artwork at its own ratio; desktop uses the wide one.
- Tighten the section padding so it reads as one deliberate block, not a stretched strip.

## 3. Web-only top image (light + dark)

Add the two new hero images as a theme-aware pair (currently the hero uses one static `hero-showcase.png`):

- Both converted to WebP at two widths with blur placeholders, added to the artwork registry.
- Desktop only, cross-faded on theme switch; mobile keeps just the background artwork.
- Hero copy column re-balanced against the new art (narrower text column, larger art, no overlap or clipping).

## 4. Typography

Headlines move to **Bebas Neue** (tall condensed caps) with **Barlow** as the body/UI font, replacing the plain look:

- Fonts loaded alongside the existing set and wired into the Tailwind font tokens so the whole app follows.
- Landing headlines get real display treatment: bigger scale, tight tracking, lime/pink word accents kept.
- Body text stays readable at current sizes.

## 5. Trending rail with few campaigns

When there are only 1-2 live campaigns the rail leaves dead space. Fix:

- Repeat the fetched campaigns until the track is wide enough to fill the viewport, then duplicate for the seamless loop, so the rail always looks full.
- Keeps auto-slide, hover pause and reduced-motion behaviour.

## 6. Footer on mobile

- 2x2 grid of link columns on mobile (currently 2 columns stacked tall), 4 across on desktop.
- Tighter spacing, brand row and socials condensed so the section stops eating a full screen.

## 7. Logo everywhere

The new lime "i" mark replaces every current mark:

- New `BrandLogo` component built from the uploaded icon.
- Replaces `StackedLogo` (the three horizontal bars you saw on the login page), `ClipperMark`/`ClipperWordmark` in the app top nav and sidebar, and the broken `/favicon.ico` references in the landing nav and footer.
- Favicon regenerated from the same file.

## Technical notes

- New images go through `lovable-assets` as WebP pointers; registry entries added to `src/assets/art/index.ts` (`top-light-web`, `top-dark-web`).
- Scroll reveal implemented as one `IntersectionObserver` hook (`src/hooks/use-reveal.ts`) plus `.reveal` / `.reveal-in` utilities in `src/index.css`, replacing the per-ref opacity math in `Landing.tsx`.
- Fonts added to the Google Fonts import in `src/index.css`; `tailwind.config.ts` `fontFamily.display` -> Bebas Neue, `fontFamily.sans` -> Barlow (Manrope kept as fallback).
- `src/components/brand/BrandLogo.tsx` becomes the single logo source; `StackedLogo.tsx` deleted after call sites are updated.
- No backend or business-logic changes.
