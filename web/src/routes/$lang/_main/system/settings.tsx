import { createFileRoute } from "@tanstack/react-router";

import SystemSettingsPage from "@/components/settings/settings-page";

export const Route = createFileRoute("/$lang/_main/system/settings")({
  component: SystemSettingsPage,
});
