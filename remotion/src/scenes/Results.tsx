import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { C, body } from "../theme";
import { Caption, SceneFade, Shot, Title } from "../components/Ui";

export const Results: React.FC<{ dur: number }> = ({ dur }) => {
  const frame = useCurrentFrame();
  return (
    <SceneFade dur={dur}>
      <AbsoluteFill style={{ padding: "80px 110px" }}>
        <Title size={48}>Enforcement, audit &amp; reporting</Title>
        <div
          style={{
            fontFamily: body,
            fontSize: 25,
            color: C.muted,
            marginTop: 10,
            opacity: interpolate(frame, [14, 30], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
          }}
        >
          Every action pushed to core banking with reason, approver and a full audit trail.
        </div>
        <div style={{ display: "flex", gap: 40, marginTop: 40, justifyContent: "center" }}>
          <div>
            <Label>Enforcement log</Label>
            <Shot src="images/enforcement.png" delay={20} width={820} height={520} scale={0.68} />
          </div>
          <div style={{ marginTop: 60 }}>
            <Label>Reports &amp; MIS</Label>
            <Shot src="images/reports.png" delay={40} width={780} height={460} scale={0.64} tilt={0.8} />
          </div>
        </div>
      </AbsoluteFill>
      <Caption text="Leadership gets a live view of volumes, outcomes and turnaround times" from={26} to={dur - 8} />
    </SceneFade>
  );
};

const Label: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ fontFamily: body, fontWeight: 600, fontSize: 22, color: C.muted, marginBottom: 12 }}>{children}</div>
);
