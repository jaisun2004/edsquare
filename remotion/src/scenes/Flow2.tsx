import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { C, body, display } from "../theme";
import { Arrow, Caption, FlowBadge, Node, SceneFade, Shot, Title } from "../components/Ui";

const channels = [
  { icon: "💬", label: "WhatsApp" },
  { icon: "✉️", label: "Email & SMS" },
  { icon: "📱", label: "Mobile banking" },
  { icon: "💻", label: "Internet banking" },
  { icon: "🧾", label: "Self-service" },
];

export const Flow2: React.FC<{ dur: number }> = ({ dur }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const shotIn = 430;
  const diagram = interpolate(frame, [shotIn - 20, shotIn + 10], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <SceneFade dur={dur}>
      <AbsoluteFill style={{ padding: "90px 110px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
          <FlowBadge>FLOW 2</FlowBadge>
          <Title size={48} delay={6}>
            AI-led customer engagement
          </Title>
        </div>

        <AbsoluteFill style={{ opacity: diagram, top: 230, left: 110, right: 110 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
            <Node icon="❓" label="Further Investigation" sub="Queued from Flow 1" delay={16} tone="amber" width={330} />
            <Arrow width={90} delay={34} />
            <Node icon="🐝" label="HIVE Orchestration" sub="Journey & consent aware" delay={48} tone="primary" width={330} />
            <Arrow width={90} delay={64} />
            <Node icon="🤖" label="Agentic AI Call" sub="Collects customer information" delay={78} width={340} />
          </div>

          <div style={{ marginTop: 56, display: "flex", alignItems: "center", gap: 18 }}>
            <div style={{ fontFamily: body, fontSize: 22, fontWeight: 600, color: C.muted, width: 190 }}>
              No response? Fallback channels
            </div>
            {channels.map((ch, i) => {
              const s = spring({ frame: frame - 110 - i * 10, fps, config: { damping: 14, stiffness: 150 } });
              return (
                <div
                  key={ch.label}
                  style={{
                    background: "#fff",
                    border: `1.5px solid ${C.line}`,
                    borderRadius: 14,
                    padding: "18px 22px",
                    textAlign: "center",
                    width: 210,
                    opacity: s,
                    transform: `translateY(${interpolate(s, [0, 1], [24, 0])}px)`,
                    boxShadow: "0 12px 28px rgba(46,10,82,0.08)",
                  }}
                >
                  <div style={{ fontSize: 32 }}>{ch.icon}</div>
                  <div style={{ fontFamily: display, fontWeight: 600, fontSize: 20, color: C.ink, marginTop: 8 }}>
                    {ch.label}
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ marginTop: 52, display: "flex", alignItems: "center", gap: 24 }}>
            <Node icon="📥" label="Customer Response" sub="Documents, answers, consent" delay={190} width={340} />
            <Arrow width={90} delay={208} />
            <Node icon="⚙️" label="Decision Manager" sub="Re-scores with new evidence" delay={222} tone="primary" width={340} />
            <Arrow width={90} delay={238} />
            <div style={{ display: "flex", gap: 14 }}>
              <Node label="Block" delay={252} tone="red" width={180} />
              <Node label="Unblock" delay={262} tone="green" width={200} />
            </div>
          </div>
        </AbsoluteFill>

        <AbsoluteFill
          style={{
            top: 210,
            opacity: interpolate(frame, [shotIn, shotIn + 20], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
          }}
        >
          <div style={{ display: "flex", justifyContent: "center" }}>
            <div>
              <div style={{ fontFamily: body, fontWeight: 600, fontSize: 22, color: C.muted, marginBottom: 12 }}>
                Engagement Center — outreach, consent and responses in one place
              </div>
              <Shot src="images/engagement.png" delay={shotIn + 4} width={1400} height={620} scale={0.98} />
            </div>
          </div>
        </AbsoluteFill>
      </AbsoluteFill>

      <Caption text="HIVE orchestrates an agentic AI call, then falls back to WhatsApp, email, SMS and banking channels" from={20} to={shotIn - 12} />
      <Caption text="Every response returns to the Decision Manager for a fresh, evidence-backed decision" from={shotIn + 6} to={dur - 8} />
    </SceneFade>
  );
};
