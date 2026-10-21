import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/enforcement")({
  beforeLoad: () => {
    throw redirect({ to: "/outcomes", search: { tab: "enforcement" } });
  },
});
