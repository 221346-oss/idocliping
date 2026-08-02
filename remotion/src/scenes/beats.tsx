import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, spring } from "remotion";
import {
  Center,
  Chip,
  Counter,
  Display,
  Label,
  Marquee,
  Phone,
  PlatformGlyph,
  Plate,
  Pop,
  Ring,
  Sticker,
  Wipe,
  useHit,
} from "../components/prims";
import { BODY, C, DISPLAY, GLIDE, SLAM } from "../theme";

/* Small local helpers ------------------------------------------------ */
const Bob: React.FC<{ children: React.ReactNode; amp?: number; speed?: number; style?: React.CSSProperties }> = ({
  children,
  amp = 10,
  speed = 0.14,
  style,
}) => {
  const f = useCurrentFrame();
  return (
    <div style={{ transform: `translateY(${Math.sin(f * speed) * amp}px)`, ...style }}>{children}</div>
  );
};

const Drift: React.FC<{ children: React.ReactNode; x?: number; y?: number; scale?: number }> = ({
  children,
  x = 0,
  y = -30,
  scale = 1.06,
}) => {
  const f = useCurrentFrame();
  const p = f / 18;
  return (
    <AbsoluteFill
      style={{
        transform: `translate(${x * p}px, ${y * p}px) scale(${1 + (scale - 1) * p})`,
      }}
    >
      {children}
    </AbsoluteFill>
  );
};

const CampaignCard: React.FC<{
  title: string;
  tag: string;
  rate: string;
  budget: string;
  used: number;
  w?: number;
  accent?: string;
}> = ({ title, tag, rate, budget, used, w = 430, accent = C.lime }) => (
  <div
    style={{
      width: w,
      background: C.ink2,
      borderRadius: 26,
      border: `2px solid rgba(255,255,255,0.09)`,
      overflow: "hidden",
      boxShadow: "0 30px 70px rgba(0,0,0,0.45)",
    }}
  >
    <div
      style={{
        height: w * 0.56,
        background: `linear-gradient(135deg, ${accent} 0%, ${C.limeDeep} 100%)`,
        position: "relative",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 16,
          left: 16,
          background: C.ink,
          color: accent,
          padding: "8px 18px",
          borderRadius: 999,
          fontFamily: BODY,
          fontWeight: 900,
          fontSize: 20,
          letterSpacing: "0.1em",
        }}
      >
        {tag}
      </div>
      <div
        style={{
          position: "absolute",
          bottom: 14,
          right: 16,
          width: 60,
          height: 60,
          borderRadius: 999,
          background: "rgba(0,0,0,0.35)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ width: 0, height: 0, borderLeft: `20px solid ${C.white}`, borderTop: "13px solid transparent", borderBottom: "13px solid transparent", marginLeft: 6 }} />
      </div>
    </div>
    <div style={{ padding: 22 }}>
      <div style={{ fontFamily: BODY, fontWeight: 900, fontSize: 28, color: C.white, letterSpacing: "-0.01em" }}>
        {title}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 16 }}>
        <div style={{ fontFamily: BODY, fontWeight: 700, fontSize: 20, color: C.grey }}>BUDGET</div>
        <div style={{ fontFamily: BODY, fontWeight: 900, fontSize: 22, color: C.white }}>{budget}</div>
      </div>
      <div style={{ height: 10, borderRadius: 99, background: "rgba(255,255,255,0.1)", marginTop: 12 }}>
        <div style={{ width: `${used}%`, height: "100%", borderRadius: 99, background: accent }} />
      </div>
      <div style={{ marginTop: 18, fontFamily: BODY, fontWeight: 700, fontSize: 18, color: C.grey, letterSpacing: "0.1em" }}>
        RATE PER 1M VIEWS
      </div>
      <div style={{ fontFamily: DISPLAY, fontSize: 62, color: accent, lineHeight: 0.9 }}>{rate}</div>
    </div>
  </div>
);

const Logo: React.FC<{ size?: number; color?: string; mark?: string }> = ({
  size = 90,
  color = C.white,
  mark = C.lime,
}) => (
  <div style={{ display: "flex", alignItems: "center", gap: size * 0.28 }}>
    <div style={{ display: "flex", flexDirection: "column", gap: size * 0.1 }}>
      {[1, 0.72, 0.44].map((wf, i) => (
        <div
          key={i}
          style={{ width: size * wf, height: size * 0.2, background: mark, borderRadius: 2 }}
        />
      ))}
    </div>
    <div
      style={{
        fontFamily: DISPLAY,
        fontSize: size * 1.15,
        color,
        letterSpacing: "0.08em",
        lineHeight: 0.9,
      }}
    >
      CLIPPER
    </div>
  </div>
);

