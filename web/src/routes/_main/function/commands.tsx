import { createFileRoute } from "@tanstack/react-router";

import CommandsPage from "@/components/commands/commands-page";

export const Route = createFileRoute("/_main/function/commands")({
  component: CommandsPage,
});
