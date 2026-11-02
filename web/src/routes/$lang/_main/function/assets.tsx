import { createFileRoute } from "@tanstack/react-router";

import AssetsPage from "@/components/assets/assets-page";

export const Route = createFileRoute("/$lang/_main/function/assets")({
  component: AssetsPage,
});