/* ------------------------------------------------------------------ */
/*  THE 44 BEATS                                                        */
/* ------------------------------------------------------------------ */

// 1 — BILLS
const B01: React.FC = () => (
  <AbsoluteFill style={{ background: C.cream }}>
    <Marquee text="RENT · BILLS · DATA · FEES ·" y={140} size={90} opacity={0.09} speed={4} />
    <Marquee text="RENT · BILLS · DATA · FEES ·" y={1660} size={90} opacity={0.09} speed={-4} />
    <Center>
      <Pop cfg={SLAM as never} from={0.5}>
        <Display size={330} color={C.ink}>BILLS.</Display>
      </Pop>
    </Center>
  </AbsoluteFill>
);

// 2 — RENT
const B02: React.FC = () => (
  <AbsoluteFill style={{ background: C.cream }}>
    <Marquee text="RENT · BILLS · DATA · FEES ·" y={140} size={90} opacity={0.09} speed={4} />
    <Marquee text="RENT · BILLS · DATA · FEES ·" y={1660} size={90} opacity={0.09} speed={-4} />
    <Center style={{ alignItems: "flex-end" }}>
      <Pop cfg={SLAM as never} from={0.5}>
        <Display size={330} color={C.ink}>RENT.</Display>
      </Pop>
    </Center>
  </AbsoluteFill>
);

// 3 — AGAIN stack
const B03: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: C.cream, justifyContent: "center", overflow: "hidden" }}>
      {[0, 1, 2, 3].map((i) => {
        const s = spring({ frame: f - i * 2, fps: 30, config: { damping: 16, stiffness: 220 } });
        return (
          <div
            key={i}
            style={{
              transform: `translateX(${interpolate(s, [0, 1], [i % 2 ? 700 : -700, i % 2 ? 90 : -90])}px)`,
              opacity: 1 - i * 0.22,
            }}
          >
            <Display size={200} color={C.ink} style={{ textAlign: i % 2 ? "right" : "left" }}>
              AGAIN
            </Display>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

// 4 — ENOUGH slam to lime
const B04: React.FC = () => (
  <AbsoluteFill style={{ background: C.cream }}>
    <Plate color={C.lime} dir="up" />
    <Center>
      <Pop delay={3} cfg={SLAM as never} from={0.3}>
        <Display size={300} color={C.ink}>ENOUGH.</Display>
      </Pop>
    </Center>
  </AbsoluteFill>
);

// 5 — YOU ALREADY
const B05: React.FC = () => (
  <AbsoluteFill style={{ background: C.lime }}>
    <Center style={{ alignItems: "flex-start" }}>
      <Wipe dur={9}>
        <Display size={210} color={C.ink}>YOU</Display>
      </Wipe>
      <Wipe dur={9} delay={4}>
        <Display size={210} color={C.ink}>ALREADY</Display>
      </Wipe>
    </Center>
  </AbsoluteFill>
);

// 6 — SCROLL (moving strip)
const B06: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: C.ink, overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, display: "flex", gap: 26, justifyContent: "center" }}>
        {[0, 1, 2].map((col) => (
          <div
            key={col}
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 26,
              transform: `translateY(${(-((f * (14 + col * 5)) % 800))}px)`,
            }}
          >
            {new Array(8).fill(0).map((_, i) => (
              <div
                key={i}
                style={{
                  width: 300,
                  height: 380,
                  borderRadius: 20,
                  background: (i + col) % 3 === 0 ? C.lime : C.ink2,
                  border: "2px solid rgba(255,255,255,0.08)",
                }}
              />
            ))}
          </div>
        ))}
      </div>
      <AbsoluteFill style={{ background: "linear-gradient(180deg,#101010 0%,rgba(16,16,16,0) 30%,rgba(16,16,16,0) 70%,#101010 100%)" }} />
      <Center>
        <Pop cfg={SLAM as never} from={0.4}>
          <Display size={280} color={C.white}>SCROLL</Display>
        </Pop>
      </Center>
    </AbsoluteFill>
  );
};

