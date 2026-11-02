import * as React from "react";

import { Trans, useLingui } from "@lingui/react/macro";
import { CpuIcon, FlaskConicalIcon, KeyboardIcon, RadioTowerIcon, SearchIcon, ShieldAlertIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { api } from "@/lib/api";
import { CHAT_SEND_MODE_OPTIONS, type ChatSendMode, setChatSendMode, useChatSendMode } from "@/lib/chat-send-mode";
import type { Settings } from "@/lib/types";

import { UpdateCard } from "./update-card";

export default function SystemSettingsPage() {
  const { t } = useLingui();
  const [trafficCapture, setTrafficCapture] = React.useState(false);
  const [agentTrafficBinding, setAgentTrafficBinding] = React.useState(false);
  const [webSearch, setWebSearch] = React.useState(false);
  const [backend, setBackend] = React.useState("ddgs");
  const [braveKeySet, setBraveKeySet] = React.useState(false);
  const [braveKeyInput, setBraveKeyInput] = React.useState("");
  const [tavilyKeySet, setTavilyKeySet] = React.useState(false);
  const [tavilyKeyInput, setTavilyKeyInput] = React.useState("");
  const [savingTavilyKey, setSavingTavilyKey] = React.useState(false);
  const [proxyInput, setProxyInput] = React.useState("");
  const [savingProxy, setSavingProxy] = React.useState(false);
  const [globalProxyInput, setGlobalProxyInput] = React.useState("");
  const [savingGlobalProxy, setSavingGlobalProxy] = React.useState(false);
  const [testing, setTesting] = React.useState(false);
  const [loaded, setLoaded] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [savingKey, setSavingKey] = React.useState(false);
  const [pyInterp, setPyInterp] = React.useState("");
  const [workers, setWorkers] = React.useState("3");
  const [savingWorkers, setSavingWorkers] = React.useState(false);
  // 操作约束注入范围(默认都开)。
  const [injectPlanner, setInjectPlanner] = React.useState(true);
  const [injectWorker, setInjectWorker] = React.useState(true);
  // 实验功能:noa 上下文压缩(默认关)。
  const [noaCompaction, setNoaCompaction] = React.useState(false);
  // 纯前端偏好：不走 /api/settings，直接读写 localStorage。
  const sendMode = useChatSendMode();

  const apply = React.useCallback((s: Settings) => {
    setTrafficCapture(!!s.traffic_capture);
    setAgentTrafficBinding(!!s.agent_traffic_binding);
    setWebSearch(!!s.web_search_enabled);
    setBackend(s.web_search_backend || "ddgs");
    setBraveKeySet(!!s.brave_key_set);
    setTavilyKeySet(!!s.tavily_key_set);
    setProxyInput(s.web_search_proxy ?? "");
    setGlobalProxyInput(s.global_proxy ?? "");
    setPyInterp(s.python_interpreter ?? "");
    setWorkers(String(s.workers ?? 3));
    setInjectPlanner(s.constraints_inject_planner !== false);
    setInjectWorker(s.constraints_inject_worker !== false);
    setNoaCompaction(!!s.noa_compaction);
  }, []);

  const saveWorkers = () => {
    const n = Number(workers);
    if (!Number.isInteger(n) || n <= 0) {
      toast.error(t`Concurrency must be an integer greater than 0`);
      return;
    }
    setSavingWorkers(true);
    api
      .setSettings({ workers: n })
      .then((s) => {
        apply(s);
        toast.success(t`Saved the worker Agent count (applies to tasks started afterward)`);
      })
      .catch((e) => toast.error(t`Save failed: ${(e as Error).message}`))
      .finally(() => setSavingWorkers(false));
  };

  const savePython = () => {
    setSaving(true);
    api
      .setSettings({ python_interpreter: pyInterp.trim() })
      .then((s) => {
        apply(s);
        toast.success(t`Saved the Python interpreter setting`);
      })
      .catch((e) => toast.error(t`Save failed: ${(e as Error).message}`))
      .finally(() => setSaving(false));
  };
  const detectPython = () => {
    setSaving(true);
    api
      .detectPython()
      .then((r) => setPyInterp(r.python_interpreter))
      .catch(() => undefined)
      .finally(() => setSaving(false));
  };

  React.useEffect(() => {
    api
      .settings()
      .then(apply)
      .catch(() => undefined)
      .finally(() => setLoaded(true));
  }, [apply]);

  const toggleTraffic = (v: boolean) => {
    setTrafficCapture(v); // optimistic
    setSaving(true);
    api
      .setSettings({ traffic_capture: v })
      .then(apply)
      .catch(() => setTrafficCapture(!v)) // revert on failure
      .finally(() => setSaving(false));
  };

  const toggleInjectPlanner = (v: boolean) => {
    setInjectPlanner(v); // optimistic
    api
      .setSettings({ constraints_inject_planner: v })
      .then(apply)
      .catch(() => setInjectPlanner(!v)); // revert on failure
  };

  const toggleAgentTrafficBinding = (v: boolean) => {
    setAgentTrafficBinding(v);
    setSaving(true);
    api
      .setSettings({ agent_traffic_binding: v })
      .then((s) => {
        apply(s);
        toast.success(
          v ? t`Enabled automatic traffic binding for Agents` : t`Disabled automatic traffic binding for Agents`,
        );
      })
      .catch((e) => {
        setAgentTrafficBinding(!v);
        toast.error(t`Save failed: ${(e as Error).message}`);
      })
      .finally(() => setSaving(false));
  };

  const toggleInjectWorker = (v: boolean) => {
    setInjectWorker(v); // optimistic
    api
      .setSettings({ constraints_inject_worker: v })
      .then(apply)
      .catch(() => setInjectWorker(!v)); // revert on failure
  };

  const toggleNoaCompaction = (v: boolean) => {
    setNoaCompaction(v); // optimistic
    api
      .setSettings({ noa_compaction: v })
      .then((s) => {
        apply(s);
        toast.success(
          v
            ? t`Enabled noa context compaction (applies to runs started afterward)`
            : t`Disabled noa context compaction (restored built-in compaction)`,
        );
      })
      .catch((e) => {
        setNoaCompaction(!v); // revert on failure
        toast.error(t`Save failed: ${(e as Error).message}`);
      });
  };

  // Persist a web-search patch (enable and/or backend). Optimistic with refetch.
  const saveWebSearch = (patch: Partial<Settings>) => {
    setSaving(true);
    api
      .setSettings(patch)
      .then((s) => {
        apply(s);
        toast.success(t`Saved web search settings`);
      })
      .catch((e) => {
        toast.error(t`Save failed: ${(e as Error).message}`);
        api
          .settings()
          .then(apply)
          .catch(() => undefined);
      })
      .finally(() => setSaving(false));
  };

  const saveBraveKey = () => {
    setSavingKey(true);
    api
      .setSettings({ brave_search_api_key: braveKeyInput })
      .then((s) => {
        apply(s);
        setBraveKeyInput("");
        toast.success(t`Saved the Brave API key`);
      })
      .catch((e) => toast.error(t`Save failed: ${(e as Error).message}`))
      .finally(() => setSavingKey(false));
  };

  const saveTavilyKey = () => {
    setSavingTavilyKey(true);
    api
      .setSettings({ tavily_search_api_key: tavilyKeyInput })
      .then((s) => {
        apply(s);
        setTavilyKeyInput("");
        toast.success(t`Saved the Tavily API key`);
      })
      .catch((e) => toast.error(t`Save failed: ${(e as Error).message}`))
      .finally(() => setSavingTavilyKey(false));
  };

  const saveProxy = () => {
    setSavingProxy(true);
    api
      .setSettings({ web_search_proxy: proxyInput.trim() })
      .then((s) => {
        apply(s);
        toast.success(proxyInput.trim() ? t`Saved the egress proxy` : t`Cleared the egress proxy (now direct)`);
      })
      .catch((e) => toast.error(t`Save failed: ${(e as Error).message}`))
      .finally(() => setSavingProxy(false));
  };

  const saveGlobalProxy = () => {
    setSavingGlobalProxy(true);
    api
      .setSettings({ global_proxy: globalProxyInput.trim() })
      .then((s) => {
        apply(s);
        toast.success(globalProxyInput.trim() ? t`Saved the global proxy` : t`Cleared the global proxy (now direct)`);
      })
      .catch((e) => toast.error(t`Save failed: ${(e as Error).message}`))
      .finally(() => setSavingGlobalProxy(false));
  };

  // Run a real "test" search ("test") against the CURRENT form values (backend +
  // proxy + entered key), falling back to saved values server-side. Toasts result.
  const runTest = () => {
    setTesting(true);
    api
      .testWebSearch({
        web_search_backend: backend,
        web_search_proxy: proxyInput.trim(),
        brave_search_api_key: braveKeyInput,
        tavily_search_api_key: tavilyKeyInput,
      })
      .then((r) => {
        if (r.ok) toast.success(t`Search test succeeded · ${r.backend} returned ${r.count} results`);
        else {
          const reason = r.error || t`unknown error`;
          toast.error(t`Search test failed: ${reason}`);
        }
      })
      .catch((e) => toast.error(t`Search test failed: ${(e as Error).message}`))
      .finally(() => setTesting(false));
  };

  // brave-free selected but no key stored and none being entered → tool stays off.
  const braveNeedsKey = webSearch && backend === "brave-free" && !braveKeySet;

  return (
    <div className="flex flex-1 flex-col gap-4 md:gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">
          <Trans>System settings</Trans>
        </h1>
        <p className="text-muted-foreground text-sm">
          <Trans>Global runtime switches</Trans>
        </p>
      </div>

      {/* 多列而非 grid：网络搜索卡片比其余高数倍，且高度随所选后端变化（brave/tavily
          的 key 输入是条件渲染）。grid 会按最高的一张撑满整行、在旁边留下大片空白，
          多列则自动按内容高度平衡填充。卡片间距靠 mb 而非 gap——多列布局下
          column-gap 只管列间距，行间距要由子元素自己给。 */}
      <div className="columns-1 gap-4 md:gap-6 lg:columns-2">
        <UpdateCard />

        <Card className="mb-4 break-inside-avoid md:mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <RadioTowerIcon className="size-4" />
              <Trans>Traffic capture</Trans>
            </CardTitle>
            <CardDescription>
              <Trans>
                When enabled, every Agent's HTTP traffic is fully recorded to the database through the recording proxy,
                and the traffic_search / traffic_get tools and proxy settings are injected into the Agent (the prompt
                includes proxy instructions).
                <br />
                When off (default), no traffic is recorded: the Agent <b>won't</b> get the proxy settings or traffic
                tools, and the prompt <b>won't</b> include anything proxy-related. Switching rebuilds Agents to take
                effect immediately.
              </Trans>
            </CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-between gap-4">
            <Label htmlFor="traffic-capture" className="text-sm font-normal text-muted-foreground">
              {trafficCapture
                ? t`On · recording traffic and injecting the proxy`
                : t`Off · not recording, not injecting the proxy`}
            </Label>
            <Switch
              id="traffic-capture"
              checked={trafficCapture}
              disabled={!loaded || saving}
              onCheckedChange={toggleTraffic}
            />
          </CardContent>
        </Card>

        <Card className="mb-4 break-inside-avoid md:mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <RadioTowerIcon className="size-4" />
              <Trans>Agent automatic traffic binding</Trans>
            </CardTitle>
            <CardDescription id="agent-traffic-binding-description">
              <Trans>
                Off by default. When enabled, the report Agent triggered when a vulnerability is saved checks existing
                HTTP requests/responses and links the matching traffic before writing the report.
                <b>Inspecting packets and the extra tool calls increase token usage.</b>
                <br />
                TCP, un-captured, or unmatched traffic can still be reported normally. This switch doesn't affect
                traffic capture, manual binding, or viewing saved evidence. It applies to the next round of Agents;
                disabling it immediately rejects new automatic bindings.
              </Trans>
            </CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-between gap-4">
            <Label htmlFor="agent-traffic-binding" className="text-sm font-normal text-muted-foreground">
              {agentTrafficBinding ? t`On · increases token usage` : t`Off · manual binding still available`}
            </Label>
            <Switch
              id="agent-traffic-binding"
              aria-describedby="agent-traffic-binding-description"
              checked={agentTrafficBinding}
              disabled={!loaded || saving}
              onCheckedChange={toggleAgentTrafficBinding}
            />
          </CardContent>
        </Card>

        <Card className="mb-4 break-inside-avoid md:mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <RadioTowerIcon className="size-4" />
              <Trans>Global proxy</Trans>
            </CardTitle>
            <CardDescription>
              <Trans>
                Every Agent's <b>target traffic</b> egresses through this proxy (hiding the source IP / via a jump
                host). Supports <b>http / https / socks5</b> and may carry <code>user:pass</code> authentication. Empty
                = direct connection.
                <br />
                When <b>traffic capture</b> is on, it acts as the <b>upstream</b> of the recording proxy (traffic is
                still fully recorded, then egresses through this proxy); when capture is off, it's injected directly
                into the Agent's bash / WebFetch egress. Independent of the web-search proxy and the LLM proxy.
                <br />
                <b>Tip</b>: with <b>capture off</b>, socks5 relies on each command-line tool's support for{" "}
                <code>ALL_PROXY</code> (curl works, some tools may ignore it); if you mainly use socks5, turn on traffic
                capture — on that path the MITM dials out itself, so tools are unaware and it works reliably.
              </Trans>
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <Label htmlFor="global-proxy" className="text-sm font-normal text-muted-foreground">
              <Trans>Proxy address</Trans>
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="global-proxy"
                autoComplete="off"
                placeholder={t`socks5://user:pass@host:1080 or http://host:port (empty = direct)`}
                value={globalProxyInput}
                disabled={!loaded || savingGlobalProxy}
                onChange={(e) => setGlobalProxyInput(e.target.value)}
              />
              <Button type="button" onClick={saveGlobalProxy} disabled={!loaded || savingGlobalProxy}>
                <Trans>Save</Trans>
              </Button>
            </div>
            <p className="text-muted-foreground text-xs">
              {globalProxyInput.trim()
                ? t`Configured · all target traffic egresses through this proxy`
                : t`Not configured · target traffic egresses directly`}
            </p>
          </CardContent>
        </Card>

        <Card className="mb-4 break-inside-avoid md:mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldAlertIcon className="size-4" />
              <Trans>Operation constraint injection</Trans>
            </CardTitle>
            <CardDescription>
              <Trans>
                When enabled, each task's <b>operation constraints</b> (the allow/deny entries maintained under
                "Operation constraints" in the task overview) are woven into the matching Agent's system prompt to frame
                the exploration boundary (e.g. "test only the current port", "no brute forcing").
                <br />
                Injection into the <b>planner</b> and <b>worker</b> can be controlled separately; both on by default.
                Switching takes effect immediately (read next round), with no Agent rebuild. Once off, that Agent no
                longer sees the constraints.
              </Trans>
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-4">
              <Label htmlFor="inject-planner" className="text-sm font-normal text-muted-foreground">
                {injectPlanner ? <Trans>Inject into planner · on</Trans> : <Trans>Inject into planner · off</Trans>}
              </Label>
              <Switch
                id="inject-planner"
                checked={injectPlanner}
                disabled={!loaded}
                onCheckedChange={toggleInjectPlanner}
              />
            </div>
            <div className="flex items-center justify-between gap-4">
              <Label htmlFor="inject-worker" className="text-sm font-normal text-muted-foreground">
                {injectWorker ? <Trans>Inject into worker · on</Trans> : <Trans>Inject into worker · off</Trans>}
              </Label>
              <Switch
                id="inject-worker"
                checked={injectWorker}
                disabled={!loaded}
                onCheckedChange={toggleInjectWorker}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="mb-4 break-inside-avoid md:mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FlaskConicalIcon className="size-4" />
              <Trans>Experimental features</Trans>
            </CardTitle>
            <CardDescription>
              <Trans>
                Mechanisms still being validated, off by default. They may change Agent behavior or affect stability, so
                enable them only once you understand the impact.
                <br />
                <b>noa context compaction</b>: the model actively compacts long conversation history (norma v0.4.0).
                Once enabled, the platform's four kinds of Agent (<b>planner / worker / main Agent / conversation</b>)
                switch to noa for context, replacing the built-in compaction, and the original text before compaction is
                archived under the task working directory for later review. Switching takes effect immediately (for runs
                started afterward), with no Agent rebuild; disabling it restores the built-in compaction immediately.
              </Trans>
            </CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-between gap-4">
            <Label htmlFor="noa-compaction" className="text-sm font-normal text-muted-foreground">
              {noaCompaction ? <Trans>noa context compaction · on</Trans> : <Trans>noa context compaction · off</Trans>}
            </Label>
            <Switch
              id="noa-compaction"
              checked={noaCompaction}
              disabled={!loaded}
              onCheckedChange={toggleNoaCompaction}
            />
          </CardContent>
        </Card>

        <Card className="mb-4 break-inside-avoid md:mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <SearchIcon className="size-4" />
              <Trans>Web search</Trans>
            </CardTitle>
            <CardDescription>
              <Trans>
                This is the <b>master switch + source configuration</b> for web search. Only once it's on can each{" "}
                <b>Agent's configuration</b> individually choose whether to enable <b>web_search</b> (which returns only
                titles/links/snippets, not the body; fetching the body is WebFetch's job). Web search <b>does not</b> go
                through the recording proxy and is independent of traffic capture.
                <br />
                Sources: <b>DuckDuckGo (ddgs)</b> (no key needed), <b>Brave (free tier)</b> (needs a Brave API key),{" "}
                <b>Tavily</b> (needs a Tavily API key), or <b>DeepSeek</b> (reuses the current LLM profile). When the
                master switch is off, each Agent's web-search toggle is unavailable.
              </Trans>
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-4">
              <Label htmlFor="web-search" className="text-sm font-normal text-muted-foreground">
                {webSearch
                  ? t`Master switch on · can be enabled per Agent in its configuration`
                  : t`Off · Agents can't enable web search`}
              </Label>
              <Switch
                id="web-search"
                checked={webSearch}
                disabled={!loaded || saving}
                onCheckedChange={(v) => {
                  setWebSearch(v); // optimistic
                  saveWebSearch({ web_search_enabled: v });
                }}
              />
            </div>

            {webSearch && (
              <div className="flex items-center justify-between gap-4">
                <Label className="text-sm font-normal text-muted-foreground">
                  <Trans>Search source</Trans>
                </Label>
                <Select
                  value={backend}
                  disabled={!loaded || saving}
                  onValueChange={(v) => {
                    setBackend(v); // optimistic
                    saveWebSearch({ web_search_backend: v });
                  }}
                >
                  <SelectTrigger className="w-48 shrink-0">
                    <SelectValue placeholder={t`Select a source`} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ddgs">
                      <Trans>DuckDuckGo (ddgs · free, no key)</Trans>
                    </SelectItem>
                    <SelectItem value="brave-free">
                      <Trans>Brave (free tier · key required)</Trans>
                    </SelectItem>
                    <SelectItem value="tavily">
                      <Trans>Tavily (key required)</Trans>
                    </SelectItem>
                    <SelectItem value="deepseek">
                      <Trans>DeepSeek (official)</Trans>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {webSearch && backend === "deepseek" && (
              <div className="border-border/60 bg-muted/30 flex flex-col gap-2 rounded-md border p-3">
                <p className="text-sm font-medium">
                  <Trans>DeepSeek official web search</Trans>
                </p>
                <p className="text-muted-foreground text-xs leading-relaxed">
                  <Trans>
                    This source directly reuses the <b>currently active LLM profile</b>. It therefore{" "}
                    <b>only supports DeepSeek's official models</b>, and that profile{" "}
                    <b>must use the anthropic protocol</b> — DeepSeek's OpenAI-protocol endpoint doesn't support
                    server-side search. This source may stop working after you switch the LLM profile.
                  </Trans>
                </p>
                <p className="text-muted-foreground text-xs leading-relaxed">
                  <Trans>
                    Unlike the other sources, the search runs <b>on DeepSeek's server</b>: each search consumes an extra
                    model call (incurring token cost), the search request{" "}
                    <b>doesn't go through the egress proxy above</b> and <b>isn't counted in the traffic trail</b>;
                    results include <b>only titles and links</b> (no snippets), and WebFetch fetches the body when
                    needed.
                  </Trans>
                </p>
                <p className="text-muted-foreground text-xs leading-relaxed">
                  <Trans>
                    Whether these conditions are met is for you to confirm; the system won't block it. Use the "Test
                    search" button below to actually run one and verify.
                  </Trans>
                </p>
              </div>
            )}

            {webSearch && backend === "brave-free" && (
              <div className="flex flex-col gap-2">
                <Label htmlFor="brave-key" className="text-sm font-normal text-muted-foreground">
                  Brave Search API Key
                  {braveKeySet && (
                    <span className="ml-2 text-xs text-emerald-500">
                      <Trans>Configured</Trans>
                    </span>
                  )}
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="brave-key"
                    type="password"
                    autoComplete="off"
                    placeholder={braveKeySet ? t`Configured (leave empty to keep)` : t`Enter Brave API Key`}
                    value={braveKeyInput}
                    disabled={!loaded || savingKey}
                    onChange={(e) => setBraveKeyInput(e.target.value)}
                  />
                  <Button
                    type="button"
                    onClick={saveBraveKey}
                    disabled={!loaded || savingKey || braveKeyInput.trim() === ""}
                  >
                    <Trans>Save</Trans>
                  </Button>
                </div>
                {braveNeedsKey && (
                  <p className="text-xs text-amber-500">
                    <Trans>
                      Brave selected but no key configured yet — the search tool won't be enabled until you save a key.
                    </Trans>
                  </p>
                )}
                <p className="text-muted-foreground text-xs">
                  <Trans>Free tier is about 2,000 requests/month. Get a key at https://brave.com/search/api/.</Trans>
                </p>
              </div>
            )}

            {webSearch && backend === "tavily" && (
              <div className="flex flex-col gap-2">
                <Label htmlFor="tavily-key" className="text-sm font-normal text-muted-foreground">
                  Tavily Search API Key
                  {tavilyKeySet && (
                    <span className="ml-2 text-xs text-emerald-500">
                      <Trans>Configured</Trans>
                    </span>
                  )}
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="tavily-key"
                    type="password"
                    autoComplete="off"
                    placeholder={tavilyKeySet ? t`Configured (leave empty to keep)` : t`Enter Tavily API Key (tvly-…)`}
                    value={tavilyKeyInput}
                    disabled={!loaded || savingTavilyKey}
                    onChange={(e) => setTavilyKeyInput(e.target.value)}
                  />
                  <Button
                    type="button"
                    onClick={saveTavilyKey}
                    disabled={!loaded || savingTavilyKey || tavilyKeyInput.trim() === ""}
                  >
                    <Trans>Save</Trans>
                  </Button>
                </div>
                {webSearch && backend === "tavily" && !tavilyKeySet && (
                  <p className="text-xs text-amber-500">
                    <Trans>
                      Tavily selected but no key configured yet — the search tool won't be enabled until you save a key.
                    </Trans>
                  </p>
                )}
                <p className="text-muted-foreground text-xs">
                  <Trans>Sign up and get an API key at https://tavily.com.</Trans>
                </p>
              </div>
            )}

            {webSearch && (
              <div className="flex flex-col gap-2">
                <Label htmlFor="ws-proxy" className="text-sm font-normal text-muted-foreground">
                  <Trans>Egress proxy (optional)</Trans>
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="ws-proxy"
                    autoComplete="off"
                    placeholder={t`http://host:port or socks5://host:port (empty = direct)`}
                    value={proxyInput}
                    disabled={!loaded || savingProxy}
                    onChange={(e) => setProxyInput(e.target.value)}
                  />
                  <Button type="button" onClick={saveProxy} disabled={!loaded || savingProxy}>
                    <Trans>Save</Trans>
                  </Button>
                </div>
                <p className="text-muted-foreground text-xs">
                  <Trans>
                    A standalone egress proxy, used only to reach the search endpoints (VPN/SOCKS, etc.). Unrelated to
                    the MITM proxy that records traffic; used to reach the endpoints when the network is otherwise
                    blocked.
                  </Trans>
                </p>
              </div>
            )}

            {webSearch && (
              <div className="flex items-center justify-between gap-4 border-t pt-4">
                <p className="text-muted-foreground text-xs">
                  <Trans>
                    Runs a real "test" search with the current configuration (source + proxy + key) to verify it works.
                  </Trans>
                </p>
                <Button
                  type="button"
                  variant="outline"
                  onClick={runTest}
                  disabled={!loaded || testing}
                  className="shrink-0"
                >
                  {testing ? t`Testing…` : t`Test search`}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="mb-4 break-inside-avoid md:mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <RadioTowerIcon className="size-4" />
              <Trans>Custom scripts · Python interpreter</Trans>
            </CardTitle>
            <CardDescription>
              <Trans>
                Custom <b>script</b> tools use it to run Python. It's auto-detected at startup (python3 preferred); here
                you can manually enter the absolute path to a venv / specific version, or leave it empty to auto-detect
                at runtime.
              </Trans>
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <Input
                className="font-mono text-sm"
                placeholder={t`/usr/bin/python3 (empty = auto-detect)`}
                value={pyInterp}
                disabled={!loaded || saving}
                onChange={(e) => setPyInterp(e.target.value)}
              />
              <Button variant="outline" onClick={detectPython} disabled={!loaded || saving}>
                <Trans>Re-detect</Trans>
              </Button>
              <Button onClick={savePython} disabled={!loaded || saving}>
                <Trans>Save</Trans>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-4 break-inside-avoid md:mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CpuIcon className="size-4" />
              <Trans>Work concurrency · Work Agent count</Trans>
            </CardTitle>
            <CardDescription>
              <Trans>
                The number of worker agents each task runs concurrently (default 3). A higher value means more parallel
                probing and higher cost. Changes <b>apply to tasks started afterward</b>; running tasks are unaffected.
              </Trans>
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={1}
                className="w-32 font-mono text-sm"
                placeholder="3"
                value={workers}
                disabled={!loaded || savingWorkers}
                onChange={(e) => setWorkers(e.target.value)}
              />
              <Button onClick={saveWorkers} disabled={!loaded || savingWorkers}>
                <Trans>Save</Trans>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-4 break-inside-avoid md:mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <KeyboardIcon className="size-4" />
              <Trans>Chat input send key</Trans>
            </CardTitle>
            <CardDescription>
              <Trans>
                The conversation page and the task-detail main Agent chat input share this setting; it takes effect
                immediately once selected, no saving needed.
                <br />
                This preference <b>lives only in this browser</b>, doesn't sync with your account, and must be set again
                after switching browsers or clearing site data.
              </Trans>
            </CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-between gap-4">
            <Label htmlFor="chat-send-mode" className="text-sm font-normal text-muted-foreground">
              <Trans>Send method</Trans>
            </Label>
            <Select value={sendMode} onValueChange={(v) => setChatSendMode(v as ChatSendMode)}>
              <SelectTrigger id="chat-send-mode" className="w-72">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CHAT_SEND_MODE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
