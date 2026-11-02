// LLM 重试配置的共用件：五层重试各自的「次数 + 间隔」。
//
// 五层从内到外：建连(SDK) → 空响应(SDK) → 同 provider 安全窗口 → 轮询熔断 → 意图重跑。
// 前三层跟着端点走，所以每个模型配置都能覆盖全局默认；后两层是进程级的，只有全局一份。
//
// 所有输入都遵循同一套「留空 = 不配置」语义，与后端 db.RetryRule 一致：
//   次数   空/0 = 用内置默认 | -1 = 关闭这层重试 | >0 = 用这个次数
//   间隔   空/0 = 用这层原本的指数退避 | >0 = 改用这个固定毫秒间隔

import * as React from "react";

import type { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import { Loader2Icon, SaveIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import type { LLMRetryOverride, LLMRetryPolicy, LLMRetryRule } from "@/lib/types";

export const ZERO_RULE: LLMRetryRule = { attempts: 0, interval_ms: 0 };
export const ZERO_OVERRIDE: LLMRetryOverride = {
  connect: ZERO_RULE,
  empty: ZERO_RULE,
  stream: ZERO_RULE,
};
const ZERO_POLICY: LLMRetryPolicy = {
  ...ZERO_OVERRIDE,
  breaker: ZERO_RULE,
  intent: ZERO_RULE,
};

type LayerMeta = {
  title: MessageDescriptor;
  /** 这层重试发生在哪、由谁执行 */
  where: MessageDescriptor;
  /** 什么样的错误会走到这层——具体到状态码，别让人猜 */
  trigger: MessageDescriptor;
  /** 长得像但【不】走这层的错误，省得填了没反应还以为是 bug */
  skips?: MessageDescriptor;
  desc: MessageDescriptor;
  attemptsLabel: MessageDescriptor;
  /** 次数留空时的默认值，用于占位符 */
  defAttempts: number;
  /** 间隔留空时的默认策略，用于占位符 */
  defInterval: MessageDescriptor;
  /** 次数填 -1 的含义 */
  offHint: MessageDescriptor;
};

export const RETRY_LAYERS = {
  connect: {
    title: msg`Connection retry`,
    where: msg`SDK · before 200`,
    trigger: msg`Can't connect or no 200 yet: network-layer errors like connection reset / read-write timeout / DNS failure, plus HTTP 408, 429, 500, 502, 503, 504.`,
    skips: msg`Other status codes (400 / 401 / 403 / 404 / 413 / 422, etc.) are deterministic rejections that fail the same way on resend, so they throw immediately.`,
    desc: msg`Resends the same request as-is. Once the stream has started (200 received), a mid-stream disconnect is no longer handled by this layer.`,
    attemptsLabel: msg`Retries`,
    defAttempts: 3,
    defInterval: msg`0.5s→1s→2s exponential (capped at 8s)`,
    offHint: msg`-1 = no retries at all; throw immediately on failure`,
  },
  empty: {
    title: msg`Empty-response retry`,
    where: msg`SDK · openai format only`,
    trigger: msg`HTTP 200 with a normal stop finish_reason, but the whole response has no content block at all — gateway empty frames, dropped thinking-field frames, and sampling hiccups all look like this.`,
    skips: msg`Content missing because of max_tokens truncation doesn't count (that needs a higher output limit; resending just hits it again).`,
    desc: msg`Resends the entire prompt, so it's expensive on long contexts — keep the count small.`,
    attemptsLabel: msg`Retries`,
    defAttempts: 2,
    defInterval: msg`0.5s→1s→2s exponential (capped at 8s)`,
    offHint: msg`-1 = hand back the empty response as-is`,
  },
  stream: {
    title: msg`Same-provider safe-window retry`,
    where: msg`This project · before any output is delivered`,
    trigger: msg`Problems only after the stream is established (200 received): mid-stream disconnect, provider overloaded, in-stream 429 / 5xx error events — and not a single token has been handed to the caller yet.`,
    skips: msg`No retry for quota exhausted (402 / insufficient_quota — left to the pool to switch profile), context too long (413 / context length — left to compaction), or 400 / 401 / 403 / 404 / 422 deterministic rejections.`,
    desc: msg`Replays the same request on the same profile. Since no output has been delivered, the replay won't duplicate model output or tool runs.`,
    attemptsLabel: msg`Retries`,
    defAttempts: 2,
    defInterval: msg`0.5s→1s exponential (capped at 4s)`,
    offHint: msg`-1 = hand a broken stream straight to the outer intent rerun`,
  },
  breaker: {
    title: msg`Pool circuit breaker`,
    where: msg`This project · process-level, one global copy`,
    trigger: msg`Trips when transient failures (429, 5xx, network errors) accumulate to the threshold; deterministic failures like insufficient balance (402), invalid key (401 / 403), and missing model (404) ignore the threshold and trip on the first occurrence.`,
    skips: msg`One success resets the counter, so an occasionally flaky profile won't slowly accumulate its way to tripping.`,
    desc: msg`After tripping it enters cooldown, during which the pool skips this profile. The state is persisted and survives a restart.`,
    attemptsLabel: msg`Consecutive failures to trip`,
    defAttempts: 3,
    defInterval: msg`1min→5min→30min steps`,
    offHint: msg`-1 = never trip on transient failures (deterministic failures still trip)`,
  },
  intent: {
    title: msg`Intent rerun`,
    where: msg`This project · process-level, one global copy`,
    trigger: msg`None of the earlier layers caught it: the worker ends in model_error — the inner retries are all exhausted, or the stream broke after it had started delivering output (replay is unsafe then, so the whole thing must rerun).`,
    skips: msg`Quota exhaustion is already handled by the pool switching profiles and isn't rerun here; it yields immediately when the task is paused / stopped / wrapping up, without consuming backoff time.`,
    desc: msg`Reruns the whole intent from the start. It's the outermost layer, so one rerun means the inner layers' counts multiply through again.`,
    attemptsLabel: msg`Reruns`,
    defAttempts: 2,
    defInterval: msg`fixed 3s`,
    offHint: msg`-1 = no rerun; the intent is marked blocked directly`,
  },
} satisfies Record<string, LayerMeta>;

type LayerKey = keyof typeof RETRY_LAYERS;

/** 毫秒的人话，只用于在输入框旁边回显，免得数零。 */
function humanMs(ms: number) {
  if (!Number.isFinite(ms) || ms <= 0) return "";
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) return `${Number((ms / 1000).toFixed(2))}s`;
  return `${Number((ms / 60_000).toFixed(2))}min`;
}

/** 受控数字输入：空串 ↔ 0，中间态（"-"、"1e"）原样留在本地，不打扰父级。 */
function NumField({
  id,
  value,
  onChange,
  placeholder,
  min,
}: {
  id: string;
  value: number;
  onChange: (n: number) => void;
  placeholder: string;
  min: number;
}) {
  const [text, setText] = React.useState(value === 0 ? "" : String(value));
  // 父级换了一整套值（读取到策略、切换配置）时跟上；自己敲字时不会走到这里，
  // 因为那时 value 已经等于本地文本 parse 后的结果。
  React.useEffect(() => {
    const incoming = value === 0 ? "" : String(value);
    setText((cur) => (Number(cur || 0) === value ? cur : incoming));
  }, [value]);
  return (
    <Input
      id={id}
      type="number"
      min={min}
      className="w-28 shrink-0"
      value={text}
      placeholder={placeholder}
      onChange={(e) => {
        setText(e.target.value);
        const n = Number(e.target.value);
        onChange(e.target.value.trim() === "" || !Number.isFinite(n) ? 0 : Math.trunc(n));
      }}
    />
  );
}

/** 一层重试的两个旋钮。idPrefix 用来在同一页出现多次时保住 label 的 htmlFor。 */
export function RetryRuleFields({
  layer,
  idPrefix,
  value,
  onChange,
  compact,
}: {
  layer: LayerKey;
  idPrefix: string;
  value: LLMRetryRule;
  onChange: (r: LLMRetryRule) => void;
  /** true = 配置抽屉里的紧凑版：省掉展开说明，只留「什么错误会走到这层」这一句 */
  compact?: boolean;
}) {
  const { t, i18n } = useLingui();
  const meta = RETRY_LAYERS[layer];
  const human = humanMs(value.interval_ms);
  const trigger = i18n._(meta.trigger);
  const skips = meta.skips ? i18n._(meta.skips) : null;
  const desc = i18n._(meta.desc);
  const offHint = i18n._(meta.offHint);
  return (
    <div className={compact ? "grid gap-2" : "grid gap-3 rounded-lg border p-3"}>
      <div className="grid gap-0.5">
        <div className="flex flex-wrap items-baseline gap-2">
          <Label className="text-sm">{i18n._(meta.title)}</Label>
          <span className="text-muted-foreground text-xs">{i18n._(meta.where)}</span>
        </div>
        {/* 哪些错误会走到这层，具体到状态码——填了旋钮却看不到效果，多半是错误压根不落在这层。 */}
        <p className="text-muted-foreground text-xs">
          <Trans>
            <span className="font-medium text-foreground">Trigger</span>: {trigger}
          </Trans>
        </p>
        {!compact && skips && (
          <p className="text-muted-foreground text-xs">
            <Trans>
              <span className="font-medium text-foreground">Skips</span>: {skips}
            </Trans>
          </p>
        )}
        {!compact && <p className="text-muted-foreground text-xs">{desc}</p>}
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="flex items-center gap-2">
          <Label htmlFor={`${idPrefix}-${layer}-n`} className="text-muted-foreground text-xs">
            {i18n._(meta.attemptsLabel)}
          </Label>
          <NumField
            id={`${idPrefix}-${layer}-n`}
            min={-1}
            value={value.attempts}
            placeholder={t`Default ${meta.defAttempts}`}
            onChange={(n) => onChange({ ...value, attempts: n })}
          />
        </div>
        <div className="flex items-center gap-2">
          <Label htmlFor={`${idPrefix}-${layer}-ms`} className="text-muted-foreground text-xs">
            <Trans>Interval ms</Trans>
          </Label>
          <NumField
            id={`${idPrefix}-${layer}-ms`}
            min={0}
            value={value.interval_ms}
            placeholder={t`Default backoff`}
            onChange={(n) => onChange({ ...value, interval_ms: n })}
          />
          <span className="text-muted-foreground text-xs">{human ? t`Fixed ${human}` : i18n._(meta.defInterval)}</span>
        </div>
      </div>
      {!compact && (
        <p className="text-muted-foreground text-xs">
          <Trans>Leave empty for the default; {offHint}.</Trans>
        </p>
      )}
    </div>
  );
}

/** 模型配置抽屉里的三层覆盖（跟着端点走的那三层）。 */
export function ProfileRetryFields({
  value,
  onChange,
}: {
  value: LLMRetryOverride;
  onChange: (o: LLMRetryOverride) => void;
}) {
  return (
    <div className="grid gap-3 rounded-lg border p-3">
      <div className="grid gap-0.5">
        <Label className="text-sm">
          <Trans>Retry overrides</Trans>
        </Label>
        <p className="text-muted-foreground text-xs">
          <Trans>
            Applies only to this profile, overriding the global defaults in Retries & backoff. Leave a field empty to
            follow the global default; set the count to -1 to turn off that retry layer; set an interval to replace
            exponential backoff with a fixed interval. The circuit breaker and intent rerun are process-level and can
            only be adjusted on the global page.
          </Trans>
        </p>
      </div>
      {(["connect", "empty", "stream"] as const).map((k) => (
        <div key={k} className="border-t pt-3 first:border-t-0 first:pt-0">
          <RetryRuleFields
            compact
            layer={k}
            idPrefix="pf"
            value={value[k]}
            onChange={(r) => onChange({ ...value, [k]: r })}
          />
        </div>
      ))}
    </div>
  );
}

/** 「重试与退避」tab：五层的全局默认值。 */
export function RetryPolicyPanel() {
  const { t } = useLingui();
  const [policy, setPolicy] = React.useState<LLMRetryPolicy>(ZERO_POLICY);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const p = await api.llmRetryPolicy();
      setPolicy({ ...ZERO_POLICY, ...p });
    } catch (e) {
      toast.error(t`Failed to load retry policy: ${(e as Error).message}`);
    } finally {
      setLoading(false);
    }
  }, [t]);

  React.useEffect(() => {
    void load();
  }, [load]);

  async function save() {
    if (saving) return;
    setSaving(true);
    try {
      // 后端会把越界值夹回区间并回传，直接用回传值刷新，所见即所存。
      const saved = await api.saveLLMRetryPolicy(policy);
      setPolicy({ ...ZERO_POLICY, ...saved });
      toast.success(t`Saved — effective immediately (the call in flight still uses the old parameters)`);
    } catch (e) {
      toast.error(t`Save failed: ${(e as Error).message}`);
    } finally {
      setSaving(false);
    }
  }

  const set = (k: LayerKey) => (r: LLMRetryRule) => setPolicy((p) => ({ ...p, [k]: r }));

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-dashed p-10 text-muted-foreground text-sm">
        <Loader2Icon className="size-4 animate-spin" /> <Trans>Loading retry policy…</Trans>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      <div className="rounded-lg border bg-muted/30 p-3 text-muted-foreground text-xs leading-relaxed">
        <Trans>
          A failed model call passes through five retry layers in order, from innermost to outermost:
          <span className="text-foreground">
            {" "}
            Connection → Empty response → Same-provider safe window → Pool circuit breaker → Intent rerun
          </span>
          . The outer layer only kicks in once the inner one is exhausted, so the counts{" "}
          <span className="text-foreground">multiply</span> — max out every layer and a single hiccup can burn through
          dozens of requests. Leave everything empty for the current defaults, identical to the behavior without this
          page. The first three layers can be overridden per model profile.
        </Trans>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {(Object.keys(RETRY_LAYERS) as LayerKey[]).map((k) => (
          <RetryRuleFields key={k} layer={k} idPrefix="gl" value={policy[k]} onChange={set(k)} />
        ))}
      </div>

      <div className="flex gap-2">
        <Button onClick={save} disabled={saving}>
          {saving ? <Loader2Icon className="animate-spin" /> : <SaveIcon />}
          <Trans>Save</Trans>
        </Button>
        <Button variant="outline" onClick={() => setPolicy(ZERO_POLICY)} disabled={saving}>
          <Trans>Reset all to defaults</Trans>
        </Button>
      </div>
    </div>
  );
}
