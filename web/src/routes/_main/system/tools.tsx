import { createFileRoute } from "@tanstack/react-router";

import ToolsPage from "@/components/tools/tools-page";

export const Route = createFileRoute("/_main/system/tools")({
  component: ToolsPage,
});
