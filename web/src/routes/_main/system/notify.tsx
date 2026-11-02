import { createFileRoute } from "@tanstack/react-router";

import NotifyPage from "@/components/notify/notify-page";

export const Route = createFileRoute("/_main/system/notify")({
  component: NotifyPage,
});
