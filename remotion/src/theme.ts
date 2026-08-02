import { loadFont } from "@remotion/fonts";
import { staticFile } from "remotion";

/* ------------------------------------------------------------------ */
/*  CLIPPER — creator ad. Motion system + beat grid.                    */
/*  Track: 24.12s / 109.96 BPM / 44 beats, first hit @ 0.337s.          */
/* ------------------------------------------------------------------ */

export const FPS = 30;
export const WIDTH = 1080;
export const HEIGHT = 1920;

export const BEAT_ONE = 0.337;
export const BPM = 109.96;
export const PERIOD = 60 / BPM;
export const BEAT_COUNT = 44;
export const TRACK_SECONDS = 24.12;
export const TOTAL_FRAMES = Math.round(TRACK_SECONDS * FPS) + 4;

/** Absolute frame of beat index (0-based). */
export const beatFrame = (i: number) =>
  Math.round((BEAT_ONE + i * PERIOD) * FPS);

/* -------------------------------- palette ------------------------- */
export const C = {
  lime: "#63EC00",
  limeDeep: "#4BC000",
  limeSoft: "#D8FFB8",
  ink: "#101010",
  ink2: "#1E1E1E",
  charcoal: "#222222",
  cream: "#F3F2EC",
  white: "#FFFFFF",
  grey: "#8A8A85",
  hot: "#FF4D2E",
};

export const DISPLAY = "BebasClipper";
export const BODY = "InterClipper";

loadFont({
  family: DISPLAY,
  url: staticFile("fonts/BebasNeue.ttf"),
  weight: "400",
  format: "truetype",
}).catch(() => undefined);

loadFont({
  family: BODY,
  url: staticFile("fonts/Inter-Black.ttf"),
  weight: "900",
  format: "truetype",
}).catch(() => undefined);

loadFont({
  family: BODY,
  url: staticFile("fonts/Inter-Bold.ttf"),
  weight: "700",
  format: "truetype",
}).catch(() => undefined);

/* ------------------------------ motion ---------------------------- */
/** Default punchy on-beat entrance. */
export const HIT = { damping: 13, stiffness: 240, mass: 0.7 };
/** Softer, for large blocks. */
export const GLIDE = { damping: 200 };
/** Overshoot accent for hero moments. */
export const SLAM = { damping: 9, stiffness: 300, mass: 0.9 };
