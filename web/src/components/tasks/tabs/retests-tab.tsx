import * as React from "react";

import { msg } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import { ArrowUpRightIcon, ChevronLeftIcon, ChevronRightIcon } from "lucide-react";

import { LocaleLink } from "@/components/common/locale-link";
import { FindingRetestPanel } from "@/components/finding-retest-panel";
import { StatusBadge } from "@/components/status-badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { tr } from "@/lib/i18n";
import type { Finding, FindingsPage } from "@/lib/types";

const PAGE_SIZE = 20;

function findingLabel(finding: Finding) {
  return finding.name?.trim() || finding.vulnclass.trim() || tr(msg`Uncategorized`);
}

export function RetestsTab({ taskId }: { taskId: string }) {
  const { t } = useLingui();
  const [page, setPage] = React.useState(1);
  const [data, setData] = React.useState<FindingsPage | null>(null);
  const [selectedId, setSelectedId] = React.useState("");
  const [error, setError] = React.useState("");
  const [refreshVersion, setRefreshVersion] = React.useState(0);
  const refresh = React.useCallback(() => setRefreshVersion((version) => version + 1), []);

  // Only this task's own findings, including those without graph nodes.
  // Fetch history only for the selection, and wait for each poll to finish.
  React.useEffect(() => {
    let disposed = false;
    let timer: ReturnType<typeof setTimeout>;
    async function load() {
      try {
        const result = await api.findingsPage({ task: taskId, page, pageSize: PAGE_SIZE, sort: "time" });
        if (disposed) return;
        const lastPage = Math.max(1, Math.ceil(result.total / PAGE_SIZE));
        if (page > lastPage) {
          setPage(lastPage);
          return;
        }
        setData(result);
        setSelectedId((current) =>
          result.items.some((finding) => finding.id === current) ? current : (result.items[0]?.id ?? ""),
        );
        setError("");
      } catch (e) {
        if (!disposed) setError((e as Error).message);
      } finally {
        if (!disposed) timer = setTimeout(() => void load(), 3000);
      }
    }
    void refreshVersion; // Refresh triage immediately after a retest completes.
    void load();
    return () => {
      disposed = true;
      clearTimeout(timer);
    };
  }, [taskId, page, refreshVersion]);

  const loaded = data?.page === page;
  const findings = loaded ? data.items : [];
  const selected = findings.find((finding) => finding.id === selectedId);
  const pageCount = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  return (
    <div className="flex flex-col gap-4">
      {error ? (
        <Alert variant="destructive">
          <AlertDescription>
            <Trans>Failed to load the task's vulnerabilities: {error}</Trans>
            <Button variant="outline" size="sm" onClick={refresh}>
              <Trans>Retry</Trans>
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(16rem,22rem)_minmax(0,1fr)]">
        <Card className="min-w-0">
          <CardHeader>
            <CardTitle>
              <Trans>Select vulnerability</Trans>
              {data ? ` · ${data.total}` : ""}
            </CardTitle>
            <CardDescription>
              <Trans>View retest records for this task's vulnerabilities, or start a new retest.</Trans>
            </CardDescription>
          </CardHeader>
          <CardContent className="flex max-h-[32rem] flex-col overflow-y-auto">
            {!loaded && !error ? <Skeleton className="h-24 w-full" /> : null}
            {findings.map((finding, index) => {
              const label = findingLabel(finding);
              return (
                <React.Fragment key={finding.id}>
                  {index > 0 ? <Separator className="my-1" /> : null}
                  <Button
                    variant={finding.id === selectedId ? "secondary" : "ghost"}
                    className="h-auto w-full shrink-0 flex-col items-start gap-2 whitespace-normal py-3 text-left"
                    aria-label={t`Select vulnerability: ${label}`}
                    aria-pressed={finding.id === selectedId}
                    onClick={() => setSelectedId(finding.id)}
                  >
                    <span className="line-clamp-2 break-words">{label}</span>
                    <span className="flex flex-wrap items-center gap-2">
                      <StatusBadge domain="severity" value={finding.severity} dot />
                      <StatusBadge domain="finding" value={finding.status} dot />
                    </span>
                  </Button>
                </React.Fragment>
              );
            })}
            {loaded && findings.length === 0 ? (
              <Empty>
                <EmptyHeader>
                  <EmptyTitle>
                    <Trans>No vulnerabilities to retest</Trans>
                  </EmptyTitle>
                  <EmptyDescription>
                    <Trans>Once this task finds vulnerabilities, you can start a retest here manually.</Trans>
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : null}
          </CardContent>
          {data && data.total > PAGE_SIZE ? (
            <CardFooter className="justify-between gap-2">
              <Button
                variant="outline"
                size="icon-sm"
                aria-label={t`Previous page of vulnerabilities`}
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
              >
                <ChevronLeftIcon />
              </Button>
              <span className="text-muted-foreground text-xs">
                <Trans>
                  Page {page} / {pageCount}
                </Trans>
              </span>
              <Button
                variant="outline"
                size="icon-sm"
                aria-label={t`Next page of vulnerabilities`}
                disabled={page * PAGE_SIZE >= data.total}
                onClick={() => setPage(page + 1)}
              >
                <ChevronRightIcon />
              </Button>
            </CardFooter>
          ) : null}
        </Card>
        {selected ? (
          <div className="flex min-w-0 flex-col gap-4">
            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <h2 className="min-w-0 flex-1 break-words font-medium">{findingLabel(selected)}</h2>
                <Button asChild variant="ghost" size="sm">
                  <LocaleLink to="/function/findings/detail" search={{ id: selected.finding_id || selected.id }}>
                    <Trans>Vulnerability details</Trans> <ArrowUpRightIcon data-icon="inline-end" />
                  </LocaleLink>
                </Button>
              </div>
              <p className="line-clamp-3 break-words text-muted-foreground text-sm">{selected.summary}</p>
            </div>
            <FindingRetestPanel
              key={selected.id}
              findingId={selected.finding_id || selected.id}
              findingName={findingLabel(selected)}
              onCompleted={refresh}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