// 7 — ALL DAY
const B07: React.FC = () => (
  <AbsoluteFill style={{ background: C.ink, justifyContent: "center", alignItems: "center" }}>
    <Ring size={880} color={C.lime} stroke={14} dash="60 40" speed={-2.4} style={{ position: "absolute" }} />
    <Ring size={640} color="rgba(255,255,255,0.18)" stroke={8} dash="20 22" speed={4} style={{ position: "absolute" }} />
    <Pop cfg={SLAM as never} from={0.4}>
      <Display size={230} color={C.white} style={{ textAlign: "center" }}>ALL<br />DAY</Display>
    </Pop>
  </AbsoluteFill>
);

// 8 — SO GET PAID
const B08: React.FC = () => (
  <AbsoluteFill style={{ background: C.ink }}>
    <Plate color={C.lime} dir="left" />
    <Center>
      <Pop delay={2} cfg={SLAM as never} from={0.4}>
        <Display size={200} color={C.ink} style={{ textAlign: "center" }}>
          SO GET<br />PAID<br />FOR IT
        </Display>
      </Pop>
    </Center>
  </AbsoluteFill>
);

// 9 — Logo burst
const B09: React.FC = () => {
  const s = useHit(0, SLAM as never);
  return (
    <AbsoluteFill style={{ background: C.ink, justifyContent: "center", alignItems: "center" }}>
      {new Array(14).fill(0).map((_, i) => {
        const a = (i / 14) * Math.PI * 2;
        const d = interpolate(s, [0, 1], [0, 640]);
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              width: 16,
              height: 90,
              borderRadius: 99,
              background: i % 2 ? C.lime : "rgba(255,255,255,0.25)",
              transform: `translate(${Math.cos(a) * d}px, ${Math.sin(a) * d}px) rotate(${(a * 180) / Math.PI + 90}deg)`,
              opacity: 1 - s,
            }}
          />
        );
      })}
      <div style={{ transform: `scale(${interpolate(s, [0, 1], [0.4, 1])})` }}>
        <Logo size={120} />
      </div>
    </AbsoluteFill>
  );
};

// 10 — STEP 01 PICK A CAMPAIGN
const StepCard: React.FC<{ n: string; title: string; sub: string; bg: string; fg: string; accent: string }> = ({
  n,
  title,
  sub,
  bg,
  fg,
  accent,
}) => (
  <AbsoluteFill style={{ background: bg }}>
    <Center style={{ alignItems: "flex-start", justifyContent: "flex-start", paddingTop: 420 }}>
      <Pop from={0.6}>
        <Label size={40} color={accent}>STEP {n}</Label>
      </Pop>
      <Wipe delay={3} dur={10}>
        <Display size={200} color={fg} style={{ marginTop: 20 }}>{title}</Display>
      </Wipe>
      <Pop delay={7} from={0.9} rise={20}>
        <div style={{ fontFamily: BODY, fontWeight: 700, fontSize: 44, color: fg, opacity: 0.6, marginTop: 24 }}>
          {sub}
        </div>
      </Pop>
    </Center>
    <div style={{ position: "absolute", right: -140, bottom: -140 }}>
      <Ring size={620} color={accent} stroke={16} dash="80 50" speed={1.6} />
    </div>
  </AbsoluteFill>
);

const B10: React.FC = () => (
  <StepCard n="01" title={"PICK A\nCAMPAIGN"} sub="Brands are already paying." bg={C.ink} fg={C.white} accent={C.lime} />
);

