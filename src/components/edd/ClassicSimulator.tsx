// Transaction pipeline: compose a transaction, then run it through the same sheet flow (real call / WhatsApp) as the I4C & Model tab.
import { useState } from "react";
import { Play, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { scenarios, toWorkbook, type TxnInput } from "@/data/scenarios";
import { WorkbookFlow } from "@/components/edd/WorkbookFlow";

const STAGES = ["Transaction", "Alert raised", "Data checks", "AI voice call", "WhatsApp questionnaire", "Email & app alert", "Case / manual queue", "Human decision", "Enforcement"];

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1"><Label className="text-xs">{label}</Label>{children}</div>;
}

export function ClassicSimulator() {
  const [scenarioId, setScenarioId] = useState("mule");
  const [input, setInput] = useState<TxnInput>(scenarios[0]!.input);
  const [loaded, setLoaded] = useState<{ n: number; w: ReturnType<typeof toWorkbook> } | null>(null);
  const set = <K extends keyof TxnInput>(k: K, v: TxnInput[K]) => setInput((p) => ({ ...p, [k]: v }));
  const pick = (id: string) => { setScenarioId(id); setInput(scenarios.find((s) => s.id === id)!.input); };
  const num = (k: "amount" | "counterparties" | "accountAgeDays" | "dormantDays" | "passThroughPct" | "complaints" | "avgDailyCredit" | "prior2dCredits") => (
    <Input type="number" value={input[k]} disabled={!!loaded} onChange={(e) => set(k, Number(e.target.value) || 0)} />
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="flex flex-wrap gap-1 pt-4">
          {STAGES.map((s, i) => <span key={s} className="rounded-full border px-2 py-0.5 text-xs text-muted-foreground">{i + 1}. {s}</span>)}
          <p className="basis-full pt-1 text-xs text-muted-foreground">A composed transaction becomes a Model alert and follows the scenario sheet: Mod Script on the call (Debits & Credits script when money moves out), Mod Bitly questionnaire on WhatsApp.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between"><CardTitle className="text-base">Compose transaction</CardTitle>
          {loaded && <Button size="sm" variant="outline" onClick={() => setLoaded(null)}><RotateCcw className="mr-2 h-4 w-4" />Edit transaction</Button>}
        </CardHeader>
        <CardContent className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Scenario">
            <Select value={scenarioId} onValueChange={pick} disabled={!!loaded}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{scenarios.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Customer"><Input value={input.customer} disabled={!!loaded} onChange={(e) => set("customer", e.target.value)} /></Field>
          <Field label="Account"><Input value={input.account} disabled={!!loaded} onChange={(e) => set("account", e.target.value)} /></Field>
          <Field label="Channel">
            <Select value={input.channel} onValueChange={(v) => set("channel", v as TxnInput["channel"])} disabled={!!loaded}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{(["UPI", "IMPS", "NEFT"] as const).map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Amount (Rs)">{num("amount")}</Field>
          <Field label="Counterparties">{num("counterparties")}</Field>
          <Field label="Account age (days)">{num("accountAgeDays")}</Field>
          <Field label="Pass-through %">{num("passThroughPct")}</Field>
          <Field label="Average daily credit (Rs)">{num("avgDailyCredit")}</Field>
          <Field label="Other credits in last 2 days (Rs)">{num("prior2dCredits")}</Field>
          <div className="flex items-center justify-between rounded-md border px-3 py-2"><span>Negative Database hit</span><Switch checked={input.negbaseHit} disabled={!!loaded} onCheckedChange={(v) => set("negbaseHit", v)} /></div>
          <div className="lg:col-span-3 flex items-end">
            {!loaded && <Button onClick={() => setLoaded({ n: Date.now(), w: toWorkbook(input) })}><Play className="mr-2 h-4 w-4" />Raise alert and continue</Button>}
            {loaded && <p className="text-xs text-muted-foreground">Alert raised. Enter the customer's mobile below and press Run flow for a real AI call and WhatsApp.</p>}
          </div>
        </CardContent>
      </Card>

      {loaded && <WorkbookFlow key={loaded.n} custom={loaded.w} />}
    </div>
  );
}
