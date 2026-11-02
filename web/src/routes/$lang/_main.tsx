import { createFileRoute, redirect } from "@tanstack/react-router";

import MainLayout from "@/components/layout/main-layout";
import { isSignedIn } from "@/lib/auth";

export const Route = createFileRoute("/$lang/_main")({
  beforeLoad: ({ params }) => {
    if (!isSignedIn()) {
      throw redirect({ to: "/$lang/login", params });
    }
  },
  component: MainLayout,
});
