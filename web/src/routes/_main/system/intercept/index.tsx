import { createFileRoute } from "@tanstack/react-router";

import InterceptPage from "@/components/intercept/intercept-page";

export const Route = createFileRoute("/_main/system/intercept/")({
  component: InterceptPage,
});
