import { createFileRoute } from "@tanstack/react-router";

import AgentDetailPage from "@/components/agents/agent-detail-page";
import { stringParams } from "@/lib/search-params";

export const Route = createFileRoute("/$lang/_main/system/agents/detail")({
  validateSearch: stringParams("key"),
  component: AgentDetailPage,
});
