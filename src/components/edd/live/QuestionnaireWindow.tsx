import { Lock, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { ScriptQuestion } from "@/data/workbook";
import type { Colour } from "@/lib/edd-flow";

const tone: Record<Colour, string> = { Red: "bg-destructive/10 text-destructive", Amber: "bg-warning/15 text-warning-foreground", Green: "bg-success/15 text-success", Manual: "bg-primary/10 text-primary" };

interface Props {
  amount: number; last4: string; qs: ScriptQuestion[]; answers: Record<string, string>;
  started: boolean; busy: boolean; flag: number; colour: Colour;
  points: (q: ScriptQuestion, a: string) => number;
  onStart: () => void; onNoReply: () => void; onAnswer: (id: string, a: string) => void; onSubmit: () => void;
}

export function QuestionnaireWindow(p: Props) {
  const done = p.qs.filter((q) => p.answers[q.id]).length;
  return (
    <div className="overflow-hidden rounded-lg border shadow-lg animate-in zoom-in-95">
      <div className="flex items-center gap-2 border-b bg-muted px-3 py-2">
        <span className="h-2.5 w-2.5 rounded-full bg-destructive/70" /><span className="h-2.5 w-2.5 rounded-full bg-warning" /><span className="h-2.5 w-2.5 rounded-full bg-success" />
        <div className="ml-2 flex flex-1 items-center gap-1 rounded bg-background px-2 py-0.5 text-[11px] text-muted-foreground"><Lock className="h-3 w-3" />verify.airtelbank.com/edd/q</div>
      </div>
      <div className="space-y-3 bg-card p-4 text-sm">
        <div className="flex items-center gap-2 border-b pb-2"><ShieldCheck className="h-5 w-5 text-primary" /><div><p className="font-semibold">Airtel Payments Bank · Transaction check</p><p className="text-xs text-muted-foreground">Verify a recent transaction of Rs {p.amount.toLocaleString("en-IN")} on A/c ending {p.last4}</p></div></div>
        {!p.started ? (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Questionnaire sent to the customer. Waiting for them to open it…</p>
            <div className="flex gap-2">
              <Button size="sm" disabled={p.busy} onClick={p.onStart}>Customer opens questionnaire</Button>
              <Button size="sm" variant="outline" onClick={p.onNoReply}>No reply</Button>
            </div>
          </div>
        ) : (
          <>
            <p className="text-xs text-muted-foreground">{done} of {p.qs.length} answered</p>
            {p.qs.map((q) => (
              <div key={q.id} className="space-y-1">
                <p className="text-xs font-medium">{q.text}</p>
                <div className="flex flex-wrap items-center gap-1">
                  {q.options.map((o) => (
                    <Button key={o.label} size="sm" variant={p.answers[q.id] === o.label ? "default" : "outline"} className="h-7 text-xs" onClick={() => p.onAnswer(q.id, o.label)}>{o.label}</Button>
                  ))}
                  {p.answers[q.id] && <span className="text-[11px] text-muted-foreground">+{p.points(q, p.answers[q.id]!)} pts</span>}
                </div>
              </div>
            ))}
            <div className="flex items-center justify-between rounded-md border p-2">
              <span className="text-xs">Response flag <b>{p.flag}</b> <Badge variant="outline" className={tone[p.colour]}>{p.colour}</Badge></span>
              <Button size="sm" disabled={done < p.qs.length} onClick={p.onSubmit}>Submit</Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
