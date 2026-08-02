import React from "react";
import { AbsoluteFill, Audio, Sequence, staticFile } from "remotion";
import { SCENES } from "./scenes/beats";
import { BEAT_COUNT, C, TOTAL_FRAMES, beatFrame } from "./theme";

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
    </AbsoluteFill>
  );
};