// 11 — campaign cards fan
const B11: React.FC = () => {
  const f = useCurrentFrame();
  const cards = [
    { title: "MUSIC DROP [CLIPS]", tag: "MUSIC", rate: "$1,500", budget: "$1660", used: 12 },
    { title: "GAMING HIGHLIGHTS", tag: "GAMING", rate: "$900", budget: "$4200", used: 38 },
    { title: "UGC — SKINCARE", tag: "UGC", rate: "$1,200", budget: "$2800", used: 61 },
  ];
  return (
    <AbsoluteFill style={{ background: C.ink, justifyContent: "center", alignItems: "center" }}>
      <Marquee text="EXPLORE CAMPAIGNS ·" y={200} size={110} color={C.white} opacity={0.07} speed={5} />
      {cards.map((c, i) => {
        const s = spring({ frame: f - i * 3, fps: 30, config: { damping: 14, stiffness: 200 } });
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              marginLeft: -215,
              marginTop: -320,
              transform: `translate(${interpolate(s, [0, 1], [0, (i - 1) * 300])}px, ${interpolate(s, [0, 1], [200, (i - 1) * -40])}px) rotate(${interpolate(s, [0, 1], [0, (i - 1) * 7])}deg) scale(${interpolate(s, [0, 1], [0.7, 1])})`,
              opacity: interpolate(s, [0, 0.3], [0, 1], { extrapolateRight: "clamp" }),
              zIndex: i === 1 ? 3 : 1,
            }}
          >
            <CampaignCard {...c} />
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

// 12 — STEP 02 CLIP IT
const B12: React.FC = () => (
  <StepCard n="02" title={"CLIP IT"} sub="30 seconds of editing." bg={C.lime} fg={C.ink} accent={C.ink} />
);

// 13 — phone with clip + scrub
const B13: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: C.cream, justifyContent: "center", alignItems: "center" }}>
      <Pop from={0.75} cfg={SLAM as never}>
        <Phone w={470} bg={C.ink}>
          <AbsoluteFill style={{ background: `linear-gradient(160deg, ${C.lime}, ${C.limeDeep})` }} />
          <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
            <div style={{ width: 0, height: 0, borderLeft: `70px solid ${C.ink}`, borderTop: "44px solid transparent", borderBottom: "44px solid transparent", marginLeft: 20 }} />
          </AbsoluteFill>
          <div style={{ position: "absolute", left: 30, right: 30, bottom: 46, height: 12, borderRadius: 99, background: "rgba(0,0,0,0.25)" }}>
            <div style={{ width: `${(f * 7) % 100}%`, height: "100%", borderRadius: 99, background: C.ink }} />
          </div>
        </Phone>
      </Pop>
      <Sticker delay={6} rotate={-10} bg={C.ink} color={C.lime} size={38} style={{ position: "absolute", top: 380, left: 110 }}>
        CUT
      </Sticker>
      <Sticker delay={9} rotate={9} bg={C.ink} color={C.lime} size={38} style={{ position: "absolute", bottom: 340, right: 110 }}>
        EXPORT
      </Sticker>
    </AbsoluteFill>
  );
};

// 14 — STEP 03 POST IT
const B14: React.FC = () => (
  <StepCard n="03" title={"POST IT"} sub="Anywhere you already post." bg={C.ink} fg={C.white} accent={C.lime} />
);

