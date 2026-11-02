import * as React from "react";

import type { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import {
  BotIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ClipboardListIcon,
  CopyIcon,
  RefreshCwIcon,
  ShieldAlertIcon,
  XIcon,
} from "lucide-react";
import { toast } from "sonner";

import { TablePagination } from "@/components/table-pagination";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api } from "@/lib/api";
import { intlLocale, localizePath, tr } from "@/lib/i18n";
import type {
  InterceptApprovalFilter,
  InterceptApprovalRow,
  InterceptAudit,
  InterceptDetail,
  InterceptPending,
  InterceptReviewInput,
} from "@/lib/types";
import { cn } from "@/lib/utils";

function fmtTime(value?: string) {
  if (!value) return "—";
  return new Date(value).toLocaleString(intlLocale(), {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function source(row: InterceptApprovalRow) {
  if (row.decision_source) return row.decision_source;
  if (row.rule_id) return "rule";
  return row.reason?.startsWith("[模型]") ? "model" : "unknown";
}

function originLabel(row: InterceptApprovalRow) {
  if (row.task_id) return row.task_id;
  if (row.conversation_id) {
    const id = row.conversation_id;
    return tr(msg`Conversation #${id}`);
  }
  return "—";
}

function ApprovalOrigin({ row, detail = false }: { row: InterceptApprovalRow; detail?: boolean }) {
  const { t } = useLingui();
  const [locating, setLocating] = React.useState(false);
  const taskId = row.task_id;
  const label = detail && taskId ? t`Task ${taskId}` : originLabel(row);
  const approvalId = row.id;
  const query = new URLSearchParams({ approval: String(row.id) });
  let href: string | undefined;
  if (row.conversation_id) {
    query.set("c", String(row.conversation_id));
    href = localizePath(`/chat?${query}`);
  } else if (row.task_id) {
    query.set("id", row.task_id);
    href = localizePath(`/function/tasks/detail?${query}`);
  }
  return href ? (
    <a
      href={href}
      className="text-primary underline-offset-4 hover:underline"
      aria-label={t`Locate the source of approval #${approvalId}: ${label}`}
      aria-busy={locating}
      onClick={async (e) => {
        e.stopPropagation();
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        e.preventDefault();
        if (locating) return;
        setLocating(true);
        try {
          await api.interceptExecution(row.id, row.conversation_id ?? undefined);
          window.location.assign(href);
        } catch (error) {
          toast.error((error as Error).message || t`Could not locate the matching execution`);
          setLocating(false);
        }
      }}
    >
      {label}
    </a>
  ) : (
    <span>{label}</span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const { t } = useLingui();
  const labels: Record<string, string> = {
    pending: t`Awaiting approval`,
    allowed: t`Allowed`,
    denied: t`Denied`,
    timeout: t`Timed out`,
  };
  let variant: "default" | "destructive" | "secondary" | "outline" = "outline";
  if (status === "allowed") variant = "default";
  if (status === "denied") variant = "destructive";
  if (status === "pending") variant = "secondary";
  return <Badge variant={variant}>{labels[status] ?? status}</Badge>;
}

function MatchCell({ row, showReason = true }: { row: InterceptApprovalRow; showReason?: boolean }) {
  const { t } = useLingui();
  const reason = row.reason?.replace(/^\[模型\]\s*/, "");
  return (
    <div className="flex min-w-0 flex-col gap-1">
      {source(row) === "model" ? (
        <Badge variant="outline">
          <BotIcon />
          <Trans>Model ruling</Trans>
        </Badge>
      ) : (
        <span className="truncate">{row.rule_name || t`Rule not recorded or deleted`}</span>
      )}
      {showReason ? (
        <p className="truncate text-muted-foreground text-xs" title={reason}>
          {reason || t`No reason recorded`}
        </p>
      ) : null}
    </div>
  );
}

function CodeBlock({ label, text, truncated = false }: { label: string; text: string; truncated?: boolean }) {
  const { t } = useLingui();
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(t`Copied`);
    } catch {
      toast.error(t`Copy failed, select the text to copy manually`);
    }
  }
  return (
    <section className="flex min-w-0 flex-col gap-2" aria-label={label}>
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-medium text-muted-foreground text-xs">{label}</h3>
        {text ? (
          <Button variant="ghost" size="icon-xs" aria-label={t`Copy ${label}`} onClick={() => void copy()}>
            <CopyIcon />
          </Button>
        ) : null}
      </div>
      <pre className="max-h-80 min-w-0 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-muted/60 p-3 font-mono text-xs leading-6 [overflow-wrap:anywhere]">
        {text || t`Not recorded`}
      </pre>
      {truncated ? (
        <p className="text-muted-foreground text-xs">
          <Trans>Content truncated; the saved excerpt is shown above.</Trans>
        </p>
      ) : null}
    </section>
  );
}

const contextLabels: Record<string, MessageDescriptor> = {
  user: msg`User message`,
  assistant: msg`Agent message`,
  text: msg`Agent message`,
  tool_use: msg`Tool request`,
  tool_result: msg`Tool output`,
};

const actionLabels: Record<string, MessageDescriptor> = {
  allow: msg`Allow`,
  ask: msg`Escalate to human review`,
  deny: msg`Deny`,
};
const executionLabels: Record<InterceptAudit["execution_status"], MessageDescriptor> = {
  not_started: msg`Not executed yet`,
  not_executed: msg`Not executed`,
  awaiting_result: msg`Allowed, awaiting execution result`,
  succeeded: msg`Executed successfully`,
  failed: msg`Execution failed`,
  unknown: msg`Execution result unknown`,
};

function ModelReviewContext({ input }: { input: InterceptReviewInput }) {
  const { t } = useLingui();
  return (
    <section className="flex min-w-0 flex-col gap-4" aria-label={t`Model review context`}>
      <div className="flex flex-col gap-2">
        <h3 className="font-medium text-sm">
          <Trans>Model review context</Trans>
        </h3>
        <p className="text-muted-foreground text-xs">
          <Trans>
            The following is a snapshot of the input actually sent to the review model this time. The background is only
            for understanding the current action; the ruling is based on the review policy.
          </Trans>{" "}
          {input.version < 4 ? (
            <Trans>This record uses legacy input and preserves what was actually sent at the time.</Trans>
          ) : null}
        </p>
      </div>
      <CodeBlock
        label={t`Current call under review`}
        text={JSON.stringify({ tool_name: input.tool_name, arguments: input.arguments }, null, 2)}
      />
      {input.version >= 2 ? (
        input.background ? (
          <div className="flex min-w-0 flex-col gap-2">
            <CodeBlock
              label={
                input.background.source === "user_message"
                  ? t`Background · User message`
                  : t`Background · Worker intent summary (legacy)`
              }
              text={input.background.text}
              truncated={input.background.truncated}
            />
            <p className="text-muted-foreground text-xs">
              {input.background.source === "user_message" ? (
                <Trans>Taken from the current user message.</Trans>
              ) : (
                <Trans>This is the legacy Worker intent summary; the new Worker review no longer sends it.</Trans>
              )}
            </p>
          </div>
        ) : (
          <p className="text-muted-foreground text-xs">
            <Trans>No background message was attached to this review.</Trans>
          </p>
        )
      ) : (
        <>
          {input.turn_input ? (
            <CodeBlock
              label={t`Current turn input (legacy)`}
              text={input.turn_input}
              truncated={input.background_truncated}
            />
          ) : null}
          {input.task ? (
            <>
              <CodeBlock
                label={t`Task description (legacy)`}
                text={input.task.description}
                truncated={input.task.truncated}
              />
              <CodeBlock label={t`Task goal (legacy)`} text={input.task.goal} truncated={input.task.truncated} />
              <CodeBlock
                label={t`Task action constraints (legacy)`}
                text={JSON.stringify(input.task.constraints, null, 2)}
              />
            </>
          ) : null}
          {input.worker_intent ? (
            <CodeBlock
              label={t`Worker intent (legacy)`}
              text={input.worker_intent}
              truncated={input.background_truncated}
            />
          ) : null}
        </>
      )}
      {input.working_directory ? <CodeBlock label={t`Working directory`} text={input.working_directory} /> : null}
      {input.version >= 3 ? (
        <p className="text-muted-foreground text-xs">
          <Trans>No historical calls or execution results were sent for this review.</Trans>
        </p>
      ) : (
        <div className="flex min-w-0 flex-col gap-3">
          <h4 className="font-medium text-muted-foreground text-xs">
            <Trans>Historical calls provided to the model at the time (legacy)</Trans>
          </h4>
          {input.history?.length ? (
            input.history.map((entry) => (
              <div key={entry.tool_use_id} className="flex min-w-0 flex-col gap-2 rounded-lg border p-3">
                <p className="break-words font-medium text-xs">
                  {entry.tool} ·{" "}
                  {entry.status === "succeeded" ? (
                    <Trans>Succeeded</Trans>
                  ) : (
                    <Trans>Failed (possible partial side effects)</Trans>
                  )}
                </p>
                <CodeBlock
                  label={t`Historical call arguments`}
                  text={entry.arguments_preview}
                  truncated={entry.truncated}
                />
                <CodeBlock label={t`Historical execution result`} text={entry.result} truncated={entry.truncated} />
              </div>
            ))
          ) : (
            <p className="text-muted-foreground text-xs">
              <Trans>No pairable historical tool execution records were provided this time.</Trans>
            </p>
          )}
          {input.history_truncated ? (
            <p className="text-muted-foreground text-xs">
              <Trans>History is a limited window; some content is truncated.</Trans>
            </p>
          ) : null}
        </div>
      )}

      <Collapsible>
        <CollapsibleTrigger asChild>
          <Button variant="outline" size="sm" className="self-start">
            <ChevronDownIcon data-icon="inline-start" />
            <Trans>View full model review input JSON</Trans>
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-3">
          <CodeBlock label={t`Model review input`} text={JSON.stringify(input, null, 2)} />
        </CollapsibleContent>
      </Collapsible>
    </section>
  );
}

type Decide = (id: number, decision: "allowed" | "denied") => Promise<void>;

function DecisionActions({ row, busy, decide }: { row: InterceptApprovalRow; busy: boolean; decide: Decide }) {
  if (row.status !== "pending") return null;
  return (
    <div className="flex flex-wrap gap-2">
      <Button size="sm" disabled={busy} onClick={() => void decide(row.id, "allowed")}>
        <CheckIcon data-icon="inline-start" />
        <Trans>Allow</Trans>
      </Button>
      <Button size="sm" variant="destructive" disabled={busy} onClick={() => void decide(row.id, "denied")}>
        <XIcon data-icon="inline-start" />
        <Trans>Deny</Trans>
      </Button>
    </div>
  );
}

export function ApprovalDetail({
  row,
  busy,
  decide,
  revision,
  readOnly = false,
  defaultExpanded = false,
  onResolved,
}: {
  row: InterceptApprovalRow;
  busy: boolean;
  decide: Decide;
  revision: number;
  readOnly?: boolean;
  defaultExpanded?: boolean;
  onResolved?: (status: "allowed" | "denied" | "timeout") => void;
}) {
  const { t, i18n } = useLingui();
  const [detail, setDetail] = React.useState<InterceptDetail | null>(null);
  const [error, setError] = React.useState("");
  const [retry, setRetry] = React.useState(0);
  const [more, setMore] = React.useState(defaultExpanded);

  // biome-ignore lint/correctness/useExhaustiveDependencies: Status, refresh and retry invalidate details without closing the panel.
  React.useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    async function load() {
      try {
        const next = await api.interceptDetail(row.id);
        if (cancelled) return;
        setDetail(next);
        setError("");
        if (next.status !== "pending") onResolved?.(next.status);
        if (next.status === "pending" || next.audit?.execution_status === "awaiting_result")
          timer = setTimeout(() => void load(), 5000);
      } catch (e) {
        if (!cancelled) setError((e as Error).message || t`Failed to load detail`);
      }
    }
    void load();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [row.id, row.status, revision, retry, onResolved]);

  // Row updates are authoritative until the lazy detail has caught up.
  const current = detail?.status === row.status ? detail : row;
  const audit = detail?.audit;
  let execution = audit ? i18n._(executionLabels[audit.execution_status]) : t`Not recorded`;
  if (row.status === "pending") execution = t`Not executed yet`;
  if (audit && audit.correlation !== "exact" && audit.effective_action === "allow")
    execution = t`No execution result linked`;
  const command = typeof row.tool_input?.command === "string" ? row.tool_input.command : undefined;
  let initialLabel = source(row) === "model" ? t`Model initial ruling` : t`Rule initial ruling`;
  if (audit?.model_fallback) initialLabel = t`Model error fallback`;
  const agentName = current.agent_name || current.conv_agent_key || "Agent";
  const executionText = detail ? execution : t`Loading…`;
  const effectiveActionKey = audit?.effective_action;
  const effectiveActionDesc = effectiveActionKey ? actionLabels[effectiveActionKey] : undefined;
  const effectiveActionText = effectiveActionDesc ? i18n._(effectiveActionDesc) : (effectiveActionKey ?? "");
  const capturedAt = fmtTime(audit?.captured_at);
  const toolUseIdText = audit?.tool_use_id || t`Not recorded`;
  const inputDigest = audit?.input_digest ?? "";
  const configDigestText = audit?.config_digest || t`Not recorded`;
  const modelInputDigest = audit?.model_input_digest ?? "";
  const resultRecordedAt = fmtTime(audit?.execution_ended_at);

  return (
    <div className="flex min-w-0 flex-col gap-4 p-3 sm:p-5">
      <div className="grid min-w-0 gap-5 rounded-xl border bg-muted/20 p-4 lg:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-3">
          <CodeBlock label={t`${agentName} · Tool request`} text={JSON.stringify(row.tool_input ?? {}, null, 2)} />
          {command ? (
            <Collapsible>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm">
                  <ChevronDownIcon data-icon="inline-start" />
                  <Trans>View command</Trans>
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-2">
                <CodeBlock label={t`Command`} text={command} />
              </CollapsibleContent>
            </Collapsible>
          ) : null}
          <p className="text-muted-foreground text-xs">
            <Trans>
              Execution result: <span className="text-foreground">{executionText}</span>
            </Trans>
          </p>
        </div>
        <div className="flex min-w-0 flex-col gap-4 lg:border-l lg:pl-5">
          <h3 className="font-medium text-muted-foreground text-xs">
            {current.status === "pending" ? <Trans>Review status</Trans> : <Trans>Approval decision</Trans>}
          </h3>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={current.status} />
            <MatchCell row={current} showReason={false} />
          </div>
          <p className="whitespace-pre-wrap break-words text-sm leading-7 [overflow-wrap:anywhere]">
            {current.reason?.replace(/^\[模型\]\s*/, "") || t`No approval reason recorded`}
          </p>
          {audit?.decision_reason ? <p className="text-sm">{audit.decision_reason}</p> : null}
          {audit?.effective_action ? (
            <p className="text-sm">
              <Trans>Final action: {effectiveActionText}</Trans>
            </p>
          ) : null}
          <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-2 text-xs">
            <dt className="text-muted-foreground">
              <Trans>Source</Trans>
            </dt>
            <dd className="break-words">
              <ApprovalOrigin row={current} detail />
            </dd>
            <dt className="text-muted-foreground">
              <Trans>Requested at</Trans>
            </dt>
            <dd>{fmtTime(row.created_at)}</dd>
            <dt className="text-muted-foreground">
              <Trans>Decided at</Trans>
            </dt>
            <dd>{fmtTime(current.decided_at)}</dd>
            {audit?.rule_name ? (
              <>
                <dt className="text-muted-foreground">
                  <Trans>Rule snapshot</Trans>
                </dt>
                <dd>{audit.rule_name}</dd>
              </>
            ) : null}
            {audit?.profile_id ? (
              <>
                <dt className="text-muted-foreground">
                  <Trans>Approval model profile</Trans>
                </dt>
                <dd>#{audit.profile_id}</dd>
              </>
            ) : null}
          </dl>
          {!readOnly ? <DecisionActions row={current} busy={busy} decide={decide} /> : null}
        </div>
      </div>
      {error ? (
        <Alert variant="destructive">
          <AlertDescription>
            <div className="flex flex-wrap items-center gap-2">
              <span>
                <Trans>Failed to load detail: {error}</Trans>
              </span>
              <Button variant="outline" size="sm" onClick={() => setRetry((v) => v + 1)}>
                <Trans>Retry detail</Trans>
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      ) : null}
      {!detail && !error ? <Skeleton className="h-8 w-60" /> : null}
      {detail && !audit ? (
        <Alert>
          <AlertDescription>
            <Trans>
              This record has no approval detail snapshot, so its context, initial model ruling, and execution output
              cannot be restored.
            </Trans>
          </AlertDescription>
        </Alert>
      ) : null}
      {audit ? (
        <Collapsible open={more} onOpenChange={setMore}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm">
              <ChevronDownIcon data-icon="inline-start" className={cn(more && "rotate-180")} />
              {more ? <Trans>Hide context</Trans> : <Trans>View context and execution result</Trans>}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-4">
            <div className="flex min-w-0 flex-col gap-5">
              {audit.model_input ? (
                <ModelReviewContext input={audit.model_input} />
              ) : (
                <Alert>
                  <AlertDescription>
                    {audit.model_input_digest ? (
                      <Trans>
                        This historical record only stores a fingerprint of the review input, not the original text, so
                        the context sent to the model cannot be restored. This does not mean there was no context at
                        review time; newly produced model rulings keep an input snapshot.
                      </Trans>
                    ) : (
                      <Trans>
                        This record has no model review input saved; it may have been ruled directly by a rule, hit an
                        error before the model was called, or come from an older version.
                      </Trans>
                    )}
                  </AlertDescription>
                </Alert>
              )}
              {audit.user_message || audit.context?.length ? (
                <Collapsible>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <ChevronDownIcon data-icon="inline-start" />
                      {audit.model_input && audit.model_input.version >= 3 ? (
                        <Trans>View session audit excerpt (not sent to the model)</Trans>
                      ) : (
                        <Trans>View session audit excerpt</Trans>
                      )}
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pt-3">
                    <div className="flex min-w-0 flex-col gap-3">
                      {audit.user_message ? (
                        <CodeBlock
                          label={t`Session current turn input (audit excerpt)`}
                          text={audit.user_message}
                          truncated={audit.user_truncated}
                        />
                      ) : null}
                      <section className="flex min-w-0 flex-col gap-3">
                        <h3 className="font-medium text-muted-foreground text-xs">
                          <Trans>Visible session context</Trans>
                        </h3>
                        <p className="text-muted-foreground text-xs">
                          <Trans>
                            Session record excerpt saved at {capturedAt}. What the model actually used is defined by
                            "Model review input".
                          </Trans>
                        </p>
                        {audit.context_truncated ? (
                          <p className="text-muted-foreground text-xs">
                            <Trans>Only the most recent context is saved; some content is truncated.</Trans>
                          </p>
                        ) : null}
                        {audit.context?.length ? (
                          audit.context.map((entry, index) => {
                            const kindLabel = contextLabels[entry.kind]
                              ? i18n._(contextLabels[entry.kind])
                              : entry.kind;
                            return (
                              <CodeBlock
                                key={`${entry.kind}-${entry.tool_use_id || index}`}
                                label={`${kindLabel}${entry.tool ? ` · ${entry.tool}` : ""}${entry.is_error ? ` · ${t`Error`}` : ""}`}
                                text={entry.text}
                                truncated={entry.truncated}
                              />
                            );
                          })
                        ) : (
                          <p className="text-muted-foreground text-sm">
                            <Trans>No linkable context recorded</Trans>
                          </p>
                        )}
                      </section>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              ) : null}
              <CodeBlock
                label={`${initialLabel}: ${actionLabels[audit.initial_action] ? i18n._(actionLabels[audit.initial_action]) : audit.initial_action}`}
                text={audit.initial_reason.replace(/^\[模型\]\s*/, "")}
              />
              <CodeBlock
                label={t`Execution output`}
                text={
                  audit.output ??
                  (audit.execution_status === "not_executed"
                    ? t`The tool was not executed.`
                    : t`No execution output yet`)
                }
                truncated={audit.output_truncated}
              />
              {audit.correlation !== "exact" ? (
                <Alert>
                  <AlertDescription>
                    {audit.correlation === "ambiguous" ? (
                      <Trans>
                        There are concurrent calls with identical arguments, so the tool call cannot be uniquely linked;
                        this record does not show a guessed execution result.
                      </Trans>
                    ) : (
                      <Trans>No uniquely linkable tool call ID was recorded.</Trans>
                    )}
                  </AlertDescription>
                </Alert>
              ) : null}
              <dl className="grid gap-2 text-muted-foreground text-xs [overflow-wrap:anywhere]">
                <div>
                  <Trans>Tool call ID: {toolUseIdText}</Trans>
                </div>
                <div>
                  <Trans>Argument digest SHA-256: {inputDigest}</Trans>
                </div>
                <div>
                  <Trans>Review config fingerprint SHA-256: {configDigestText}</Trans>
                </div>
                {audit.model_input_digest ? (
                  <div>
                    <Trans>Model review input SHA-256: {modelInputDigest}</Trans>
                  </div>
                ) : null}
                {audit.execution_ended_at ? (
                  <div>
                    <Trans>Result recorded at: {resultRecordedAt}</Trans>
                  </div>
                ) : null}
              </dl>
            </div>
          </CollapsibleContent>
        </Collapsible>
      ) : null}
    </div>
  );
}

// Hidden cells do not occupy table columns. Keep the detail span in sync so
// expansion cannot create empty columns and leave a gap in the selected row.
const approvalBreakpoints = ["(min-width: 40rem)", "(min-width: 48rem)", "(min-width: 64rem)", "(min-width: 80rem)"];
function subscribeColumns(onChange: () => void) {
  const queries = approvalBreakpoints.map((query) => window.matchMedia(query));
  for (const query of queries) query.addEventListener("change", onChange);
  return () => {
    for (const query of queries) query.removeEventListener("change", onChange);
  };
}
function visibleColumnCount() {
  const matches = approvalBreakpoints.map((query) => window.matchMedia(query).matches);
  return 3 + Number(matches[0]) + Number(matches[1]) + 2 * Number(matches[2]) + 2 * Number(matches[3]);
}
function serverColumnCount() {
  return 9;
}

function ApprovalTable({
  rows,
  busy,
  decide,
  revision,
  label,
}: {
  rows: InterceptApprovalRow[];
  busy: boolean;
  decide: Decide;
  revision: number;
  label: string;
}) {
  const { t } = useLingui();
  const [expanded, setExpanded] = React.useState<Set<number>>(() => new Set());
  const columns = React.useSyncExternalStore(subscribeColumns, visibleColumnCount, serverColumnCount);
  const prefix = React.useId();
  function toggle(id: number) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  return (
    <Table className="table-fixed" aria-label={label}>
      <TableHeader>
        <TableRow>
          <TableHead className="w-10">
            <span className="sr-only">
              <Trans>Expand detail</Trans>
            </span>
          </TableHead>
          <TableHead className="hidden w-14 sm:table-cell">#</TableHead>
          <TableHead className="w-28">
            <Trans>Tool</Trans>
          </TableHead>
          <TableHead className="hidden md:table-cell">
            <Trans>Source</Trans>
          </TableHead>
          <TableHead className="hidden lg:table-cell">
            <Trans>Matched rule</Trans>
          </TableHead>
          <TableHead className="hidden xl:table-cell">
            <Trans>Arguments</Trans>
          </TableHead>
          <TableHead className="w-24">
            <Trans>Status</Trans>
          </TableHead>
          <TableHead className="hidden w-36 lg:table-cell">
            <Trans>Requested at</Trans>
          </TableHead>
          <TableHead className="hidden w-36 xl:table-cell">
            <Trans>Decided at</Trans>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => {
          const open = expanded.has(row.id);
          const panelID = `${prefix}-${row.id}`;
          const rowId = row.id;
          return (
            <React.Fragment key={row.id}>
              <TableRow
                data-state={open ? "selected" : undefined}
                className="cursor-pointer"
                onClick={() => toggle(row.id)}
              >
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={open ? t`Collapse approval #${rowId}` : t`Expand approval #${rowId}`}
                    aria-expanded={open}
                    aria-controls={open ? panelID : undefined}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggle(row.id);
                    }}
                  >
                    {open ? <ChevronDownIcon /> : <ChevronRightIcon />}
                  </Button>
                </TableCell>
                <TableCell className="hidden text-muted-foreground sm:table-cell">{row.id}</TableCell>
                <TableCell>
                  <code className="block truncate text-xs">{row.tool_name}</code>
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  <div className="flex flex-col gap-1">
                    <span className="truncate" title={originLabel(row)}>
                      <ApprovalOrigin row={row} />
                    </span>
                    <span className="truncate text-muted-foreground text-xs">
                      {row.agent_name || row.conv_agent_key}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="hidden lg:table-cell">
                  <MatchCell row={row} />
                </TableCell>
                <TableCell className="hidden xl:table-cell">
                  <code className="block truncate text-muted-foreground text-xs">{JSON.stringify(row.tool_input)}</code>
                </TableCell>
                <TableCell>
                  <StatusBadge status={row.status} />
                </TableCell>
                <TableCell className="hidden text-muted-foreground text-xs lg:table-cell">
                  {fmtTime(row.created_at)}
                </TableCell>
                <TableCell className="hidden text-muted-foreground text-xs xl:table-cell">
                  {fmtTime(row.decided_at)}
                </TableCell>
              </TableRow>
              {open ? (
                <TableRow className="hover:bg-transparent has-aria-expanded:bg-transparent">
                  <TableCell colSpan={columns} className="whitespace-normal p-0">
                    <section id={panelID} aria-label={t`Approval detail #${rowId}`}>
                      <ApprovalDetail row={row} busy={busy} decide={decide} revision={revision} />
                    </section>
                  </TableCell>
                </TableRow>
              ) : null}
            </React.Fragment>
          );
        })}
      </TableBody>
    </Table>
  );
}

