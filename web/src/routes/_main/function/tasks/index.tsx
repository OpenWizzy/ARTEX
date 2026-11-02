import { createFileRoute } from "@tanstack/react-router";

import TasksPage from "@/components/tasks/tasks-page";

export const Route = createFileRoute("/_main/function/tasks/")({
  component: TasksPage,
});
