import { createFileRoute } from "@tanstack/react-router";

import LLMRecordsPage from "@/components/llm-records/llm-records-page";

export const Route = createFileRoute("/_main/function/llm-records")({
  component: LLMRecordsPage,
});
