import { createFileRoute, redirect } from "@tanstack/react-router";

import MainLayout from "@/components/layout/main-layout";
import { isSignedIn } from "@/lib/auth";

export const Route = createFileRoute("/_main")({
  beforeLoad: () => {
    if (!isSignedIn()) {
      throw redirect({ to: "/login" });
    }
  },
  component: MainLayout,
});