export function ApprovalRecords({ taskId }: { taskId?: string }) {
  const { t } = useLingui();
  const [rows, setRows] = React.useState<InterceptApprovalRow[]>([]);
  const [pendingRows, setPendingRows] = React.useState<InterceptPending[]>([]);
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(20);
  const [total, setTotal] = React.useState(0);
  const [filter, setFilter] = React.useState<InterceptApprovalFilter>({});
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState("");
  const [pendingError, setPendingError] = React.useState("");
  const [deciding, setDeciding] = React.useState(false);
  const [revision, setRevision] = React.useState(0);
  const request = React.useRef(0);
  const decisionLock = React.useRef(false);
  const filterID = React.useId();
  const filtered = Boolean(filter.status || filter.decision_source);

  // A task can stay mounted while the user switches between task details.
  // Reset the cursor so the new scope always starts at its newest records.
  // biome-ignore lint/correctness/useExhaustiveDependencies: taskId intentionally resets pagination when scope changes.
  React.useEffect(() => {
    setPage(1);
  }, [taskId]);

  const load = React.useCallback(
    async (manual = false) => {
      const id = ++request.current;
      if (manual) setRefreshing(true);
      try {
        // The approval queue is independent of the current history page and its
        // filter. Older requests must remain actionable even when newer decisions
        // fill the page or a filter would hide them.
        const [history, pending] = await Promise.allSettled([
          taskId
            ? api.interceptTaskPage(taskId, page, pageSize, filter)
            : api.interceptHistoryPage(page, pageSize, filter),
          api.interceptPending(),
        ]);
        if (id !== request.current) return;
        if (history.status === "fulfilled") {
          setRows(history.value.items);
          setTotal(history.value.total);
          setError("");
        } else {
          setError((history.reason as Error).message || t`Load failed`);
        }
        if (pending.status === "fulfilled") {
          setPendingRows(pending.value);
          setPendingError("");
        } else {
          setPendingError((pending.reason as Error).message || t`Load failed`);
        }
        if (manual) setRevision((v) => v + 1);
      } catch (e) {
        if (id === request.current) setError((e as Error).message || t`Load failed`);
      } finally {
        if (id === request.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [taskId, page, pageSize, filter, t],
  );
  const latestLoad = React.useRef(load);
  latestLoad.current = load;

  React.useEffect(() => {
    void load();
    const timer = setInterval(() => void load(), 5000);
    return () => {
      request.current++;
      clearInterval(timer);
    };
  }, [load]);

  const changePageSize = (next: number) => {
    setPageSize(next);
    setPage(1);
  };

  const changeFilter = (next: InterceptApprovalFilter) => {
    // An in-flight response for the old filter must not repopulate the table.
    request.current++;
    setFilter(next);
    setPage(1);
    setRows([]);
    setTotal(0);
    setError("");
    setLoading(true);
  };

  const decide: Decide = async (id, decision) => {
    if (decisionLock.current) return;
    decisionLock.current = true;
    setDeciding(true);
    try {
      await api.interceptDecide(id, decision);
      // Invalidate a list request started before this decision.
      request.current++;
      // Optimistically drop the decided item from the independent pending queue
      // for instant feedback; the re-fetch below reconciles with server truth.
      setRows((prev) =>
        prev.map((row) => (row.id === id ? { ...row, status: decision, decided_at: new Date().toISOString() } : row)),
      );
      setPendingRows((prev) => prev.filter((row) => row.id !== id));
      setRevision((v) => v + 1);
      toast.success(decision === "allowed" ? t`Execution allowed` : t`Execution denied`);
      // Re-fetch counts and rows: a decided item may no longer match the filter.
      await latestLoad.current(true);
    } catch (e) {
      toast.error((e as Error).message);
      await latestLoad.current(true);
    } finally {
      decisionLock.current = false;
      setDeciding(false);
    }
  };

  const historyById = new Map(rows.map((row) => [row.id, row]));
  const pending: InterceptApprovalRow[] = pendingRows
    .filter((row) => !taskId || row.task_id === taskId)
    .map((row) => {
      const ruleId = row.rule_id;
      return {
        conv_title: "",
        conv_agent_key: "",
        rule_name: ruleId ? t`Rule #${ruleId}` : "",
        ...historyById.get(row.id),
        ...row,
      };
    });
  const title = taskId ? t`Intercept approvals` : t`Approval records`;
  const pendingCount = pending.length;
  return (
    <div className="flex min-w-0 flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ClipboardListIcon className="size-5 text-muted-foreground" />
          <h1 className="font-semibold text-xl">{title}</h1>
          {pending.length ? (
            <Badge variant="secondary">
              <Trans>{pendingCount} pending</Trans>
            </Badge>
          ) : null}
        </div>
        <Button variant="outline" size="sm" onClick={() => void load(true)} disabled={loading || refreshing}>
          <RefreshCwIcon data-icon="inline-start" className={cn(refreshing && "animate-spin")} />
          <Trans>Refresh</Trans>
        </Button>
      </div>
      <p className="text-muted-foreground text-sm">
        <Trans>
          Expand a record to see the tool request and approval decision, along with the context and execution result at
          the time.
        </Trans>
      </p>
      <FieldGroup className="flex-row flex-wrap items-end gap-3" aria-label={t`Approval record filters`}>
        <Field className="w-full sm:w-40">
          <FieldLabel htmlFor={`${filterID}-status`}>
            <Trans>Approval status</Trans>
          </FieldLabel>
          <Select
            value={filter.status ?? "all"}
            onValueChange={(value) =>
              changeFilter({
                ...filter,
                status: value === "all" ? undefined : (value as InterceptApprovalFilter["status"]),
              })
            }
          >
            <SelectTrigger id={`${filterID}-status`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="all">
                  <Trans>All statuses</Trans>
                </SelectItem>
                <SelectItem value="denied">
                  <Trans>Denied</Trans>
                </SelectItem>
                <SelectItem value="pending">
                  <Trans>Awaiting approval</Trans>
                </SelectItem>
                <SelectItem value="allowed">
                  <Trans>Allowed</Trans>
                </SelectItem>
                <SelectItem value="timeout">
                  <Trans>Timed out</Trans>
                </SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </Field>
        <Field className="w-full sm:w-40">
          <FieldLabel htmlFor={`${filterID}-source`}>
            <Trans>Decision source</Trans>
          </FieldLabel>
          <Select
            value={filter.decision_source ?? "all"}
            onValueChange={(value) =>
              changeFilter({
                ...filter,
                decision_source: value === "all" ? undefined : (value as InterceptApprovalFilter["decision_source"]),
              })
            }
          >
            <SelectTrigger id={`${filterID}-source`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="all">
                  <Trans>All sources</Trans>
                </SelectItem>
                <SelectItem value="model">
                  <Trans>Model ruling</Trans>
                </SelectItem>
                <SelectItem value="rule">
                  <Trans>Rule ruling</Trans>
                </SelectItem>
                <SelectItem value="unknown">
                  <Trans>Source unknown</Trans>
                </SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </Field>
        {filtered ? (
          <Button variant="ghost" size="sm" onClick={() => changeFilter({})}>
            <Trans>Clear filters</Trans>
          </Button>
        ) : null}
      </FieldGroup>
      {error ? (
        <Alert variant="destructive">
          <AlertDescription>
            <Trans>Failed to load records: {error}. Click refresh to retry.</Trans>
          </AlertDescription>
        </Alert>
      ) : null}
      {pendingError ? (
        <Alert variant="destructive">
          <AlertDescription>
            <Trans>Failed to load pending approvals: {pendingError}. Click refresh to retry.</Trans>
          </AlertDescription>
        </Alert>
      ) : null}
      {pending.length ? (
        <section className="overflow-hidden rounded-xl border">
          <div className="flex items-center gap-2 border-b bg-muted/40 px-4 py-3 font-medium text-sm">
            <ShieldAlertIcon className="size-4" />
            <Trans>Pending ({pendingCount})</Trans>{" "}
            <span className="text-muted-foreground text-xs">
              <Trans>Expand to allow or deny</Trans>
            </span>
          </div>
          <ApprovalTable
            rows={pending}
            busy={deciding}
            decide={decide}
            revision={revision}
            label={t`Pending approvals`}
          />
        </section>
      ) : null}
      <section className="overflow-hidden rounded-xl border">
        <div className="border-b px-4 py-3 font-medium text-sm">
          {filtered ? <Trans>Filtered results ({total})</Trans> : <Trans>All records ({total})</Trans>}
        </div>
        {loading ? (
          <div className="flex flex-col gap-3 p-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : null}
        {!loading && !rows.length && !error ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <ClipboardListIcon />
              </EmptyMedia>
              <EmptyTitle>
                {filtered ? (
                  <Trans>No approval records match the filters</Trans>
                ) : (
                  <Trans>No approval records yet</Trans>
                )}
              </EmptyTitle>
              <EmptyDescription>
                {filtered ? (
                  <Trans>Adjust the approval status or decision source, or clear the filters to see all records.</Trans>
                ) : (
                  <Trans>Once a rule or model makes an approval decision, records will appear here.</Trans>
                )}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : null}
        {rows.length ? (
          <ApprovalTable
            rows={rows}
            busy={deciding}
            decide={decide}
            revision={revision}
            label={t`Approval records list`}
          />
        ) : null}
        {!loading && !error ? (
          <TablePagination
            page={page}
            pageSize={pageSize}
            total={total}
            onPageChange={setPage}
            onPageSizeChange={changePageSize}
            pageSizeOptions={[10, 20, 50]}
          />
        ) : null}
      </section>
    </div>
  );
}
