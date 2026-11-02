import { createFileRoute } from "@tanstack/react-router";

import ApprovalsPage from "@/components/intercept/approvals-page";

export const Route = createFileRoute("/_main/system/intercept/approvals")({
  component: ApprovalsPage,
});
