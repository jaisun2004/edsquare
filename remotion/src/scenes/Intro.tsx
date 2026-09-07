import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { C, body, display } from "../theme";
import { Caption, Logo, SceneFade, Shot } from "../components/Ui";

export const Intro: React.FC<{ dur: number }> = ({ dur }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const logoS = spring({ frame, fps, config: { damping: 200 } });
  const titleS = spring({ frame: frame - 26, fps, config: { damping: 16, stiffness: 130 } });
  const subS = spring({ frame: frame - 46, fps, config: { damping: 200 } });

  return (
    <SceneFade dur={dur}>
      <AbsoluteFill style={{ padding: "0 120px", justifyContent: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 80 }}>
          <div style={{ width: 900 }}>
            <div style={{ opacity: logoS, transform: `translateY(${interpolate(logoS, [0, 1], [18, 0])}px)` }}>
              <Logo width={330} />
            </div>
            <div
              style={{
                marginTop: 46,
                fontFamily: display,
                fontWeight: 700,
                fontSize: 118,
                letterSpacing: -2,
                color: C.violetDeep,
                opacity: titleS,
                transform: `translateY(${interpolate(titleS, [0, 1], [30, 0])}px)`,
              }}
            >
              EDSquare
            </div>
            <div
              style={{
                marginTop: 14,
                fontFamily: display,
                fontWeight: 600,
                fontSize: 40,
                lineHeight: 1.25,
                color: C.ink,
                opacity: subS,
                transform: `translateY(${interpolate(subS, [0, 1], [20, 0])}px)`,
              }}
            >
              Intelligent Pre-EDD Triage Engine
            </div>
            <div
              style={{
                marginTop: 12,
                fontFamily: body,
                fontSize: 27,
                color: C.muted,
                opacity: subS,
              }}
            >
              Risk mapping &amp; account resolution for mule and digital-scam accounts
            </div>
            <div
              style={{
                marginTop: 34,
                display: "flex",
                gap: 12,
                opacity: interpolate(frame, [70, 90], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
              }}
            >
              {["Block", "Unblock", "Further Investigation"].map((t, i) => (
                <div
                  key={t}
                  style={{
                    fontFamily: body,
                    fontWeight: 600,
                    fontSize: 21,
                    color: C.violetDeep,
                    background: "#fff",
                    border: `1.5px solid ${C.line}`,
                    borderRadius: 999,
                    padding: "10px 20px",
                    transform: `translateY(${interpolate(frame, [70 + i * 6, 92 + i * 6], [16, 0], {
                      extrapolateLeft: "clamp",
                      extrapolateRight: "clamp",
                    })}px)`,
                  }}
                >
                  {t}
                </div>
              ))}
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <Shot src="images/dashboard.png" delay={40} width={860} height={560} scale={0.62} />
          </div>
        </div>
      </AbsoluteFill>
      <Caption text="EDSquare by mFilterIt — intelligent pre-EDD triage for risk mapping and account resolution" from={30} to={dur - 6} />
    </SceneFade>
  );
};
