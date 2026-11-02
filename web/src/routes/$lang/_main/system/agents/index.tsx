import { createFileRoute } from "@tanstack/react-router";

import AgentsPage from "@/components/agents/agents-page";

export const Route = createFileRoute("/$lang/_main/system/agents/")({
  component: AgentsPage,
});