// 15 — platform burst
const B15: React.FC = () => {
  const kinds = ["tiktok", "ig", "yt", "x"] as const;
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: C.lime, justifyContent: "center", alignItems: "center" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 90 }}>
        {kinds.map((k, i) => {
          const s = spring({ frame: f - i * 2.5, fps: 30, config: SLAM });
          return (
            <div
              key={k}
              style={{
                transform: `scale(${interpolate(s, [0, 1], [0.1, 1])}) rotate(${interpolate(s, [0, 1], [-40, 0])}deg)`,
              }}
            >
              <PlatformGlyph kind={k} size={280} color={C.ink} />
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

// 16 — DROP THE LINK
const B16: React.FC = () => (
  <AbsoluteFill style={{ background: C.ink }}>
    <Center>
      <Wipe dur={10}>
        <Display size={230} color={C.white} style={{ textAlign: "center" }}>DROP<br />THE LINK</Display>
      </Wipe>
    </Center>
  </AbsoluteFill>
);

// 17 — url chip typing + check
const B17: React.FC = () => {
  const f = useCurrentFrame();
  const url = "tiktok.com/@you/clip/8842";
  const shown = url.slice(0, Math.min(url.length, Math.floor(f * 2.2)));
  const done = f > url.length / 2.2;
  return (
    <AbsoluteFill style={{ background: C.ink, justifyContent: "center", alignItems: "center" }}>
      <Pop from={0.85} rise={20}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 26,
            background: C.ink2,
            border: `3px solid ${done ? C.lime : "rgba(255,255,255,0.15)"}`,
            borderRadius: 26,
            padding: "34px 44px",
            width: 860,
          }}
        >
          <div style={{ fontFamily: BODY, fontWeight: 700, fontSize: 40, color: C.white, whiteSpace: "nowrap" }}>
            {shown}
            {!done && <span style={{ opacity: f % 12 < 6 ? 1 : 0 }}>|</span>}
          </div>
        </div>
      </Pop>
      {done && (
        <Pop from={0.2} cfg={SLAM as never} style={{ marginTop: 60 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <svg width={90} height={90} viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="44" fill={C.lime} />
              <path d="M30 52 L45 66 L72 36" stroke={C.ink} strokeWidth="11" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <Label size={44} color={C.lime}>SUBMITTED</Label>
          </div>
        </Pop>
      )}
    </AbsoluteFill>
  );
};

// 18 — THAT'S IT.
const B18: React.FC = () => (
  <AbsoluteFill style={{ background: C.lime }}>
    <Center>
      <Pop cfg={SLAM as never} from={0.35}>
        <Display size={280} color={C.ink} style={{ textAlign: "center" }}>THAT’S<br />IT.</Display>
      </Pop>
    </Center>
  </AbsoluteFill>
);

// 19 — NOW WATCH
const B19: React.FC = () => (
  <AbsoluteFill style={{ background: C.ink }}>
    <Center>
      <Drift y={-24} scale={1.08}>
        <Center>
          <Display size={240} color={C.white} style={{ textAlign: "center" }}>NOW<br />WATCH</Display>
        </Center>
      </Drift>
    </Center>
  </AbsoluteFill>
);

// 20+21 — views counter (2 beats)
const B20: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: C.ink, justifyContent: "center", alignItems: "center" }}>
      <Marquee text="VIEWS · VIEWS · VIEWS ·" y={330} size={130} color={C.lime} opacity={0.12} speed={7} />
      <Marquee text="VIEWS · VIEWS · VIEWS ·" y={1450} size={130} color={C.lime} opacity={0.12} speed={-7} />
      <Bob amp={8}>
        <Counter from={0} to={1000000} dur={30} size={210} color={C.lime} />
      </Bob>
      <Label size={44} color={C.white} style={{ marginTop: 30, opacity: 0.7 }}>VIEWS ON YOUR CLIP</Label>
      <div style={{ marginTop: 60, width: 700, height: 16, borderRadius: 99, background: "rgba(255,255,255,0.12)" }}>
        <div
          style={{
            width: `${interpolate(f, [0, 30], [0, 100], { extrapolateRight: "clamp" })}%`,
            height: "100%",
            borderRadius: 99,
            background: C.lime,
          }}
        />
      </div>
    </AbsoluteFill>
  );
};

// 22 — $ slam
const B22: React.FC = () => (
  <AbsoluteFill style={{ background: C.lime }}>
    <Center>
      <Pop cfg={SLAM as never} from={0.1}>
        <Display size={620} color={C.ink}>$</Display>
      </Pop>
    </Center>
  </AbsoluteFill>
);

// 23 — $1,500
const B23: React.FC = () => (
  <AbsoluteFill style={{ background: C.lime }}>
    <Center>
      <Pop cfg={SLAM as never} from={0.5}>
        <Display size={300} color={C.ink}>$1,500</Display>
      </Pop>
    </Center>
  </AbsoluteFill>
);

// 24 — PER 1M VIEWS
const B24: React.FC = () => (
  <AbsoluteFill style={{ background: C.ink }}>
    <Center>
      <Wipe dur={9}>
        <Display size={200} color={C.white} style={{ textAlign: "center" }}>PER 1M<br />VIEWS</Display>
      </Wipe>
      <Pop delay={6} from={0.7} style={{ marginTop: 50 }}>
        <Chip bg={C.lime} size={40} pad="16px 34px">SOME CAMPAIGNS PAY MORE</Chip>
      </Pop>
    </Center>
  </AbsoluteFill>
);

// 25 — wallet ticking
const B25: React.FC = () => (
  <AbsoluteFill style={{ background: C.cream, justifyContent: "center", alignItems: "center" }}>
    <Pop from={0.85} rise={30}>
      <div style={{ width: 840, background: C.white, borderRadius: 34, padding: 60, boxShadow: "0 40px 90px rgba(0,0,0,0.12)" }}>
        <Label size={30} color={C.grey}>CAMPAIGN BALANCE</Label>
        <Counter from={0} to={2480.5} dur={22} decimals={2} prefix="$" size={190} color={C.ink} />
        <div style={{ height: 2, background: "rgba(0,0,0,0.08)", margin: "34px 0" }} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Label size={26} color={C.grey}>REFERRAL BALANCE</Label>
          <div style={{ fontFamily: DISPLAY, fontSize: 70, color: C.limeDeep }}>$312.80</div>
        </div>
      </div>
    </Pop>
  </AbsoluteFill>
);

