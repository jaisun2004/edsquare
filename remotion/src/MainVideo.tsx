import React from "react";
import { AbsoluteFill, Sequence } from "remotion";
import { Backdrop } from "./components/Ui";
import { SCENES } from "./theme";
import { Intro } from "./scenes/Intro";
import { Flow1 } from "./scenes/Flow1";
import { Outcomes } from "./scenes/Outcomes";
import { Flow2 } from "./scenes/Flow2";
import { Flow3 } from "./scenes/Flow3";
import { Results } from "./scenes/Results";
import { Close } from "./scenes/Close";

export const MainVideo: React.FC = () => (
  <AbsoluteFill>
    <Backdrop />
    <Sequence from={SCENES.intro.from} durationInFrames={SCENES.intro.dur}>
      <Intro dur={SCENES.intro.dur} />
    </Sequence>
    <Sequence from={SCENES.flow1.from} durationInFrames={SCENES.flow1.dur}>
      <Flow1 dur={SCENES.flow1.dur} />
    </Sequence>
    <Sequence from={SCENES.outcomes.from} durationInFrames={SCENES.outcomes.dur}>
      <Outcomes dur={SCENES.outcomes.dur} />
    </Sequence>
    <Sequence from={SCENES.flow2.from} durationInFrames={SCENES.flow2.dur}>
      <Flow2 dur={SCENES.flow2.dur} />
    </Sequence>
    <Sequence from={SCENES.flow3.from} durationInFrames={SCENES.flow3.dur}>
      <Flow3 dur={SCENES.flow3.dur} />
    </Sequence>
    <Sequence from={SCENES.results.from} durationInFrames={SCENES.results.dur}>
      <Results dur={SCENES.results.dur} />
    </Sequence>
    <Sequence from={SCENES.close.from} durationInFrames={SCENES.close.dur}>
      <Close dur={SCENES.close.dur} />
    </Sequence>
  </AbsoluteFill>
);
