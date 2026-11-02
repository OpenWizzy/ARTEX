import { createFileRoute } from "@tanstack/react-router";

import TaskDetailPage from "@/components/tasks/task-detail-page";
import { stringParams } from "@/lib/search-params";

export const Route = createFileRoute("/_main/function/tasks/detail")({
  validateSearch: stringParams("id"),
  component: TaskDetailPage,
});
