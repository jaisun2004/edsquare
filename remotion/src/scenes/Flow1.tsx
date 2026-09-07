import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { C, body } from "../theme";
import { Arrow, Caption, FlowBadge, Node, SceneFade, Shot, Title } from "../components/Ui";

export const Flow1: React.FC<{ dur: number }> = ({ dur }) => {
  const frame = useCurrentFrame();
  const shotIn = 300;
  const diagramOpacity = interpolate(frame, [shotIn - 20, shotIn + 10], [1, 0.0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <SceneFade dur={dur}>
      <AbsoluteFill style={{ padding: "90px 110px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
          <FlowBadge>DETECTION</FlowBadge>
          <Title size={48} delay={6}>
            Initial detection &amp; decision
          </Title>
        </div>

        {/* diagram */}
        <AbsoluteFill style={{ opacity: diagramOpacity, top: 250, left: 110, right: 110 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 26 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
              <Node icon="🔔" label="Alerts / Instances" sub="CRM · models · rules" delay={20} width={370} />
              <Node icon="🗂️" label="Alternate Data" sub="Device, telco, network signals" delay={34} width={370} />
            </div>
            <Arrow width={110} delay={52} dashed />
            <Node
              icon="⚙️"
              label="Decision Manager"
              sub="Models & rules segment every customer"
              delay={66}
              tone="primary"
              width={380}
            />
            <Arrow width={110} delay={90} />
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <Node icon="⛔" label="Block" sub="Confirmed mule" delay={104} tone="red" width={330} />
              <Node icon="✅" label="Unblock" sub="Not a mule" delay={116} tone="green" width={330} />
              <Node icon="❓" label="Further Investigation" sub="Evidence inconclusive" delay={128} tone="amber" width={330} />
            </div>
          </div>
        </AbsoluteFill>

        {/* screenshots take over */}
        <AbsoluteFill
          style={{
            top: 210,
            opacity: interpolate(frame, [shotIn, shotIn + 20], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
          }}
        >
          <div style={{ display: "flex", gap: 40, justifyContent: "center", alignItems: "flex-start" }}>
            <div>
              <Label>Command dashboard</Label>
              <Shot src="images/dashboard.png" delay={shotIn + 4} width={830} />
            </div>
            <div>
              <Label>Alert inbox</Label>
              <Shot src="images/alerts.png" delay={shotIn + 22} width={830} />
            </div>
          </div>
        </AbsoluteFill>
      </AbsoluteFill>

      <Caption text="Alerts, rules and alternate data feed the Decision Manager, which scores and ranks every customer" from={20} to={shotIn - 10} />
      <Caption text="Analysts see the highest-risk cases first, with SLA and risk grade in view" from={shotIn + 6} to={dur - 8} />
    </SceneFade>
  );
};

const Label: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ fontFamily: body, fontWeight: 600, fontSize: 22, color: C.muted, marginBottom: 12 }}>{children}</div>
);
