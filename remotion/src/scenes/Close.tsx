import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { C, body, display } from "../theme";
import { Logo, SceneFade } from "../components/Ui";

export const Close: React.FC<{ dur: number }> = ({ dur }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const a = spring({ frame, fps, config: { damping: 200 } });
  const b = spring({ frame: frame - 24, fps, config: { damping: 16, stiffness: 120 } });
  const c = spring({ frame: frame - 56, fps, config: { damping: 200 } });
  return (
    <SceneFade dur={dur}>
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        <div
          style={{
            fontFamily: display,
            fontWeight: 700,
            fontSize: 104,
            color: C.violetDeep,
            opacity: a,
            transform: `scale(${interpolate(a, [0, 1], [0.94, 1])})`,
          }}
        >
          EDSquare
        </div>
        <div
          style={{
            marginTop: 26,
            fontFamily: display,
            fontWeight: 600,
            fontSize: 46,
            color: C.ink,
            opacity: b,
            transform: `translateY(${interpolate(b, [0, 1], [22, 0])}px)`,
          }}
        >
          AI/ML prioritises.{" "}
          <span style={{ color: C.accent }}>Bank experts decide.</span>
        </div>
        <div
          style={{
            marginTop: 70,
            display: "flex",
            alignItems: "center",
            gap: 18,
            opacity: c,
          }}
        >
          <div style={{ fontFamily: body, fontSize: 24, color: C.muted }}>by</div>
          <Logo width={260} />
        </div>
      </AbsoluteFill>
    </SceneFade>
  );
};
