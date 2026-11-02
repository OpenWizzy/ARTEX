import { createFileRoute } from "@tanstack/react-router";

import AgentsPage from "@/components/agents/agents-page";

export const Route = createFileRoute("/_main/system/agents/")({
  component: AgentsPage,
});
