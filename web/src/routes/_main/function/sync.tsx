import { createFileRoute } from "@tanstack/react-router";

import AssetSyncPage from "@/components/sync/sync-page";

export const Route = createFileRoute("/_main/function/sync")({
  component: AssetSyncPage,
});
