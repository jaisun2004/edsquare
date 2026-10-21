import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, Loader2, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { getQuestionnaire, submitQuestionnaire } from "@/lib/questionnaire.functions";

export const Route = createFileRoute("/q/$token")({
  head: () => ({
    meta: [
      { title: "Verify your transaction — EDSquare" },
      { name: "description", content: "Answer a few short questions to confirm a recent transaction on your account." },
      { property: "og:title", content: "Verify your transaction" },
      { property: "og:description", content: "Answer a few short questions to confirm a recent transaction." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  loader: ({ params }) => getQuestionnaire({ data: { token: params.token } }),
  errorComponent: () => <Shell><p className="text-sm">This link is not valid.</p></Shell>,
  component: Questionnaire,
});

function Shell({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto min-h-screen max-w-md space-y-4 bg-background p-4">{children}</div>;
}

function Questionnaire() {
  const q = Route.useLoaderData();
  const { token } = Route.useParams();
  const submit = useServerFn(submitQuestionnaire);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(q?.status === "submitted");
  const [error, setError] = useState<string>();

  if (!q) return <Shell><p className="text-sm">This link is no longer valid.</p></Shell>;
  const all = q.questions.every((x) => answers[x.id]);

  const go = async () => {
    setBusy(true); setError(undefined);
    try { await submit({ data: { token, answers } }); setDone(true); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not submit."); }
    finally { setBusy(false); }
  };

  return (
    <Shell>
      <div className="flex items-center gap-2 border-b pb-3">
        <ShieldCheck className="h-6 w-6 text-primary" />
        <div>
          <p className="font-semibold">{q.header.bank} · Transaction check</p>
          <p className="text-xs text-muted-foreground">Dear {q.header.name}, please confirm a credit of Rs {q.header.amount.toLocaleString("en-IN")} on A/c ending {q.header.last4}.</p>
        </div>
      </div>
      {done ? (
        <div className="space-y-2 py-8 text-center"><CheckCircle2 className="mx-auto h-10 w-10 text-success" /><p className="font-medium">Thank you. Your answers were received.</p><p className="text-xs text-muted-foreground">You can close this page.</p></div>
      ) : (
        <>
          {q.questions.map((x) => (
            <div key={x.id} className="space-y-2">
              <p className="text-sm font-medium">{x.text}</p>
              <div className="flex flex-wrap gap-2">
                {x.options.map((o) => <Button key={o} size="sm" variant={answers[x.id] === o ? "default" : "outline"} onClick={() => setAnswers({ ...answers, [x.id]: o })}>{o}</Button>)}
              </div>
            </div>
          ))}
          {error && <p className="text-xs text-destructive">{error}</p>}
          <Button className="w-full" disabled={!all || busy} onClick={go}>{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Submit answers</Button>
        </>
      )}
    </Shell>
  );
}
