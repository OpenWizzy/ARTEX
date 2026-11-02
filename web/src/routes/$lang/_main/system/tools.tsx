import { createFileRoute } from "@tanstack/react-router";

import ToolsPage from "@/components/tools/tools-page";

export const Route = createFileRoute("/$lang/_main/system/tools")({
  component: ToolsPage,
});
