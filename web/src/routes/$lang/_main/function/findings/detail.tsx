import { createFileRoute } from "@tanstack/react-router";

import FindingDetailPage from "@/components/findings/finding-detail-page";
import { stringParams } from "@/lib/search-params";

export const Route = createFileRoute("/$lang/_main/function/findings/detail")({
  validateSearch: stringParams("id", "context_task"),
  component: FindingDetailPage,
});
