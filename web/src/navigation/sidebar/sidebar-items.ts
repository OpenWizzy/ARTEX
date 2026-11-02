import { msg } from "@lingui/core/macro";
import {
  Activity,
  Ban,
  BellRing,
  Bot,
  Brain,
  Bug,
  ClipboardList,
  FolderOpen,
  FolderSync,
  LayoutDashboard,
  type LucideIcon,
  MessageSquare,
  Network,
  Plug,
  Radio,
  ScrollText,
  Settings2,
  ShieldAlert,
  Sparkles,
  Target,
  Terminal,
  Wrench,
} from "lucide-react";

import { tr } from "@/lib/i18n";

export type NavBadge = "new" | "soon";

export interface NavSubItem {
  id: string;
  title: string;
  url: string;
  icon?: LucideIcon;
  badge?: NavBadge;
  disabled?: boolean;
  newTab?: boolean;
}

interface NavItemBase {
  id: string;
  title: string;
  icon?: LucideIcon;
  badge?: NavBadge;
  disabled?: boolean;
  newTab?: boolean;
}

export interface NavMainLinkItem extends NavItemBase {
  url: string;
  subItems?: never;
}

export interface NavMainParentItem extends NavItemBase {
  subItems: NavSubItem[];
}

export type NavMainItem = NavMainLinkItem | NavMainParentItem;

export interface NavGroup {
  id: number;
  label?: string;
  items: NavMainItem[];
}

export const sidebarItems: NavGroup[] = [
  {
    id: 1,
    get label() {
      return tr(msg`Features`);
    },
    items: [
      {
        id: "dashboard",
        get title() {
          return tr(msg`Dashboard`);
        },
        url: "/dashboard",
        icon: LayoutDashboard,
      },
      {
        id: "chat",
        get title() {
          return tr(msg`Conversation`);
        },
        url: "/chat",
        icon: MessageSquare,
      },
      {
        id: "tasks",
        get title() {
          return tr(msg`Tasks`);
        },
        url: "/function/tasks",
        icon: Target,
      },
      {
        id: "findings",
        get title() {
          return tr(msg`Findings`);
        },
        url: "/function/findings",
        icon: Bug,
      },
      {
        id: "traffic",
        get title() {
          return tr(msg`Traffic`);
        },
        url: "/function/traffic",
        icon: Activity,
      },
      {
        id: "commands",
        get title() {
          return tr(msg`Tool runs`);
        },
        url: "/function/commands",
        icon: Terminal,
      },
      {
        id: "llm-records",
        get title() {
          return tr(msg`LLM recording`);
        },
        url: "/function/llm-records",
        icon: Radio,
      },
      {
        id: "assets",
        get title() {
          return tr(msg`Assets`);
        },
        url: "/function/assets",
        icon: Network,
      },
      {
        id: "sync",
        get title() {
          return tr(msg`Asset sync`);
        },
        url: "/function/sync",
        icon: FolderSync,
      },
      {
        id: "workspace",
        get title() {
          return tr(msg`Workspace`);
        },
        url: "/function/workspace",
        icon: FolderOpen,
      },
    ],
  },
  {
    id: 2,
    get label() {
      return tr(msg`System`);
    },
    items: [
      { id: "llm", title: "LLM", url: "/system/llm", icon: Brain },
      { id: "agents", title: "Agent", url: "/system/agents", icon: Bot },
      { id: "mcp", title: "MCP", url: "/system/mcp", icon: Plug },
      { id: "skills", title: "Skill", url: "/system/skills", icon: Sparkles },
      {
        id: "tools",
        get title() {
          return tr(msg`Tools`);
        },
        url: "/system/tools",
        icon: Wrench,
      },
      {
        id: "notify",
        get title() {
          return tr(msg`Notifications`);
        },
        url: "/system/notify",
        icon: BellRing,
      },
      {
        id: "intercept",
        get title() {
          return tr(msg`Intercept rules`);
        },
        url: "/system/intercept",
        icon: ShieldAlert,
      },
      {
        id: "asset-intercept",
        get title() {
          return tr(msg`Asset intercept`);
        },
        url: "/system/intercept/assets",
        icon: Ban,
      },
      {
        id: "approvals",
        get title() {
          return tr(msg`Approvals`);
        },
        url: "/system/intercept/approvals",
        icon: ClipboardList,
      },
      {
        id: "logs",
        get title() {
          return tr(msg`Logs`);
        },
        url: "/system/logs",
        icon: ScrollText,
      },
      {
        id: "settings",
        get title() {
          return tr(msg`System settings`);
        },
        url: "/system/settings",
        icon: Settings2,
      },
    ],
  },
];
