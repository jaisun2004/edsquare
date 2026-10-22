import { createFileRoute, redirect } from "@tanstack/react-router";
import { resolveShortLink } from "@/lib/questionnaire.functions";
import { shortCodeOk } from "@/lib/whatsapp";

export const Route = createFileRoute("/s/$code")({
  head: () => ({
    meta: [
      { title: "Transaction check | EDSquare" },
      { name: "description", content: "Answer a few questions to confirm your recent transaction." },
      { property: "og:title", content: "Transaction check | EDSquare" },
      { property: "og:description", content: "Answer a few questions to confirm your recent transaction." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  loader: async ({ params }) => {
    if (!shortCodeOk(params.code)) return { expired: true };
    const r = await resolveShortLink({ data: { code: params.code } });
    if (r) throw redirect({ to: "/q/$token", params: { token: r.token } });
    return { expired: true };
  },
  component: Expired,
});

function Expired() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted p-6">
      <div className="max-w-sm rounded-lg border bg-card p-6 text-center">
        <p className="font-semibold">This link has expired</p>
        <p className="mt-2 text-sm text-muted-foreground">Please contact your bank's support number for help with your transaction.</p>
      </div>
    </div>
  );
}
