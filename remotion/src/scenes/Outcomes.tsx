import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { C, body, display } from "../theme";
import { Caption, SceneFade, Title } from "../components/Ui";

const items = [
  { icon: "⛔", title: "Block", sub: "Confirmed mule", color: C.red, bg: "#FDECEA", bd: "#F3B4AC" },
  { icon: "✅", title: "Unblock", sub: "Not a mule — account stays open", color: C.green, bg: "#E7F7F0", bd: "#A6DEC6" },
  { icon: "❓", title: "Further Investigation", sub: "Evidence not conclusive yet", color: "#93610A", bg: "#FEF4E0", bd: "#F2D08A" },
];

export const Outcomes: React.FC<{ dur: number }> = ({ dur }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <SceneFade dur={dur}>
      <AbsoluteFill style={{ padding: "120px 140px" }}>
        <Title size={54}>Three decision outcomes</Title>
        <div style={{ fontFamily: body, fontSize: 26, color: C.muted, marginTop: 12 }}>
          Every risk-mapped customer resolves to one of three states.
        </div>
        <div style={{ display: "flex", gap: 34, marginTop: 90 }}>
          {items.map((it, i) => {
            const s = spring({ frame: frame - 20 - i * 14, fps, config: { damping: 13, stiffness: 130 } });
            return (
              <div
                key={it.title}
                style={{
                  flex: 1,
                  background: it.bg,
                  border: `2px solid ${it.bd}`,
                  borderRadius: 22,
                  padding: "46px 40px",
                  opacity: s,
                  transform: `translateY(${interpolate(s, [0, 1], [50, 0])}px) scale(${interpolate(s, [0, 1], [0.92, 1])})`,
                  boxShadow: "0 24px 50px rgba(46,10,82,0.10)",
                }}
              >
                <div style={{ fontSize: 62 }}>{it.icon}</div>
                <div style={{ fontFamily: display, fontWeight: 700, fontSize: 46, color: it.color, marginTop: 22 }}>
                  {it.title}
                </div>
                <div style={{ fontFamily: body, fontSize: 24, color: C.muted, marginTop: 10 }}>{it.sub}</div>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
      <Caption text="Block a confirmed mule, unblock a clean account, or route the rest to further investigation" from={26} to={dur - 8} />
    </SceneFade>
  );
};
