import { createServerFn } from "@tanstack/react-start";
import { validateVoiceDispatch, type VoiceDispatchInput } from "@/lib/voice";

const DEFAULT_BASE = "https://voice-demo.pharynxai.in/voicekit-api";
const DEFAULT_AGENT = "65c7a6e7-c106-485e-a4a8-b4c0c724a807";

function cfg() {
  const key = process.env["VOICE_API_KEY"];
  if (!key) throw new Error("The voice agent key is not configured.");
  return {
    base: process.env["VOICE_API_BASE"] || DEFAULT_BASE,
    agent: process.env["VOICE_AGENT_ID"] || DEFAULT_AGENT,
    headers: { "Content-Type": "application/json", Accept: "application/json, text/plain, */*", "x-org-id": process.env["VOICE_ORG_ID"] || "1", "x-api-key": key },
  };
}

export const dispatchVoiceCall = createServerFn({ method: "POST" })
  .inputValidator((input: VoiceDispatchInput) => {
    const err = validateVoiceDispatch(input);
    if (err) throw new Error(err);
    return input;
  })
  .handler(async ({ data }) => {
    const c = cfg();
    const started = Date.now();
    try {
      const res = await fetch(`${c.base}/call-agent/dispatch`, {
        method: "POST",
        headers: c.headers,
        body: JSON.stringify({ callAgentId: c.agent, phoneNumber: `+${data.phone}`, sessionInfo: data.session }),
      });
      const body = (await res.text()).slice(0, 2000);
      if (!res.ok) console.error(`Voice dispatch failed [${res.status}]: ${body}`);
      let recordId: string | undefined;
      try { recordId = JSON.parse(body)?.data?.recordId; } catch { /* not json */ }
      return { ok: res.ok, status: res.status, body, recordId, ms: Date.now() - started, since: new Date(started - 5000).toISOString() };
    } catch (e) {
      return { ok: false, status: 0, body: e instanceof Error ? e.message : "Could not reach the voice service.", ms: Date.now() - started, since: new Date(started).toISOString() };
    }
  });

export interface VoiceCallView {
  found: boolean;
  status?: string | undefined;
  callId?: string | undefined;
  startedAt?: string | undefined;
  endedAt?: string | undefined;
  recordingUrl?: string | undefined;
  summary?: string | undefined;
  disposition?: string | undefined;
  transcript: { role: string; text: string }[];
  error?: string | undefined;
}

export const getVoiceCall = createServerFn({ method: "POST" })
  .inputValidator((input: { phone: string; since: string }) => {
    if (!/^\d{10,15}$/.test(input.phone ?? "")) throw new Error("Invalid phone number.");
    if (Number.isNaN(Date.parse(input.since))) throw new Error("Invalid time.");
    return input;
  })
  .handler(async ({ data }): Promise<VoiceCallView> => {
    const c = cfg();
    try {
      const res = await fetch(`${c.base}/call-agent/calls/${c.agent}?page=1&limit=10`, { headers: c.headers });
      const text = await res.text();
      if (!res.ok) return { found: false, transcript: [], error: `Call history failed (${res.status}): ${text.slice(0, 300)}` };
      const j = JSON.parse(text);
      const list: Record<string, unknown>[] = j?.data?.data?.data ?? j?.data?.data ?? [];
      const since = Date.parse(data.since);
      const match = list.find((r) => String(r["calleeNumber"] ?? "").replace(/\D/g, "") === data.phone && Date.parse(String(r["createdAt"] ?? r["startedAt"] ?? 0)) >= since);
      if (!match) return { found: false, transcript: [] };
      const tr = (match["transcript"] as { role?: string; content?: unknown }[] | undefined) ?? [];
      const ar = (match["analysisResult"] as Record<string, unknown> | undefined) ?? {};
      return {
        found: true,
        status: String(match["status"] ?? ""),
        callId: String(match["callId"] ?? ""),
        startedAt: match["startedAt"] as string | undefined,
        endedAt: match["endedAt"] as string | undefined,
        recordingUrl: match["recordingUrl"] as string | undefined,
        summary: ar["call_summary"] as string | undefined,
        disposition: ar["call_disposition"] as string | undefined,
        transcript: tr.map((t) => ({ role: t.role ?? "", text: Array.isArray(t.content) ? t.content.join(" ") : String(t.content ?? "") })).filter((t) => t.text),
      };
    } catch (e) {
      return { found: false, transcript: [], error: e instanceof Error ? e.message : "Could not reach the voice service." };
    }
  });
