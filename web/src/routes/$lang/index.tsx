import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/$lang/")({
  beforeLoad: ({ params }) => {
    throw redirect({ to: "/$lang/function/tasks", params, replace: true });
  },
});
