import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { CheckCheck, FolderPlus, Mic, Phone, PhoneOff } from "lucide-react";
import { LANES, LANE_LABEL, type FlowEvent, type Lane } from "@/lib/flow-events";
import type { Colour } from "@/lib/edd-flow";

export interface StampedEvent extends FlowEvent { at: string }

const dot: Record<Colour, string> = { Red: "bg-destructive", Amber: "bg-warning", Green: "bg-success", Manual: "bg-primary" };

export function FlowLanes({ events, live }: { events: StampedEvent[]; live: boolean }) {
  const last = events.at(-1);
  const touched = new Set<Lane>(events.flatMap((e) => [e.from, e.to]));
  const shown = events.slice(-6);
  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="grid grid-cols-9 gap-1">
        {LANES.map((l) => {
          const active = live && last && (last.to === l || last.from === l);
          return (
            <div key={l} className={`rounded-md border px-1 py-2 text-center text-[11px] font-medium transition-all ${active ? "animate-pulse border-primary bg-primary text-primary-foreground shadow-md" : touched.has(l) ? "border-primary/50 bg-primary/10 text-primary" : "text-muted-foreground"}`}>
              {LANE_LABEL[l]}
            </div>
          );
        })}
      </div>
      <div className="mt-2 space-y-1">
        {shown.map((e, i) => {
          const a = LANES.indexOf(e.from), b = LANES.indexOf(e.to);
          const lo = Math.min(a, b), hi = Math.max(a, b);
          const isLast = i === shown.length - 1;
          return (
            <div key={`${e.at}-${i}`} className="relative grid h-6 grid-cols-9 items-center animate-in fade-in slide-in-from-top-1">
              <div className="absolute h-0.5 rounded bg-primary/60" style={{ left: `${(lo / 9) * 100 + 5.5}%`, width: `${Math.max(((hi - lo) / 9) * 100, 1)}%` }} />
              <div className={`absolute h-2.5 w-2.5 rounded-full ${e.colour ? dot[e.colour] : "bg-primary"} ${isLast && live ? "animate-ping" : ""}`} style={{ left: `calc(${(b / 9) * 100 + 5.5}% - 5px)` }} />
              <div className="absolute -top-0.5 truncate rounded bg-card px-1 text-[10px] text-foreground" style={{ left: `${(lo / 9) * 100 + 6}%`, maxWidth: `${Math.max(((hi - lo) / 9) * 100, 30)}%` }}>
                {e.label}{e.ms ? <span className="text-muted-foreground"> · {e.ms} ms</span> : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function EngineConsole({ events }: { events: StampedEvent[] }) {
  const [open, setOpen] = useState<number>();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { ref.current?.scrollTo({ top: ref.current.scrollHeight, behavior: "smooth" }); }, [events.length]);
  return (
    <div className="rounded-lg border bg-sidebar text-sidebar-foreground">
      <div className="flex items-center gap-2 border-b border-sidebar-border px-3 py-2 text-xs font-semibold"><span className="h-2 w-2 animate-pulse rounded-full bg-success" />Engine console</div>
      <div ref={ref} className="h-72 overflow-y-auto p-2 font-mono text-[11px] leading-relaxed">
        {events.length === 0 && <p className="opacity-60">Waiting for an alert…</p>}
        {events.map((e, i) => (
          <div key={i}>
            <button className="w-full text-left hover:opacity-80" onClick={() => setOpen(open === i ? undefined : i)}>
              <span className="opacity-60">{e.at}</span> <span className="text-sidebar-primary">[{LANE_LABEL[e.from]}→{LANE_LABEL[e.to]}]</span> {e.label}
              {e.colour && <span className={`ml-1 inline-block h-2 w-2 rounded-full ${dot[e.colour]}`} />}
            </button>
            {open === i && e.payload && <pre className="my-1 overflow-x-auto rounded bg-sidebar-accent p-2 text-[10px]">{JSON.stringify(e.payload, null, 2)}</pre>}
          </div>
        ))}
      </div>
    </div>
  );
}

function PhoneFrame({ title, children, tone }: { title: string; children: React.ReactNode; tone?: "call" }) {
  return (
    <div className="mx-auto w-64 rounded-[2rem] border-4 border-foreground/80 bg-background p-2 shadow-xl">
      <div className={`rounded-t-[1.5rem] px-3 py-2 text-center text-xs font-semibold ${tone === "call" ? "bg-sidebar text-sidebar-foreground" : "bg-success text-success-foreground"}`}>{title}</div>
      <div className="h-80 space-y-2 overflow-y-auto rounded-b-[1.5rem] bg-muted p-2 text-[11px]">{children}</div>
    </div>
  );
}

export function PhoneCall({ attempt, retries, connected, transcript }: { attempt: number; retries: number; connected: boolean; transcript: { who: "bot" | "cust"; text: string }[] }) {
  const [secs, setSecs] = useState(0);
  useEffect(() => { setSecs(0); if (!connected) return; const t = setInterval(() => setSecs((s) => s + 1), 1000); return () => clearInterval(t); }, [connected, attempt]);
  return (
    <PhoneFrame title={connected ? `Connected · 0:${String(secs).padStart(2, "0")}` : `Calling… attempt ${attempt}/${retries}`} tone="call">
      <div className="flex flex-col items-center gap-2 py-2">
        <div className={`flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground ${connected ? "" : "animate-pulse"}`}>{connected ? <Mic className="h-6 w-6" /> : <Phone className="h-6 w-6" />}</div>
        {connected && <div className="flex h-5 items-end gap-0.5">{Array.from({ length: 16 }).map((_, i) => <span key={i} className="w-1 animate-pulse rounded bg-primary" style={{ height: `${30 + ((i * 37) % 70)}%`, animationDelay: `${i * 80}ms` }} />)}</div>}
      </div>
      {transcript.map((t, i) => (
        <p key={i} className={`max-w-[85%] rounded-lg px-2 py-1 ${t.who === "bot" ? "bg-card" : "ml-auto bg-primary text-primary-foreground"}`}>{t.text}</p>
      ))}
      {!connected && <p className="flex items-center justify-center gap-1 text-muted-foreground"><PhoneOff className="h-3 w-3" />Ringing customer…</p>}
    </PhoneFrame>
  );
}

export function PhoneWhatsApp({ messages }: { messages: { who: "bank" | "cust"; text: string; ticks?: boolean }[] }) {
  return (
    <PhoneFrame title="WhatsApp · Airtel Payments Bank">
      {messages.length === 0 && <p className="text-center text-muted-foreground">No messages yet</p>}
      {messages.map((m, i) => (
        <div key={i} className={`max-w-[85%] rounded-lg px-2 py-1 animate-in fade-in slide-in-from-bottom-1 ${m.who === "bank" ? "bg-card" : "ml-auto bg-success/20"}`}>
          {m.text}{m.ticks && <CheckCheck className="ml-1 inline h-3 w-3 text-primary" />}
        </div>
      ))}
    </PhoneFrame>
  );
}

export function CaseCreatedCard({ caseId, risk, queue, account }: { caseId: string; risk: string; queue: string; account: string }) {
  const [left, setLeft] = useState(48 * 3600);
  useEffect(() => { const t = setInterval(() => setLeft((s) => s - 1), 1000); return () => clearInterval(t); }, []);
  const h = Math.floor(left / 3600), m = Math.floor((left % 3600) / 60), s = left % 60;
  return (
    <div className="flex items-center gap-3 rounded-lg border border-primary bg-primary/5 p-3 text-xs animate-in zoom-in-95">
      <FolderPlus className="h-8 w-8 text-primary" />
      <div className="flex-1 space-y-0.5">
        <p className="text-sm font-semibold">Case <Link to="/cases/$caseId" params={{ caseId }} className="text-primary underline">{caseId}</Link> created</p>
        <p>A/c {account} · Risk {risk} · Routed to {queue}</p>
      </div>
      <div className="text-right"><p className="text-muted-foreground">SLA</p><p className="font-mono text-sm">{h}:{String(m).padStart(2, "0")}:{String(s).padStart(2, "0")}</p></div>
    </div>
  );
}
