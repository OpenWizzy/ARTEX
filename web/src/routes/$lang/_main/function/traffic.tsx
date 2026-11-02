import { createFileRoute } from "@tanstack/react-router";

import TrafficPage from "@/components/traffic/traffic-page";

export const Route = createFileRoute("/$lang/_main/function/traffic")({
  component: TrafficPage,
});