// 26/27/28 — NO ___
const NoCard: React.FC<{ word: string; flip?: boolean }> = ({ word, flip }) => (
  <AbsoluteFill style={{ background: flip ? C.ink : C.cream }}>
    <Center style={{ alignItems: flip ? "flex-end" : "flex-start" }}>
      <Pop from={0.6} cfg={SLAM as never}>
        <Display size={150} color={flip ? C.lime : C.grey}>NO</Display>
        <Display size={190} color={flip ? C.white : C.ink}>{word}</Display>
      </Pop>
      <div
        style={{
          height: 14,
          width: 520,
          background: C.hot,
          borderRadius: 99,
          marginTop: -110,
          transform: "rotate(-4deg)",
          opacity: 0.9,
        }}
      />
    </Center>
  </AbsoluteFill>
);
const B26: React.FC = () => <NoCard word="CAMERA" />;
const B27: React.FC = () => <NoCard word="FOLLOWERS" flip />;
const B28: React.FC = () => <NoCard word="EXPERIENCE" />;

// 29 — JUST CLIPS.
const B29: React.FC = () => (
  <AbsoluteFill style={{ background: C.lime }}>
    <Center>
      <Pop cfg={SLAM as never} from={0.3}>
        <Display size={310} color={C.ink} style={{ textAlign: "center" }}>JUST<br />CLIPS.</Display>
      </Pop>
    </Center>
  </AbsoluteFill>
);

