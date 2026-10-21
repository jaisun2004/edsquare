import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/engagement")({
  beforeLoad: () => {
    throw redirect({ to: "/outcomes", search: { tab: "engagement" } });
  },
});
