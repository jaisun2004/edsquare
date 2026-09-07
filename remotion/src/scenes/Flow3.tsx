import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { C, body } from "../theme";
import { Arrow, Caption, FlowBadge, Node, SceneFade, Shot, Title } from "../components/Ui";

export const Flow3: React.FC<{ dur: number }> = ({ dur }) => {
  const frame = useCurrentFrame();
  const shotIn = 260;
  const diagram = interpolate(frame, [shotIn - 20, shotIn + 10], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <SceneFade dur={dur}>
      <AbsoluteFill style={{ padding: "90px 110px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
          <FlowBadge>FLOW 3</FlowBadge>
          <Title size={48} delay={6}>
            Human &amp; branch investigation
          </Title>
        </div>

        <AbsoluteFill style={{ opacity: diagram, top: 250, left: 110, right: 110 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
            <Node icon="🏦" label="Branch / Investigator" sub="Case claimed with full context" delay={16} width={340} />
            <Arrow width={80} delay={34} />
            <Node icon="🔍" label="Evidence & Network" sub="Docs, links, negative database" delay={48} tone="primary" width={340} />
            <Arrow width={80} delay={64} />
            <Node icon="⚙️" label="Decision Manager" sub="Supervisor approval on high risk" delay={78} tone="primary" width={340} />
          </div>
          <div style={{ display: "flex", gap: 20, marginTop: 46, paddingLeft: 900 }}>
            <Node icon="⛔" label="Block" delay={100} tone="red" width={220} />
            <Node icon="✅" label="Unblock" delay={112} tone="green" width={240} />
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
          <div style={{ display: "flex", gap: 40, justifyContent: "center", alignItems: "flex-start" }}>
            <div>
              <Label>Investigations workbench</Label>
              <Shot src="images/investigations.png" delay={shotIn + 4} width={820} height={520} scale={0.68} />
            </div>
            <div style={{ marginTop: 60 }}>
              <Label>Case detail &amp; evidence</Label>
              <Shot src="images/case-detail.png" delay={shotIn + 22} width={780} height={470} scale={0.64} tilt={0.8} />
            </div>
          </div>
        </AbsoluteFill>
      </AbsoluteFill>

      <Caption text="Unresolved cases go to a branch officer or investigator with evidence and network links in one workbench" from={20} to={shotIn - 12} />
      <Caption text="The Decision Manager records the final block or unblock, with approvals where policy requires them" from={shotIn + 6} to={dur - 8} />
    </SceneFade>
  );
};

const Label: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ fontFamily: body, fontWeight: 600, fontSize: 22, color: C.muted, marginBottom: 12 }}>{children}</div>
);
