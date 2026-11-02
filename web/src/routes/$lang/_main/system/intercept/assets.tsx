import { createFileRoute } from "@tanstack/react-router";

import AssetInterceptPage from "@/components/intercept/asset-intercept-page";

export const Route = createFileRoute("/$lang/_main/system/intercept/assets")({
  component: AssetInterceptPage,
});
