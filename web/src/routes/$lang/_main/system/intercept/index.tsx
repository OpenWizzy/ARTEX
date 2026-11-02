import { createFileRoute } from "@tanstack/react-router";

import InterceptPage from "@/components/intercept/intercept-page";

export const Route = createFileRoute("/$lang/_main/system/intercept/")({
  component: InterceptPage,
});
