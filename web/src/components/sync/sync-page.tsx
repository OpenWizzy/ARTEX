import * as React from "react";

import type { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { Plural, Trans, useLingui } from "@lingui/react/macro";
import { AlertCircleIcon, CheckCircle2Icon, DownloadIcon, PlugZapIcon, RefreshCwIcon, SearchIcon } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/lib/api";
import type { SSProject, SSTask } from "@/lib/types";

type SSStatus = {
  exists: boolean;
  configured: boolean;
  enabled: boolean;
  reachable: boolean;
  url?: string;
  tools: string[];
};

type Dimension = "project" | "task";

const ASSET_TYPES: { key: string; label: MessageDescriptor }[] = [
  { key: "subdomain", label: msg`Subdomains` },
  { key: "service", label: msg`Services` },
  { key: "app", label: msg`Apps` },
];

export default function AssetSyncPage() {
  return (
    <div className="p-4 md:p-6">
      <div className="mb-4">
        <h1 className="font-semibold text-xl">
          <Trans>Asset sync</Trans>
        </h1>
        <p className="text-muted-foreground text-sm">
          <Trans>Sync assets into the inventory from external data sources</Trans>
        </p>
      </div>
      <Tabs defaultValue="scopesentry">
        <TabsList>
          <TabsTrigger value="scopesentry">ScopeSentry</TabsTrigger>
        </TabsList>
        <TabsContent value="scopesentry" className="mt-4">
          <ScopeSentryPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ScopeSentryPanel() {
  const { t } = useLingui();
  const [status, setStatus] = React.useState<SSStatus | null>(null);
  const [loadingStatus, setLoadingStatus] = React.useState(true);

  const loadStatus = React.useCallback(() => {
    setLoadingStatus(true);
    api
      .ssStatus()
      .then(setStatus)
      .catch((e) => {
        const message = e.message;
        toast.error(t`Failed to load data source status: ${message}`);
      })
      .finally(() => setLoadingStatus(false));
  }, [t]);

  React.useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  const ready = !!status && status.exists && status.configured && status.enabled;

  return (
    <div className="space-y-4">
      <DataSourceCard status={status} loading={loadingStatus} onChanged={loadStatus} />
      {ready ? (
        <SyncWorkbench />
      ) : (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground text-sm">
            <Trans>Once the data source is ready, you can select projects / tasks to sync.</Trans>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ── 数据源状态卡 ─────────────────────────────────────────────────────────────

function DataSourceCard({
  status,
  loading,
  onChanged,
}: {
  status: SSStatus | null;
  loading: boolean;
  onChanged: () => void;
}) {
  const { t } = useLingui();
  const [url, setUrl] = React.useState("");
  const [apiKey, setApiKey] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (status?.url) setUrl(status.url);
  }, [status?.url]);

  const toolCount = status?.enabled ? status.tools.length : 0;

  const create = async () => {
    setBusy(true);
    try {
      await api.ssDatasource({});
      toast.success(t`ScopeSentry data source created. Enter its URL and key.`);
      onChanged();
    } catch (e) {
      const message = (e as Error).message;
      toast.error(t`Create failed: ${message}`);
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    if (!url.trim()) return toast.error(t`Enter the MCP URL`);
    setBusy(true);
    try {
      const r = await api.ssDatasource({ url: url.trim(), api_key: apiKey.trim() });
      toast.success(r.enabled ? t`Data source saved and enabled` : t`Saved (requirements for enabling not met yet)`);
      setApiKey("");
      onChanged();
    } catch (e) {
      const message = (e as Error).message;
      toast.error(t`Save failed: ${message}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-base">
          <PlugZapIcon className="size-4" /> <Trans>Data source status</Trans>
          <StatusBadge status={status} loading={loading} />
        </CardTitle>
        <Button variant="ghost" size="sm" onClick={onChanged} disabled={loading}>
          <RefreshCwIcon className={loading ? "size-4 animate-spin" : "size-4"} /> <Trans>Refresh</Trans>
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {!status?.exists ? (
          <div className="flex items-center justify-between gap-4">
            <p className="text-muted-foreground text-sm">
              <Trans>
                No ScopeSentry data source yet. Creating one adds a placeholder MCP (empty URL and key, not enabled).
              </Trans>
            </p>
            <Button onClick={create} disabled={busy}>
              <Trans>Create data source</Trans>
            </Button>
          </div>
        ) : (
          <>
            {!status.configured && (
              <p className="text-amber-600 text-sm dark:text-amber-500">
                <Trans>The data source exists but isn't configured. Enter the MCP URL and API key to enable it.</Trans>
              </p>
            )}
            {status.configured && !status.enabled && (
              <p className="text-amber-600 text-sm dark:text-amber-500">
                <Trans>The data source is configured but not enabled. Saving enables it automatically.</Trans>
              </p>
            )}
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label>
                  <Trans>MCP URL</Trans>
                </Label>
                <Input placeholder={t`http://<host>:8082/mcp`} value={url} onChange={(e) => setUrl(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>
                  <Trans>API key (X-API-Key; leave blank to keep the current value)</Trans>
                </Label>
                <Input
                  type="password"
                  placeholder="ssk_..."
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={save} disabled={busy}>
                <Trans>Save and enable</Trans>
              </Button>
              {status.enabled && status.tools.length > 0 && (
                <span className="text-muted-foreground text-xs">
                  <Plural value={toolCount} one="# tool discovered" other="# tools discovered" />
                </span>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status, loading }: { status: SSStatus | null; loading: boolean }) {
  if (loading || !status)
    return (
      <Badge variant="secondary">
        <Trans>Checking…</Trans>
      </Badge>
    );
  if (!status.exists)
    return (
      <Badge variant="destructive">
        <Trans>Not created</Trans>
      </Badge>
    );
  if (!status.configured)
    return (
      <Badge variant="outline">
        <Trans>Not configured</Trans>
      </Badge>
    );
  if (!status.enabled)
    return (
      <Badge variant="outline">
        <Trans>Not enabled</Trans>
      </Badge>
    );
  if (status.reachable)
    return (
      <Badge className="bg-emerald-600 hover:bg-emerald-600">
        <CheckCircle2Icon className="mr-1 size-3" /> <Trans>Connected</Trans>
      </Badge>
    );
  return (
    <Badge variant="destructive">
      <AlertCircleIcon className="mr-1 size-3" /> <Trans>Unreachable</Trans>
    </Badge>
  );
}

// ── 同步工作区（项目 / 任务维度）────────────────────────────────────────────────

function SyncWorkbench() {
  const { t, i18n } = useLingui();
  const [dimension, setDimension] = React.useState<Dimension>("project");
  const [assetTypes, setAssetTypes] = React.useState<Record<string, boolean>>({
    subdomain: true,
    service: true,
    app: true,
  });
  const [createCompany, setCreateCompany] = React.useState(true);

  const [projects, setProjects] = React.useState<SSProject[]>([]);
  const [tasks, setTasks] = React.useState<SSTask[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [selected, setSelected] = React.useState<Set<string>>(new Set());

  const [syncing, setSyncing] = React.useState(false);
  const [result, setResult] = React.useState<Awaited<ReturnType<typeof api.ssSync>> | null>(null);

  const load = React.useCallback(() => {
    setLoading(true);
    setSelected(new Set());
    const fn =
      dimension === "project"
        ? api.ssProjects(page, 50, search).then((r) => setProjects(r.projects))
        : api.ssTasks(page, 50, search).then(setTasks);
    fn.catch((e) => {
      const message = e.message;
      toast.error(t`Failed to load list: ${message}`);
    }).finally(() => setLoading(false));
  }, [dimension, page, search, t]);

  React.useEffect(() => {
    load();
  }, [load]);

  const rows = dimension === "project" ? projects : tasks;
  const selectedCount = selected.size;
  const idOf = (row: SSProject | SSTask) => (dimension === "project" ? (row as SSProject).id : (row as SSTask).name);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const toggleAll = () => {
    setSelected((prev) => (prev.size === rows.length ? new Set() : new Set(rows.map(idOf))));
  };

  const chosenTypes = ASSET_TYPES.filter((type) => assetTypes[type.key]).map((type) => type.key);

  const runSync = async () => {
    if (selected.size === 0)
      return toast.error(dimension === "project" ? t`Select at least one project` : t`Select at least one task`);
    if (chosenTypes.length === 0) return toast.error(t`Select at least one asset type`);
    setSyncing(true);
    setResult(null);
    try {
      const r = await api.ssSync({
        dimension,
        targets: [...selected],
        asset_types: chosenTypes,
        create_company: dimension === "project" ? createCompany : false,
      });
      setResult(r);
      const total = Object.values(r.synced ?? {}).reduce((a, b) => a + b, 0);
      toast.success(t`Sync complete. Assets imported: ${total}`);
    } catch (e) {
      const message = (e as Error).message;
      toast.error(t`Sync failed: ${message}`);
    } finally {
      setSyncing(false);
    }
  };

  const renderRows = () => {
    if (loading) {
      return (
        <TableRow>
          <TableCell colSpan={4} className="py-8 text-center text-muted-foreground text-sm">
            <Trans>Loading…</Trans>
          </TableCell>
        </TableRow>
      );
    }
    if (rows.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={4} className="py-8 text-center text-muted-foreground text-sm">
            <Trans context="ScopeSentry list">No data</Trans>
          </TableCell>
        </TableRow>
      );
    }
    if (dimension === "project") {
      return projects.map((p) => (
        <TableRow key={p.id} className="cursor-pointer" onClick={() => toggle(p.id)}>
          <TableCell onClick={(e) => e.stopPropagation()}>
            <Checkbox checked={selected.has(p.id)} onCheckedChange={() => toggle(p.id)} />
          </TableCell>
          <TableCell className="font-medium">{p.name}</TableCell>
          <TableCell>{p.tag ? <Badge variant="secondary">{p.tag}</Badge> : "—"}</TableCell>
          <TableCell className="text-right">{p.AssetCount ?? 0}</TableCell>
        </TableRow>
      ));
    }
    return tasks.map((task) => (
      <TableRow key={task.id} className="cursor-pointer" onClick={() => toggle(task.name)}>
        <TableCell onClick={(e) => e.stopPropagation()}>
          <Checkbox checked={selected.has(task.name)} onCheckedChange={() => toggle(task.name)} />
        </TableCell>
        <TableCell className="font-medium">{task.name}</TableCell>
        <TableCell>
          <Badge variant={task.progress === 100 ? "secondary" : "outline"}>
            {task.progress != null ? `${task.progress}%` : "—"}
          </Badge>
        </TableCell>
        <TableCell className="text-muted-foreground text-xs">{task.endTime || task.creatTime || "—"}</TableCell>
      </TableRow>
    ));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          <Trans>Select data to sync</Trans>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 维度切换 */}
        <Tabs
          value={dimension}
          onValueChange={(v) => {
            setDimension(v as Dimension);
            setPage(1);
          }}
        >
          <TabsList>
            <TabsTrigger value="project">
              <Trans>By project</Trans>
            </TabsTrigger>
            <TabsTrigger value="task">
              <Trans>By task</Trans>
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* 资产类型 + 选项 */}
        <div className="flex flex-wrap items-center gap-4">
          <span className="font-medium text-sm">
            <Trans>Sync assets:</Trans>
          </span>
          {ASSET_TYPES.map((type) => (
            <label key={type.key} htmlFor={`at-${type.key}`} className="flex items-center gap-1.5 text-sm">
              <Checkbox
                id={`at-${type.key}`}
                checked={!!assetTypes[type.key]}
                onCheckedChange={(c) => setAssetTypes((prev) => ({ ...prev, [type.key]: !!c }))}
              />
              {i18n._(type.label)}
            </label>
          ))}
          {dimension === "project" && (
            <label htmlFor="create-company" className="flex items-center gap-1.5 text-sm">
              <Checkbox id="create-company" checked={createCompany} onCheckedChange={(c) => setCreateCompany(!!c)} />
              <Trans>Create a company per project and write its asset scope</Trans>
            </label>
          )}
        </div>

        {/* 搜索 + 操作 */}
        <div className="flex items-center gap-2">
          <div className="relative max-w-xs flex-1">
            <SearchIcon className="absolute top-1/2 left-2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-8"
              placeholder={dimension === "project" ? t`Search project names` : t`Search task names`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  setPage(1);
                  load();
                }
              }}
            />
          </div>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCwIcon className={loading ? "size-4 animate-spin" : "size-4"} />
          </Button>
          <div className="flex-1" />
          <span className="text-muted-foreground text-xs">
            <Trans>Selected: {selectedCount}</Trans>
          </span>
          <Button onClick={runSync} disabled={syncing || selected.size === 0}>
            <DownloadIcon className={syncing ? "size-4 animate-pulse" : "size-4"} /> <Trans>Sync selected</Trans>
          </Button>
        </div>

        {/* 列表 */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox checked={rows.length > 0 && selected.size === rows.length} onCheckedChange={toggleAll} />
                </TableHead>
                <TableHead>
                  {dimension === "project" ? <Trans>Project name</Trans> : <Trans>Task name</Trans>}
                </TableHead>
                {dimension === "project" ? (
                  <>
                    <TableHead>
                      <Trans>Tag</Trans>
                    </TableHead>
                    <TableHead className="text-right">
                      <Trans>Asset count</Trans>
                    </TableHead>
                  </>
                ) : (
                  <>
                    <TableHead>
                      <Trans>Status</Trans>
                    </TableHead>
                    <TableHead>
                      <Trans>Time</Trans>
                    </TableHead>
                  </>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>{renderRows()}</TableBody>
          </Table>
        </div>

        {/* 分页 */}
        <div className="flex items-center justify-end gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1 || loading} onClick={() => setPage((p) => p - 1)}>
            <Trans>Previous</Trans>
          </Button>
          <span className="text-muted-foreground text-xs">
            <Trans>Page {page}</Trans>
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={rows.length < 50 || loading}
            onClick={() => setPage((p) => p + 1)}
          >
            <Trans>Next</Trans>
          </Button>
        </div>

        {/* 结果 */}
        {result && <SyncResult result={result} />}
      </CardContent>
    </Card>
  );
}

function SyncResult({ result }: { result: Awaited<ReturnType<typeof api.ssSync>> }) {
  const { t } = useLingui();
  const synced = result.synced ?? {};
  const labels: Record<string, string> = { subdomain: t`Subdomains`, service: t`Services`, app: t`Apps`, ip: t`IPs` };
  const companyList = result.companies?.join(t({ message: ", ", context: "list separator" }));
  const errorCount = result.errors?.length ?? 0;
  return (
    <div className="space-y-2 rounded-md border bg-muted/40 p-3 text-sm">
      <div className="flex flex-wrap gap-3">
        {Object.entries(synced).map(([k, v]) => (
          <Badge key={k} variant="secondary">
            {labels[k] ?? k}: {v}
          </Badge>
        ))}
      </div>
      {result.companies && result.companies.length > 0 && (
        <p className="text-muted-foreground">
          <Trans>Companies created/updated: {companyList}</Trans>
        </p>
      )}
      {result.warnings && result.warnings.length > 0 && (
        <ul className="list-inside list-disc text-amber-600 dark:text-amber-500">
          {result.warnings.map((wm) => (
            <li key={wm}>{wm}</li>
          ))}
        </ul>
      )}
      {result.errors && result.errors.length > 0 && (
        <ul className="list-inside list-disc text-destructive">
          {result.errors.slice(0, 20).map((em) => (
            <li key={em}>{em}</li>
          ))}
          {result.errors.length > 20 && (
            <li>
              <Trans>…{errorCount} errors in total</Trans>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
