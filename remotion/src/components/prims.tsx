import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { BODY, C, DISPLAY, GLIDE, HIT, SLAM } from "../theme";

/* ------------------------------------------------------------------ */
/*  Shared primitives — flat vector motion-graphics kit                 */
/* ------------------------------------------------------------------ */

export const useHit = (delay = 0, cfg = HIT) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: frame - delay, fps, config: cfg });
};

/** Pop-in wrapper: scale + rise, on the beat. */
export const Pop: React.FC<{
  children: React.ReactNode;
  delay?: number;
  from?: number;
  rise?: number;
  cfg?: Record<string, number>;
  style?: React.CSSProperties;
}> = ({ children, delay = 0, from = 0.7, rise = 40, cfg = HIT, style }) => {
  const s = useHit(delay, cfg as never);
  return (
    <div
      style={{
        transform: `translateY(${interpolate(s, [0, 1], [rise, 0])}px) scale(${interpolate(
          s,
          [0, 1],
          [from, 1],
        )})`,
        opacity: interpolate(s, [0, 0.35], [0, 1], { extrapolateRight: "clamp" }),
        ...style,
      }}
    >
      {children}
    </div>
  );
};

/** Word revealed behind a wiping mask (reference-style clip reveal). */
export const Wipe: React.FC<{
  children: React.ReactNode;
  delay?: number;
  dir?: "left" | "up";
  dur?: number;
  style?: React.CSSProperties;
}> = ({ children, delay = 0, dir = "left", dur = 12, style }) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame - delay, [0, dur], [0, 100], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const inset =
    dir === "left" ? `0% ${100 - p}% 0% 0%` : `${100 - p}% 0% 0% 0%`;
  return <div style={{ clipPath: `inset(${inset})`, ...style }}>{children}</div>;
};

export const Display: React.FC<{
  children: React.ReactNode;
  size?: number;
  color?: string;
  lh?: number;
  style?: React.CSSProperties;
}> = ({ children, size = 240, color = C.ink, lh = 0.82, style }) => (
  <div
    style={{
      fontFamily: DISPLAY,
      fontSize: size,
      lineHeight: lh,
      color,
      letterSpacing: "-0.01em",
      textTransform: "uppercase",
      whiteSpace: "pre-line",
      ...style,
    }}
  >
    {children}
  </div>
);

export const Label: React.FC<{
  children: React.ReactNode;
  size?: number;
  color?: string;
  weight?: number;
  style?: React.CSSProperties;
}> = ({ children, size = 34, color = C.ink, weight = 900, style }) => (
  <div
    style={{
      fontFamily: BODY,
      fontWeight: weight,
      fontSize: size,
      color,
      letterSpacing: "0.14em",
      textTransform: "uppercase",
      ...style,
    }}
  >
    {children}
  </div>
);

/** Boxed highlight word — the signature device from the reference. */
export const Chip: React.FC<{
  children: React.ReactNode;
  bg?: string;
  color?: string;
  size?: number;
  radius?: number;
  pad?: string;
  style?: React.CSSProperties;
}> = ({ children, bg = C.lime, color = C.ink, size = 64, radius = 18, pad = "14px 30px", style }) => (
  <span
    style={{
      display: "inline-block",
      background: bg,
      color,
      borderRadius: radius,
      padding: pad,
      fontFamily: BODY,
      fontWeight: 900,
      fontSize: size,
      letterSpacing: "-0.01em",
      ...style,
    }}
  >
    {children}
  </span>
);

/** Ticking number with easing, formatted. */
export const Counter: React.FC<{
  from: number;
  to: number;
  dur: number;
  delay?: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  size?: number;
  color?: string;
}> = ({ from, to, dur, delay = 0, prefix = "", suffix = "", decimals = 0, size = 220, color = C.ink }) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame - delay, [0, dur], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const eased = 1 - Math.pow(1 - p, 3);
  const v = from + (to - from) * eased;
  const text =
    decimals > 0
      ? v.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
      : Math.round(v).toLocaleString("en-US");
  return (
    <div
      style={{
        fontFamily: DISPLAY,
        fontSize: size,
        lineHeight: 0.85,
        color,
        fontVariantNumeric: "tabular-nums",
      }}
    >
      {prefix}
      {text}
      {suffix}
    </div>
  );
};

/** Full-bleed colour plate that slams in from an edge. */
export const Plate: React.FC<{
  color: string;
  dir?: "up" | "down" | "left" | "right";
  delay?: number;
  children?: React.ReactNode;
}> = ({ color, dir = "up", delay = 0, children }) => {
  const s = useHit(delay, GLIDE as never);
  const off = interpolate(s, [0, 1], [100, 0]);
  const t =
    dir === "up"
      ? `translateY(${off}%)`
      : dir === "down"
        ? `translateY(${-off}%)`
        : dir === "left"
          ? `translateX(${off}%)`
          : `translateX(${-off}%)`;
  return (
    <AbsoluteFill style={{ background: color, transform: t }}>{children}</AbsoluteFill>
  );
};

