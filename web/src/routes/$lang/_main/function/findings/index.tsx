import { createFileRoute } from "@tanstack/react-router";

import FindingsPage from "@/components/findings/findings-page";

export const Route = createFileRoute("/$lang/_main/function/findings/")({
  component: FindingsPage,
});
