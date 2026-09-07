import React from "react";
import { Composition } from "remotion";
import { MainVideo } from "./MainVideo";
import { FPS, TOTAL } from "./theme";

export const RemotionRoot: React.FC = () => (
  <Composition id="main" component={MainVideo} durationInFrames={TOTAL} fps={FPS} width={1920} height={1080} />
);