/** Rotating dashed ring / energy halo. */
export const Ring: React.FC<{
  size: number;
  color?: string;
  stroke?: number;
  dash?: string;
  speed?: number;
  style?: React.CSSProperties;
}> = ({ size, color = C.lime, stroke = 10, dash = "36 26", speed = 3, style }) => {
  const frame = useCurrentFrame();
  return (
    <svg width={size} height={size} style={{ transform: `rotate(${frame * speed}deg)`, ...style }}>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={size / 2 - stroke}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeDasharray={dash}
        strokeLinecap="round"
      />
    </svg>
  );
};

/** Repeating marquee strip of a word — texture layer. */
export const Marquee: React.FC<{
  text: string;
  y: number;
  speed?: number;
  size?: number;
  color?: string;
  opacity?: number;
  angle?: number;
}> = ({ text, y, speed = 6, size = 120, color = C.ink, opacity = 0.12, angle = 0 }) => {
  const frame = useCurrentFrame();
  const shift = (frame * speed) % 1000;
  return (
    <div
      style={{
        position: "absolute",
        top: y,
        left: -500,
        width: 3000,
        display: "flex",
        gap: 60,
        transform: `translateX(${-shift}px) rotate(${angle}deg)`,
        opacity,
        whiteSpace: "nowrap",
      }}
    >
      {new Array(10).fill(0).map((_, i) => (
        <span
          key={i}
          style={{
            fontFamily: DISPLAY,
            fontSize: size,
            color,
            lineHeight: 1,
            textTransform: "uppercase",
          }}
        >
          {text}
        </span>
      ))}
    </div>
  );
};

/** Sharp diagonal sticker tag. */
export const Sticker: React.FC<{
  children: React.ReactNode;
  bg?: string;
  color?: string;
  rotate?: number;
  delay?: number;
  size?: number;
  style?: React.CSSProperties;
}> = ({ children, bg = C.ink, color = C.lime, rotate = -8, delay = 0, size = 40, style }) => {
  const s = useHit(delay, SLAM as never);
  return (
    <div
      style={{
        transform: `rotate(${rotate}deg) scale(${interpolate(s, [0, 1], [0.2, 1])})`,
        opacity: interpolate(s, [0, 0.3], [0, 1], { extrapolateRight: "clamp" }),
        background: bg,
        color,
        padding: "16px 34px",
        borderRadius: 999,
        fontFamily: BODY,
        fontWeight: 900,
        fontSize: size,
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        ...style,
      }}
    >
      {children}
    </div>
  );
};

/** Simple platform glyphs (vector, no external assets). */
export const PlatformGlyph: React.FC<{ kind: "tiktok" | "ig" | "yt" | "x"; size: number; color: string }> = ({
  kind,
  size,
  color,
}) => {
  const s = size;
  if (kind === "yt") {
    return (
      <svg width={s} height={s} viewBox="0 0 100 100">
        <rect x="6" y="22" width="88" height="56" rx="16" fill={color} />
        <path d="M42 38 L66 50 L42 62 Z" fill={C.lime} />
      </svg>
    );
  }
  if (kind === "ig") {
    return (
      <svg width={s} height={s} viewBox="0 0 100 100">
        <rect x="12" y="12" width="76" height="76" rx="22" fill="none" stroke={color} strokeWidth="9" />
        <circle cx="50" cy="50" r="18" fill="none" stroke={color} strokeWidth="9" />
        <circle cx="72" cy="28" r="6" fill={color} />
      </svg>
    );
  }
  if (kind === "x") {
    return (
      <svg width={s} height={s} viewBox="0 0 100 100">
        <path d="M20 16 L80 84 M80 16 L20 84" stroke={color} strokeWidth="12" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg width={s} height={s} viewBox="0 0 100 100">
      <path
        d="M58 12 c4 14 14 22 28 23 v18 c-11 0-21-4-28-10 v27 c0 17-13 30-30 30 S-2 87-2 70 s13-30 30-30 c2 0 4 0 6 1 v19 c-2-1-4-1-6-1 c-6 0-11 5-11 11 s5 11 11 11 s11-5 11-11 V12 z"
        fill={color}
        transform="translate(6,0)"
      />
    </svg>
  );
};

/** Phone frame with a clip inside. */
export const Phone: React.FC<{
  children?: React.ReactNode;
  w?: number;
  bg?: string;
  border?: string;
  style?: React.CSSProperties;
}> = ({ children, w = 340, bg = C.ink, border = C.ink, style }) => (
  <div
    style={{
      width: w,
      height: w * 2.03,
      borderRadius: w * 0.14,
      background: bg,
      border: `${Math.round(w * 0.035)}px solid ${border}`,
      overflow: "hidden",
      position: "relative",
      boxShadow: "0 40px 90px rgba(0,0,0,0.28)",
      ...style,
    }}
  >
    {children}
  </div>
);

export const Center: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({
  children,
  style,
}) => (
  <AbsoluteFill
    style={{ justifyContent: "center", alignItems: "center", padding: 90, ...style }}
  >
    {children}
  </AbsoluteFill>
);
