// Centralised status → color/label semantics, reused across the whole app.
// Spec §8.3: 意图 / 覆盖 / 任务 / 严重度 each have a consistent color set.

import { msg } from "@lingui/core/macro";

import { tr } from "@/lib/i18n";

export type Tone = "neutral" | "blue" | "green" | "amber" | "red" | "rose" | "violet" | "slate";

export const toneClasses: Record<Tone, string> = {
  neutral: "bg-muted text-muted-foreground border-transparent",
  blue: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/20",
  green: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  amber: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/20",
  red: "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/20",
  // rose 用作「严重」——实心高强调,视觉上明显高于「高危」的软红描边。
  rose: "bg-rose-600 text-white border-rose-600 dark:bg-rose-600 dark:text-white",
  violet: "bg-violet-500/15 text-violet-600 dark:text-violet-400 border-violet-500/20",
  slate: "bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/20",
};

export const toneDot: Record<Tone, string> = {
  neutral: "bg-muted-foreground",
  blue: "bg-blue-500",
  green: "bg-emerald-500",
  amber: "bg-amber-500",
  red: "bg-red-500",
  rose: "bg-white",
  violet: "bg-violet-500",
  slate: "bg-slate-500",
};

interface StatusMeta {
  label: string;
  tone: Tone;
}

const intent: Record<string, StatusMeta> = {
  open: {
    get label() {
      return tr(msg`Unclaimed`);
    },
    tone: "slate",
  },
  running: {
    get label() {
      return tr(msg({ message: "Running", context: "intent status" }));
    },
    tone: "blue",
  },
  paused: {
    get label() {
      return tr(msg`Paused`);
    },
    tone: "amber",
  },
  done: {
    get label() {
      return tr(msg`Completed`);
    },
    tone: "green",
  },
  // blocked = 模型/API/网络故障重试用尽，这条意图基本没真正探成（非目标拦截）。
  blocked: {
    get label() {
      return tr(msg`Errored`);
    },
    tone: "red",
  },
  // exhausted = 达到步数/时间预算被中途掐断、只写回部分结果（非方向已探尽）。
  exhausted: {
    get label() {
      return tr(msg`Budget exhausted`);
    },
    tone: "violet",
  },
  // stopped = 历史软删除状态（保留,历史数据）。
  stopped: {
    get label() {
      return tr(msg`Stopped`);
    },
    tone: "slate",
  },
  // deleted = 用户假删除了该意图（保留节点与血缘，删除原因见 delete_reason 字段）。
  deleted: {
    get label() {
      return tr(msg`Deleted`);
    },
    tone: "slate",
  },
};

const task: Record<string, StatusMeta> = {
  created: {
    get label() {
      return tr(msg`Created`);
    },
    tone: "slate",
  },
  queued: {
    get label() {
      return tr(msg`Queued`);
    },
    tone: "amber",
  },
  running: {
    get label() {
      return tr(msg({ message: "Running", context: "task status" }));
    },
    tone: "blue",
  },
  paused: {
    get label() {
      return tr(msg`Paused`);
    },
    tone: "amber",
  },
  done: {
    get label() {
      return tr(msg`Completed`);
    },
    tone: "green",
  },
  failed: {
    get label() {
      return tr(msg`Failed`);
    },
    tone: "red",
  },
  timeout: {
    get label() {
      return tr(msg`Timed out`);
    },
    tone: "amber",
  },
};

const severity: Record<string, StatusMeta> = {
  critical: {
    get label() {
      return tr(msg`Critical`);
    },
    tone: "rose",
  },
  high: {
    get label() {
      return tr(msg`High`);
    },
    tone: "red",
  },
  medium: {
    get label() {
      return tr(msg`Medium`);
    },
    tone: "amber",
  },
  low: {
    get label() {
      return tr(msg`Low`);
    },
    tone: "slate",
  },
};

const finding: Record<string, StatusMeta> = {
  pending: {
    get label() {
      return tr(msg({ message: "Pending", context: "finding status" }));
    },
    tone: "amber",
  },
  in_progress: {
    get label() {
      return tr(msg`In progress`);
    },
    tone: "blue",
  },
  confirmed: {
    get label() {
      return tr(msg({ message: "Confirmed", context: "finding status" }));
    },
    tone: "red",
  },
  resolved: {
    get label() {
      return tr(msg`Resolved`);
    },
    tone: "green",
  },
  fixed: {
    get label() {
      return tr(msg`Fixed`);
    },
    tone: "green",
  },
  false_positive: {
    get label() {
      return tr(msg`False positive`);
    },
    tone: "slate",
  },
  ignored: {
    get label() {
      return tr(msg`Ignored`);
    },
    tone: "neutral",
  },
  duplicate: {
    get label() {
      return tr(msg`Duplicate`);
    },
    tone: "neutral",
  },
  risk_accepted: {
    get label() {
      return tr(msg`Risk accepted`);
    },
    tone: "violet",
  },
};

const engine: Record<string, StatusMeta> = {
  exploring: {
    get label() {
      return tr(msg`Exploring`);
    },
    tone: "blue",
  },
  paused: {
    get label() {
      return tr(msg`Paused`);
    },
    tone: "amber",
  },
  stalled: {
    get label() {
      return tr(msg`Stalled`);
    },
    tone: "red",
  },
  idle: {
    get label() {
      return tr(msg`Idle`);
    },
    tone: "neutral",
  },
};

const goal: Record<string, StatusMeta> = {
  open: {
    get label() {
      return tr(msg({ message: "In progress", context: "goal status" }));
    },
    tone: "blue",
  },
  met: {
    get label() {
      return tr(msg`Met`);
    },
    tone: "green",
  },
  abandoned: {
    get label() {
      return tr(msg`Abandoned`);
    },
    tone: "slate",
  },
};

const audit: Record<string, StatusMeta> = {
  allow: {
    get label() {
      return tr(msg`Pass through`);
    },
    tone: "green",
  },
  block: {
    get label() {
      return tr(msg`Block`);
    },
    tone: "red",
  },
};

const node: Record<string, StatusMeta> = {
  observed: {
    get label() {
      return tr(msg`Observed`);
    },
    tone: "slate",
  },
  confirmed: {
    get label() {
      return tr(msg({ message: "Confirmed", context: "node status" }));
    },
    tone: "green",
  },
  tombstoned: {
    get label() {
      return tr(msg`Tombstoned`);
    },
    tone: "neutral",
  },
};

// 推送投递状态。sending 用 blue 而不是 amber：它不是「有问题」，
// 而是「已被领取、正在发」，与 pending 的等待语义要能区分开。
const delivery: Record<string, StatusMeta> = {
  pending: {
    get label() {
      return tr(msg({ message: "Pending", context: "delivery status" }));
    },
    tone: "amber",
  },
  sending: {
    get label() {
      return tr(msg`Sending`);
    },
    tone: "blue",
  },
  sent: {
    get label() {
      return tr(msg`Delivered`);
    },
    tone: "green",
  },
  failed: {
    get label() {
      return tr(msg`Failed`);
    },
    tone: "red",
  },
  skipped: {
    get label() {
      return tr(msg`Skipped`);
    },
    tone: "neutral",
  },
};

const maps = {
  intent,
  task,
  severity,
  finding,
  engine,
  goal,
  audit,
  node,
  delivery,
} as const;

export type StatusDomain = keyof typeof maps;

export function statusMeta(domain: StatusDomain, key: string): StatusMeta {
  return maps[domain][key] ?? { label: key, tone: "neutral" };
}
