// 渠道字段表与配置值的解析工具。
//
// 与页面拆开是因为这一份是**数据**而不是视图：它描述每种渠道有哪些字段、
// 各自该用什么控件，以及表单文本到配置值（JSON）的双向转换。
// 单独放一个文件后，新增渠道只需要动这里，页面本身不必改。

import type { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";

// 渠道类型的展示名与简介。放在前端是因为它只影响文案，后端不需要知道。
export const KIND_LABEL: Record<string, MessageDescriptor> = {
  dingtalk: msg`DingTalk`,
  feishu: msg`Feishu`,
  wecom: msg`WeCom`,
  webhook: msg`Generic webhook`,
  telegram: msg`Telegram`,
  email: msg`Email`,
};

// 各渠道的配置字段定义。
//
// 这里刻意保留一份前端字段表，而不是让后端下发 schema：后端只负责
// Validate（必填/格式），UI 需要的是布局与控件类型，两者关注的不是同一件事。
// 唯一的耦合点是 secret_keys —— 哪些字段该渲染成密码框由后端给出，
// 因为只有渠道实现自己清楚哪些值算凭据（企业微信的整个 Webhook 就是凭据，
// 而钉钉的只是其中一个 secret）。新增渠道时这里少一个条目只会让表单变空白，
// 不会静默出错（下面的 hasFields 会提示）。
export type FieldKind = "text" | "password" | "number" | "select" | "textarea" | "switch" | "kv" | "list";
export interface FieldDef {
  key: string;
  label: MessageDescriptor;
  kind: FieldKind;
  placeholder?: string;
  help?: MessageDescriptor;
  options?: { value: string; label: MessageDescriptor }[];
}

// Go-template tokens for the webhook body template — interpolated into the help
// text so the literal braces never land inside a translatable message.
const TPL_VARS = "{{.Title}} {{.Batch}} {{.Count}} {{.HomeURL}} {{.SentAt}}";
const TPL_ITEM_FIELDS = ".Name/.VulnClass/.Severity/.Summary/.Assets/.DetailURL/.StatusLabel";
const TPL_JSON = "{{json .Xxx}}";
const TPL_PLAIN = "{{.Xxx}}";

export const CHANNEL_FIELDS: Record<string, FieldDef[]> = {
  dingtalk: [
    {
      key: "webhook",
      label: msg`Webhook URL`,
      kind: "text",
      placeholder: "https://oapi.dingtalk.com/robot/send?access_token=...",
    },
    {
      key: "secret",
      label: msg`Signing secret`,
      kind: "password",
      help: msg`Fill in when the bot's security setting is "Signed"; leave empty for "Custom keywords" or no security setting`,
    },
  ],
  feishu: [
    {
      key: "webhook",
      label: msg`Webhook URL`,
      kind: "text",
      placeholder: "https://open.feishu.cn/open-apis/bot/v2/hook/...",
    },
    {
      key: "secret",
      label: msg`Signature secret`,
      kind: "password",
      help: msg`Fill in when the bot has signature verification enabled, otherwise leave empty`,
    },
  ],
  wecom: [
    {
      key: "webhook",
      label: msg`Webhook URL`,
      kind: "text",
      placeholder: "https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=...",
    },
  ],
  webhook: [
    { key: "url", label: msg`Target URL`, kind: "text", placeholder: "https://your-endpoint.example.com/hook" },
    {
      key: "method",
      label: msg`Request method`,
      kind: "select",
      options: [
        { value: "POST", label: msg`POST (with body)` },
        { value: "PUT", label: msg`PUT (with body)` },
        { value: "PATCH", label: msg`PATCH (with body)` },
        { value: "GET", label: msg`GET (no body)` },
      ],
    },
    {
      key: "headers",
      label: msg`Custom headers`,
      kind: "kv",
      help: msg`One KEY=VALUE per line, e.g. Authorization=Bearer xxx`,
    },
    {
      key: "body_template",
      label: msg`Body template`,
      kind: "textarea",
      help: msg`Leave empty to use the built-in default template. Variables: ${TPL_VARS}, plus ${TPL_ITEM_FIELDS} under range .Items. To insert a string use ${TPL_JSON} rather than ${TPL_PLAIN}, otherwise quotes in the title will break the JSON.`,
    },
  ],
  telegram: [
    { key: "bot_token", label: msg`Bot Token`, kind: "password", placeholder: "123456:ABC-DEF..." },
    { key: "chat_id", label: msg`Chat ID`, kind: "text", placeholder: "-1001234567890" },
    {
      key: "base_url",
      label: msg`API URL`,
      kind: "text",
      placeholder: "https://api.telegram.org",
      help: msg`Leave empty for the official endpoint; fill in when reverse-proxying a self-hosted Bot API`,
    },
  ],
  email: [
    { key: "host", label: msg`SMTP server`, kind: "text", placeholder: "smtp.example.com" },
    {
      key: "port",
      label: msg`Port`,
      kind: "number",
      placeholder: "587",
      help: msg`587 uses STARTTLS; for 465 turn on implicit TLS`,
    },
    { key: "username", label: msg`Account`, kind: "text" },
    { key: "password", label: msg`Password / auth code`, kind: "password" },
    { key: "from", label: msg`From`, kind: "text", placeholder: "artex@example.com" },
    { key: "to", label: msg`To`, kind: "list", help: msg`Separate multiple addresses with commas` },
    {
      key: "tls",
      label: msg`Implicit TLS`,
      kind: "switch",
      help: msg`Turn on for port 465; keep off for 587 (STARTTLS is automatic)`,
    },
  ],
};

export const SEVERITY_OPTIONS: { value: string; label: MessageDescriptor }[] = [
  { value: "", label: msg`Any` },
  { value: "low", label: msg`Low and above` },
  { value: "medium", label: msg`Medium and above` },
  { value: "high", label: msg`High and above` },
  { value: "critical", label: msg`Critical only` },
];

export type ChannelForm = {
  name: string;
  kind: string;
  mode: "realtime" | "digest";
  enabled: boolean;
  ratePerMin: string;
  config: Record<string, unknown>;
  minSeverity: string;
  includeText: string;
  excludeText: string;
  taskIDsText: string;
  assetIDsText: string;
  onStatusChange: boolean;
};

export const emptyForm = (kind: string): ChannelForm => ({
  name: "",
  kind,
  mode: "realtime",
  enabled: true,
  ratePerMin: "",
  config: {},
  minSeverity: "",
  includeText: "",
  excludeText: "",
  taskIDsText: "",
  assetIDsText: "",
  onStatusChange: false,
});

// parseKV 解析「每行 KEY=VALUE」的文本域。
export function parseKV(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of text.split("\n")) {
    const t = line.trim();
    if (!t) continue;
    const i = t.indexOf("=");
    if (i > 0) out[t.slice(0, i).trim()] = t.slice(i + 1).trim();
  }
  return out;
}
// parseIDs 解析逗号/空白分隔的 id 列表。
export function parseIDs(text: string): number[] {
  return text
    .split(/[\s,，]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => Number(s))
    .filter((n) => Number.isFinite(n) && n > 0);
}
// parseKeywords 解析行/逗号分隔的关键词列表（漏洞类型名可能含空格，所以按行或逗号切）。
export function parseKeywords(text: string): string[] {
  return text
    .split(/[\n,，]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}
