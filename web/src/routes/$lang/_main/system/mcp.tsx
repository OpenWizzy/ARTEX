import { createFileRoute } from "@tanstack/react-router";

import MCPPage from "@/components/mcp/mcp-page";

export const Route = createFileRoute("/$lang/_main/system/mcp")({
  component: MCPPage,
});
