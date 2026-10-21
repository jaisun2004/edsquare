import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/investigations")({
  beforeLoad: () => {
    throw redirect({ to: "/cases" });
  },
});
