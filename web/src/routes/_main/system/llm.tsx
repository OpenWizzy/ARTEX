import { createFileRoute } from "@tanstack/react-router";

import LLMPage from "@/components/llm/llm-page";

export const Route = createFileRoute("/_main/system/llm")({
  component: LLMPage,
});
