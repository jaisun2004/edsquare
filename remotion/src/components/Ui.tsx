import React from "react";
import { AbsoluteFill, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { C, body, display } from "../theme";

export const Backdrop: React.FC = () => {
  const frame = useCurrentFrame();
  const drift = Math.sin(frame / 90) * 30;
  return (
    <AbsoluteFill style={{ backgroundColor: C.bg }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(900px 700px at ${12 + drift * 0.4}% ${18 + drift * 0.2}%, #E7D9FA 0%, rgba(231,217,250,0) 65%),
                       radial-gradient(1000px 800px at ${88 - drift * 0.3}% ${86 + drift * 0.15}%, #DCEBFA 0%, rgba(220,235,250,0) 60%)`,
        }}
      />
      <AbsoluteFill
        style={{
          opacity: 0.35,
          backgroundImage:
            "linear-gradient(#E3D8F2 1px, transparent 1px), linear-gradient(90deg, #E3D8F2 1px, transparent 1px)",
          backgroundSize: "72px 72px",
          maskImage: "radial-gradient(70% 70% at 50% 45%, black 0%, transparent 100%)",
        }}
      />
    </AbsoluteFill>
  );
};

export const Logo: React.FC<{ width?: number; style?: React.CSSProperties }> = ({ width = 320, style }) => (
  <Img src={staticFile("images/logo.png")} style={{ width, objectFit: "contain", ...style }} />
);

export const Eyebrow: React.FC<{ children: React.ReactNode; delay?: number }> = ({ children, delay = 0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - delay, fps, config: { damping: 200 } });
  return (
    <div
      style={{
        fontFamily: body,
        fontSize: 22,
        letterSpacing: 4,
        textTransform: "uppercase",
        color: C.accent,
        fontWeight: 600,
        opacity: s,
        transform: `translateY(${interpolate(s, [0, 1], [14, 0])}px)`,
      }}
    >
      {children}
    </div>
  );
};

export const Title: React.FC<{ children: React.ReactNode; delay?: number; size?: number }> = ({
  children,
  delay = 0,
  size = 64,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - delay, fps, config: { damping: 18, stiffness: 120 } });
  return (
    <div
      style={{
        fontFamily: display,
        fontWeight: 700,
        fontSize: size,
        lineHeight: 1.08,
        color: C.ink,
        opacity: s,
        transform: `translateY(${interpolate(s, [0, 1], [26, 0])}px)`,
      }}
    >
      {children}
    </div>
  );
};

/** App screenshot inside light browser chrome. Shows the full screen, uncropped. */
const SHOT_RATIO = 2880 / 1800;

export const Shot: React.FC<{
  src: string;
  delay?: number;
  width?: number;
  height?: number;
  objectPosition?: string;
  scale?: number;
  style?: React.CSSProperties;
  tilt?: number;
}> = ({ src, delay = 0, width = 1080, height, style, tilt = 0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - delay, fps, config: { damping: 200 } });
  const push = interpolate(frame - delay, [0, 400], [1, 1.03], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });
  const innerHeight = height ?? Math.round(width / SHOT_RATIO);
  return (
    <div
      style={{
        width,
        borderRadius: 16,
        overflow: "hidden",
        background: C.card,
        border: `1px solid ${C.line}`,
        boxShadow: "0 40px 90px rgba(46,10,82,0.22)",
        opacity: s,
        transform: `translateY(${interpolate(s, [0, 1], [40, 0])}px) rotate(${tilt}deg)`,
        ...style,
      }}
    >
      <div
        style={{
          height: 34,
          background: "#FBF9FE",
          borderBottom: `1px solid ${C.line}`,
          display: "flex",
          alignItems: "center",
          gap: 8,
          paddingLeft: 14,
        }}
      >
        {["#E4A0A0", "#E9CE93", "#A8D5B5"].map((c) => (
          <div key={c} style={{ width: 10, height: 10, borderRadius: 10, background: c }} />
        ))}
      </div>
      <div style={{ height: innerHeight, overflow: "hidden", background: C.card }}>
        <Img
          src={staticFile(src)}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
            objectPosition: "center center",
            transform: `scale(${push})`,
            transformOrigin: "center center",
          }}
        />
      </div>
    </div>
  );
};

