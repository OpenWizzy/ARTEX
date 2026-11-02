import { createFileRoute } from "@tanstack/react-router";

import LLMPage from "@/components/llm/llm-page";

export const Route = createFileRoute("/$lang/_main/system/llm")({
  component: LLMPage,
});
