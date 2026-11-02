import { createFileRoute } from "@tanstack/react-router";

import ChatPage from "@/components/chat/chat-page";

export const Route = createFileRoute("/_main/chat")({
  component: ChatPage,
});