export const Node: React.FC<{
  label: string;
  sub?: string;
  delay?: number;
  tone?: "default" | "primary" | "red" | "green" | "amber";
  width?: number;
  icon?: string;
}> = ({ label, sub, delay = 0, tone = "default", width = 330, icon }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - delay, fps, config: { damping: 14, stiffness: 140 } });
  const tones: Record<string, { bg: string; bd: string; fg: string }> = {
    default: { bg: C.card, bd: C.line, fg: C.ink },
    primary: { bg: "#F3EBFD", bd: "#C7A7EE", fg: C.violetDeep },
    red: { bg: "#FDECEA", bd: "#F3B4AC", fg: C.red },
    green: { bg: "#E7F7F0", bd: "#A6DEC6", fg: C.green },
    amber: { bg: "#FEF4E0", bd: "#F2D08A", fg: "#93610A" },
  };
  const t = tones[tone];
  return (
    <div
      style={{
        width,
        background: t.bg,
        border: `1.5px solid ${t.bd}`,
        borderRadius: 14,
        padding: "18px 20px",
        boxShadow: "0 14px 34px rgba(46,10,82,0.10)",
        opacity: s,
        transform: `translateY(${interpolate(s, [0, 1], [22, 0])}px) scale(${interpolate(s, [0, 1], [0.94, 1])})`,
        display: "flex",
        gap: 14,
        alignItems: "center",
      }}
    >
      {icon && <div style={{ fontSize: 28, lineHeight: 1 }}>{icon}</div>}
      <div>
        <div style={{ fontFamily: display, fontWeight: 600, fontSize: 24, color: t.fg }}>{label}</div>
        {sub && <div style={{ fontFamily: body, fontSize: 17, color: C.muted, marginTop: 4 }}>{sub}</div>}
      </div>
    </div>
  );
};

/** Horizontal animated connector line with arrow head. */
export const Arrow: React.FC<{ width: number; delay?: number; dashed?: boolean; style?: React.CSSProperties }> = ({
  width,
  delay = 0,
  dashed = false,
  style,
}) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame - delay, [0, 18], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <div style={{ width, height: 14, position: "relative", ...style }}>
      <div
        style={{
          position: "absolute",
          top: 6,
          left: 0,
          height: 2,
          width: width * p,
          background: dashed ? "transparent" : C.accent,
          borderTop: dashed ? `2px dashed ${C.accent}` : undefined,
          opacity: 0.85,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: width * p - 8,
          top: 0,
          width: 0,
          height: 0,
          borderLeft: `10px solid ${C.accent}`,
          borderTop: "7px solid transparent",
          borderBottom: "7px solid transparent",
          opacity: p > 0.05 ? 0.9 : 0,
        }}
      />
    </div>
  );
};

export const Caption: React.FC<{ text: string; from: number; to: number }> = ({ text, from, to }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [from, from + 10, to - 10, to], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  if (opacity <= 0.01) return null;
  return (
    <div
      style={{
        position: "absolute",
        bottom: 54,
        left: 0,
        right: 0,
        display: "flex",
        justifyContent: "center",
        opacity,
      }}
    >
      <div
        style={{
          fontFamily: body,
          fontWeight: 500,
          fontSize: 26,
          color: "#FFFFFF",
          background: "rgba(27,11,51,0.86)",
          padding: "12px 26px",
          borderRadius: 12,
          maxWidth: 1400,
          textAlign: "center",
        }}
      >
        {text}
      </div>
    </div>
  );
};

export const SceneFade: React.FC<{ dur: number; children: React.ReactNode }> = ({ dur, children }) => {
  const frame = useCurrentFrame();
  const o = interpolate(frame, [0, 14, dur - 14, dur], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return <AbsoluteFill style={{ opacity: o }}>{children}</AbsoluteFill>;
};

export const FlowBadge: React.FC<{ children: React.ReactNode; delay?: number }> = ({ children, delay = 0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - delay, fps, config: { damping: 16, stiffness: 150 } });
  return (
    <div
      style={{
        display: "inline-block",
        fontFamily: display,
        fontWeight: 700,
        fontSize: 22,
        letterSpacing: 2,
        color: "#fff",
        background: C.violet,
        padding: "8px 18px",
        borderRadius: 8,
        opacity: s,
        transform: `translateX(${interpolate(s, [0, 1], [-26, 0])}px)`,
      }}
    >
      {children}
    </div>
  );
};