// 30 — leaderboard bar race
const B30: React.FC = () => {
  const f = useCurrentFrame();
  const rows = [
    { n: "@zaraedits", v: 92, p: "$4,120" },
    { n: "@nightclips", v: 74, p: "$3,050" },
    { n: "YOU", v: 61, p: "$2,480" },
    { n: "@vibecuts", v: 44, p: "$1,760" },
  ];
  return (
    <AbsoluteFill style={{ background: C.ink, justifyContent: "center", padding: 90 }}>
      <Label size={36} color={C.lime} style={{ marginBottom: 40 }}>LEADERBOARD · THIS WEEK</Label>
      {rows.map((r, i) => {
        const s = spring({ frame: f - i * 2, fps: 30, config: { damping: 18, stiffness: 160 } });
        const me = r.n === "YOU";
        return (
          <div key={r.n} style={{ marginBottom: 30, opacity: interpolate(s, [0, 0.3], [0, 1], { extrapolateRight: "clamp" }) }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
              <div style={{ fontFamily: BODY, fontWeight: 900, fontSize: 34, color: me ? C.lime : C.white }}>{r.n}</div>
              <div style={{ fontFamily: BODY, fontWeight: 900, fontSize: 34, color: me ? C.lime : C.grey }}>{r.p}</div>
            </div>
            <div style={{ height: 30, borderRadius: 99, background: "rgba(255,255,255,0.08)" }}>
              <div style={{ width: `${r.v * s}%`, height: "100%", borderRadius: 99, background: me ? C.lime : "rgba(255,255,255,0.28)" }} />
            </div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

// 31 — CLIMB THE RANKS
const B31: React.FC = () => (
  <AbsoluteFill style={{ background: C.ink }}>
    <Plate color={C.lime} dir="down" />
    <Center>
      <Pop delay={3} cfg={SLAM as never} from={0.5}>
        <Display size={210} color={C.ink} style={{ textAlign: "center" }}>CLIMB<br />THE RANKS</Display>
      </Pop>
    </Center>
  </AbsoluteFill>
);

// 32 — reward badge stamp
const B32: React.FC = () => {
  const s = useHit(0, SLAM as never);
  return (
    <AbsoluteFill style={{ background: C.lime, justifyContent: "center", alignItems: "center" }}>
      <Ring size={900} color="rgba(0,0,0,0.15)" stroke={16} dash="90 60" speed={-2} style={{ position: "absolute" }} />
      <div style={{ transform: `scale(${interpolate(s, [0, 1], [2.4, 1])}) rotate(${interpolate(s, [0, 1], [-25, -6])}deg)`, opacity: interpolate(s, [0, 0.25], [0, 1], { extrapolateRight: "clamp" }) }}>
        <div style={{ border: `12px solid ${C.ink}`, borderRadius: 30, padding: "44px 60px", textAlign: "center" }}>
          <Label size={34} color={C.ink}>RANK REWARD</Label>
          <Display size={190} color={C.ink}>UNLOCKED</Display>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// 33 — GET PAID
const B33: React.FC = () => (
  <AbsoluteFill style={{ background: C.ink }}>
    <Center>
      <Wipe dur={8} dir="up">
        <Display size={250} color={C.white}>GET PAID</Display>
      </Wipe>
    </Center>
  </AbsoluteFill>
);

// 34 — payout methods
const B34: React.FC = () => {
  const f = useCurrentFrame();
  const items = ["PAYPAL", "USDT", "BANK"];
  return (
    <AbsoluteFill style={{ background: C.ink, justifyContent: "center", alignItems: "center", gap: 34 }}>
      {items.map((it, i) => {
        const s = spring({ frame: f - i * 3, fps: 30, config: SLAM });
        return (
          <div
            key={it}
            style={{
              transform: `translateX(${interpolate(s, [0, 1], [i % 2 ? 800 : -800, 0])}px) rotate(${interpolate(s, [0, 1], [0, i % 2 ? 2 : -2])}deg)`,
            }}
          >
            <Chip bg={i === 1 ? C.lime : C.cream} color={C.ink} size={92} radius={26} pad="26px 70px">
              {it}
            </Chip>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

// 35 — WITHDRAW ANYTIME
const B35: React.FC = () => (
  <AbsoluteFill style={{ background: C.lime }}>
    <Center>
      <Pop cfg={SLAM as never} from={0.45}>
        <Display size={210} color={C.ink} style={{ textAlign: "center" }}>WITHDRAW<br />ANYTIME</Display>
      </Pop>
      <Pop delay={7} from={0.8} style={{ marginTop: 44 }}>
        <Chip bg={C.ink} color={C.lime} size={38} pad="18px 36px">MIN $20 · NO FEES ON YOU</Chip>
      </Pop>
    </Center>
  </AbsoluteFill>
);

// 36 — payout approved receipt
const B36: React.FC = () => (
  <AbsoluteFill style={{ background: C.cream, justifyContent: "center", alignItems: "center" }}>
    <Pop from={0.8} rise={40}>
      <div style={{ width: 780, background: C.white, borderRadius: 30, padding: 56, boxShadow: "0 40px 90px rgba(0,0,0,0.12)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Label size={28} color={C.grey}>WITHDRAWAL</Label>
          <Chip bg={C.lime} color={C.ink} size={26} pad="10px 22px" radius={99}>PAID</Chip>
        </div>
        <div style={{ fontFamily: DISPLAY, fontSize: 200, color: C.ink, lineHeight: 0.9, marginTop: 20 }}>$2,480</div>
        <div style={{ fontFamily: BODY, fontWeight: 700, fontSize: 32, color: C.grey, marginTop: 16 }}>
          Sent to your wallet
        </div>
      </div>
    </Pop>
  </AbsoluteFill>
);

// 37 — INVITE FRIENDS
const B37: React.FC = () => (
  <AbsoluteFill style={{ background: C.ink }}>
    <Center>
      <Wipe dur={9}>
        <Display size={220} color={C.white} style={{ textAlign: "center" }}>INVITE<br />FRIENDS</Display>
      </Wipe>
    </Center>
  </AbsoluteFill>
);

// 38 — referral network
const B38: React.FC = () => {
  const s = useHit(0, GLIDE as never);
  const nodes = new Array(9).fill(0).map((_, i) => {
    const a = (i / 9) * Math.PI * 2;
    return { x: Math.cos(a) * 340, y: Math.sin(a) * 340 };
  });
  return (
    <AbsoluteFill style={{ background: C.ink, justifyContent: "center", alignItems: "center" }}>
      <svg width={1080} height={1080} style={{ position: "absolute" }}>
        {nodes.map((n, i) => (
          <line
            key={i}
            x1={540}
            y1={540}
            x2={540 + n.x * s}
            y2={540 + n.y * s}
            stroke={C.lime}
            strokeWidth={4}
            opacity={0.5}
          />
        ))}
      </svg>
      {nodes.map((n, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            width: 92,
            height: 92,
            borderRadius: 99,
            background: i % 3 === 0 ? C.lime : C.ink2,
            border: `3px solid ${C.lime}`,
            transform: `translate(${n.x * s}px, ${n.y * s}px) scale(${s})`,
          }}
        />
      ))}
      <div style={{ width: 170, height: 170, borderRadius: 99, background: C.lime, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 3 }}>
        <Display size={80} color={C.ink}>YOU</Display>
      </div>
    </AbsoluteFill>
  );
};

// 39 — 5% FOREVER
const B39: React.FC = () => (
  <AbsoluteFill style={{ background: C.lime }}>
    <Center>
      <Pop cfg={SLAM as never} from={0.3}>
        <Display size={380} color={C.ink}>5%</Display>
      </Pop>
      <Pop delay={5} from={0.7}>
        <Display size={130} color={C.ink} style={{ textAlign: "center" }}>OF THEIRS.
FOREVER.</Display>
      </Pop>
    </Center>
  </AbsoluteFill>
);

// 40 — flash montage
const B40: React.FC = () => {
  const f = useCurrentFrame();
  const words = ["CLIP", "POST", "TRACK", "EARN", "REPEAT"];
  const idx = Math.floor(f / 3) % words.length;
  const bgs = [C.lime, C.ink, C.cream, C.ink, C.lime];
  return (
    <AbsoluteFill style={{ background: bgs[idx] }}>
      <Center>
        <Display size={280} color={bgs[idx] === C.ink ? C.lime : C.ink}>{words[idx]}</Display>
      </Center>
    </AbsoluteFill>
  );
};

// 41 — LESS WORK.
const B41: React.FC = () => (
  <AbsoluteFill style={{ background: C.ink }}>
    <Center style={{ alignItems: "flex-start" }}>
      <Wipe dur={8}>
        <Display size={200} color={C.grey}>LESS WORK.</Display>
      </Wipe>
    </Center>
  </AbsoluteFill>
);

// 42 — MORE RETURNS.
const B42: React.FC = () => (
  <AbsoluteFill style={{ background: C.ink }}>
    <Center style={{ alignItems: "flex-start", justifyContent: "center" }}>
      <Display size={200} color={C.grey} style={{ opacity: 0.35 }}>LESS WORK.</Display>
      <Wipe dur={8}>
        <Display size={200} color={C.lime}>MORE
RETURNS.</Display>
      </Wipe>
    </Center>
  </AbsoluteFill>
);

// 43 — logo lockup
const B43: React.FC = () => (
  <AbsoluteFill style={{ background: C.lime, justifyContent: "center", alignItems: "center" }}>
    <Pop cfg={SLAM as never} from={0.6}>
      <Logo size={150} color={C.ink} mark={C.ink} />
    </Pop>
  </AbsoluteFill>
);

// 44 — CTA
const B44: React.FC = () => (
  <AbsoluteFill style={{ background: C.lime, justifyContent: "center", alignItems: "center" }}>
    <Bob amp={6} speed={0.1}>
      <Logo size={110} color={C.ink} mark={C.ink} />
    </Bob>
    <Pop delay={4} from={0.7} style={{ marginTop: 70 }}>
      <Display size={170} color={C.ink} style={{ textAlign: "center" }}>START<br />EARNING</Display>
    </Pop>
    <Pop delay={9} from={0.8} style={{ marginTop: 46 }}>
      <Chip bg={C.ink} color={C.lime} size={44} pad="26px 56px" radius={999}>
        iclips.lovable.app
      </Chip>
    </Pop>
  </AbsoluteFill>
);

/* ------------------------------------------------------------------ */

export type BeatScene = { span?: number; C: React.FC };

export const SCENES: BeatScene[] = [
  { C: B01 }, { C: B02 }, { C: B03 }, { C: B04 },
  { C: B05 }, { C: B06 }, { C: B07 }, { C: B08 },
  { C: B09 }, { C: B10 }, { C: B11 }, { C: B12 },
  { C: B13 }, { C: B14 }, { C: B15 }, { C: B16 },
  { C: B17 }, { C: B18 }, { C: B19 },
  { C: B20, span: 2 },
  { C: B22 }, { C: B23 }, { C: B24 }, { C: B25 },
  { C: B26 }, { C: B27 }, { C: B28 }, { C: B29 },
  { C: B30 }, { C: B31 }, { C: B32 }, { C: B33 },
  { C: B34 }, { C: B35 }, { C: B36 }, { C: B37 },
  { C: B38 }, { C: B39 }, { C: B40 }, { C: B41 },
  { C: B42 }, { C: B43 }, { C: B44 },
];
