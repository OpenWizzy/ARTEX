import { createFileRoute } from "@tanstack/react-router";

import DashboardPage from "@/components/dashboard/dashboard-page";

export const Route = createFileRoute("/$lang/_main/dashboard")({
  component: DashboardPage,
});
