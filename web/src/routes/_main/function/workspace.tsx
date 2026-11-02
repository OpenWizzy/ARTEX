import { createFileRoute } from "@tanstack/react-router";

import WorkspacePage from "@/components/workspace/workspace-page";

export const Route = createFileRoute("/_main/function/workspace")({
  component: WorkspacePage,
});
