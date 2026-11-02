import { createFileRoute } from "@tanstack/react-router";

import AssetSyncPage from "@/components/sync/sync-page";

export const Route = createFileRoute("/$lang/_main/function/sync")({
  component: AssetSyncPage,
});
