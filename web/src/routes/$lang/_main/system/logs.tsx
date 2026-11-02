import { createFileRoute } from "@tanstack/react-router";

import LogsPage from "@/components/logs/logs-page";

export const Route = createFileRoute("/$lang/_main/system/logs")({
  component: LogsPage,
});
