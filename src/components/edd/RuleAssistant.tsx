import { useServerFn } from "@tanstack/react-start";
import { Loader2, MessageSquareText } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useEDD } from "@/lib/edd-store";
import { askRuleBase } from "@/lib/rule-ai.functions";
import { describeRule } from "@/lib/rule-engine";

const SUGGESTIONS = ["Which rules use telco data?", "Why did AL-1042 get its outcome?", "Are any rules overlapping or conflicting?"];

export function RuleAssistant() {
  const { rules, ruleSets, ruleGroups, sources, attributes, alerts, evaluate } = useEDD();
  const ask = useServerFn(askRuleBase);
  const [q, setQ] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async (question: string) => {
    setQ(question);
    setBusy(true);
    setError(null);
    try {
      const context = {
        ruleSets: [...ruleSets].sort((a, b) => a.order - b.order).map((s) => ({ id: s.id, name: s.name, order: s.order, strategy: s.strategy })),
        groups: ruleGroups.map((g) => ({ id: g.id, name: g.name, setId: g.setId })),
        rules: rules.map((r) => ({ id: r.id, name: r.name, groupId: r.groupId, status: r.status, active: r.active, priority: r.priority, dependsOn: r.dependsOn, rule: describeRule(r, attributes), attributes: r.conditions.conditions.map((c) => c.attr) })),
        sources: sources.map((s) => ({ id: s.id, name: s.name, on: s.status, attributes: attributes.filter((a) => a.sourceId === s.id).map((a) => a.key) })),
        alertEvaluations: alerts.map((a) => {
          const p = evaluate(a.id);
          return { alert: a.id, customer: a.customer, score: p.score, outcome: p.outcome, hardStop: p.hardStop, rulesApplied: p.fired.map((f) => f.rule.id) };
        }),
      };
      const res = await ask({ data: { question, context: JSON.stringify(context) } });
      setAnswer(res.answer);
    } catch (e) {
      setError(e instanceof Error ? e.message : "AI request failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm"><MessageSquareText className="size-4 text-primary" /> Ask the rule base</CardTitle>
        <CardDescription>Plain-English questions about rules, data sources and why alerts were routed.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (q.trim()) run(q); }}>
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ask a question…" />
          <Button type="submit" disabled={busy || !q.trim()}>{busy ? <Loader2 className="size-4 animate-spin" /> : "Ask"}</Button>
        </form>
        <div className="flex flex-wrap gap-2">
          {SUGGESTIONS.map((s) => <Button key={s} size="sm" variant="outline" disabled={busy} onClick={() => run(s)}>{s}</Button>)}
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        {answer && <div className="whitespace-pre-wrap rounded-md bg-secondary p-3 text-sm">{answer}</div>}
      </CardContent>
    </Card>
  );
}
