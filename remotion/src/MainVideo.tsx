import React from "react";
import { AbsoluteFill, Audio, Sequence, interpolate, staticFile, useCurrentFrame } from "remotion";
import { SCENES } from "./scenes/beats";
import { BEAT_COUNT, BODY, C, TOTAL_FRAMES, beatFrame } from "./theme";

/** Persistent bottom bar: wordmark + beat-accurate progress. */
const Footer: React.FC = () => {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [0, TOTAL_FRAMES], [0, 100], { extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ justifyContent: "flex-end", pointerEvents: "none" }}>
      <div style={{ height: 6, width: `${p}%`, background: C.lime, mixBlendMode: "difference" }} />
      <div
        style={{
          padding: "26px 0 44px",
          textAlign: "center",
          fontFamily: BODY,
          fontWeight: 900,
          fontSize: 26,
          letterSpacing: "0.34em",
          color: C.grey,
          mixBlendMode: "difference",
        }}
      >
        CLIPPER
      </div>
    </AbsoluteFill>
  );
};

export const MainVideo: React.FC = () => {
  let cursor = 0;
  return (
    <AbsoluteFill style={{ background: C.ink }}>
      <Audio src={staticFile("audio/track.mp3")} />
      {SCENES.map((scene, i) => {
        const start = cursor;
        const span = scene.span ?? 1;
        cursor += span;
        const from = beatFrame(start);
        const end = start + span >= BEAT_COUNT ? TOTAL_FRAMES : beatFrame(start + span);
        const Comp = scene.C;
        return (
          <Sequence key={i} from={from} durationInFrames={Math.max(1, end - from)}>
            <Comp />
          </Sequence>
        );
      })}
      <Footer />
    </AbsoluteFill>
  );
};
