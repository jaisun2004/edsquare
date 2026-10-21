import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { sendAccountBlockedWhatsApp, sendWhatsAppText } from "@/lib/whatsapp.functions";
import { SUPPORT_NUMBER } from "@/lib/whatsapp";
import { normalisePhone } from "@/lib/voice";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { integrations } from "@/data/edd";
import { useEDD } from "@/lib/edd-store";

const descriptions: Record<string, string> = {
  "INT-1": "Pushes block and unblock instructions to the core banking platform.",
  "INT-2": "Queries the internal Negative Database for identifier matches.",
  "INT-3": "Retrieves SIM vintage, connection type and circle for a mobile number.",
  "INT-4": "Places outbound verification calls and returns transcripts and outcomes.",
  "INT-5": "Sends templated customer outreach messages over WhatsApp.",
  "INT-6": "Streams adverse media and OSINT signals into enrichment.",
};

export const Route = createFileRoute("/admin/integrations")({
  head: () => ({
    meta: [
      { title: "Integrations — EDSquare" },
      { name: "description", content: "Enable or disable core banking, Negative Database, telco, OSINT and engagement integrations." },
      { property: "og:title", content: "Integrations — EDSquare" },
      { property: "og:description", content: "Connected services powering enrichment, engagement and enforcement." },
    ],
  }),
  component: IntegrationsPage,
});

function IntegrationsPage() {
  const { role } = useEDD();

  return (
    <div className="space-y-4">
    <WhatsAppTest />
    <div className="grid gap-4 md:grid-cols-2">
      {integrations.map((i) => (
        <Card key={i.id}>
          <CardContent className="flex items-start justify-between gap-4 pt-6">
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-foreground">{i.name}</p>
                <Badge variant="outline">{i.status ? "Connected" : "Disabled"}</Badge>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{descriptions[i.id] ?? "Platform integration."}</p>
            </div>
            <Switch defaultChecked={i.status} disabled={role !== "admin"} />
          </CardContent>
        </Card>
      ))}
    </div>
      </div>
  );
}

function WhatsAppTest() {
  const tpl = useServerFn(sendAccountBlockedWhatsApp);
  const txt = useServerFn(sendWhatsAppText);
  const [raw, setRaw] = useState("");
  const [kind, setKind] = useState<"template" | "text" | "both">("both");
  const [busy, setBusy] = useState(false);
  const [out, setOut] = useState<string[]>([]);
  const phone = normalisePhone(raw);
  async function go() {
    setBusy(true); setOut([]);
    const lines: string[] = [];
    try {
      if (kind !== "text") { const r = await tpl({ data: { to: phone, account_number: "23434541234", support_number: SUPPORT_NUMBER, language: "en" } }); lines.push(`Template: ${r.ok ? "accepted by WhatsApp" : "NOT accepted"} · HTTP ${r.status} · ${r.body}`); }
      if (kind !== "template") { const r = await txt({ data: { to: phone, message: "EDSquare WhatsApp test message." } }); lines.push(`Free text: ${r.ok ? "accepted (delivered only inside the 24-hour chat window)" : "NOT accepted"} · HTTP ${r.status} · ${r.body}`); }
    } catch (e) { lines.push(e instanceof Error ? e.message : "Send failed"); }
    setOut(lines); setBusy(false);
  }
  return (
    <Card>
      <CardHeader><CardTitle className="text-sm">WhatsApp test</CardTitle></CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="flex flex-wrap gap-2">
          <Input className="w-48" placeholder="10-digit mobile" value={raw} onChange={(e) => setRaw(e.target.value.replace(/[^\d+ ]/g, ""))} />
          <Select value={kind} onValueChange={(v) => setKind(v as typeof kind)}><SelectTrigger className="w-56"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="both">Template + free text</SelectItem><SelectItem value="template">Account blocked template</SelectItem><SelectItem value="text">Free text only</SelectItem></SelectContent></Select>
          <Button size="sm" disabled={busy || !/^\d{12,15}$/.test(phone)} onClick={() => void go()}>{busy ? "Sending…" : "Send test"}</Button>
        </div>
        {out.map((l, i) => <p key={i} className="break-all rounded bg-muted p-2 text-xs">{l}</p>)}
        <p className="text-xs text-muted-foreground">The template reaches any number. Free text arrives only if that phone messaged the bank's WhatsApp number in the last 24 hours.</p>
      </CardContent>
    </Card>
  );
}
