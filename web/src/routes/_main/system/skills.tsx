import { createFileRoute } from "@tanstack/react-router";

import SkillsPage from "@/components/skills/skills-page";

export const Route = createFileRoute("/_main/system/skills")({
  component: SkillsPage,
});
