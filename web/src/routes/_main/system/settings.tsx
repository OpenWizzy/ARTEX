import { createFileRoute } from "@tanstack/react-router";

import SystemSettingsPage from "@/components/settings/settings-page";

export const Route = createFileRoute("/_main/system/settings")({
  component: SystemSettingsPage,
});
