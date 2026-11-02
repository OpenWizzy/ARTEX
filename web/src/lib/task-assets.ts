import type { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";

import { tr } from "@/lib/i18n";
import type { NewAssetType } from "@/lib/types";

const ASSET_TYPE_LABELS: Record<NewAssetType, MessageDescriptor> = {
  app: msg`Application`,
  endpoint: msg`Endpoint`,
  ip: msg`IP`,
  root_domain: msg`Root domain`,
  service: msg`Service`,
  subdomain: msg`Subdomain`,
};

const TASK_ASSET_SOURCE_LABELS: Record<string, MessageDescriptor> = {
  agent: msg`Discovered by Agent`,
  anchor: msg`Blackboard anchor`,
  api: msg`Asset API`,
  company: msg`Linked via company`,
  legacy: msg`Legacy link`,
  manual: msg`Added manually`,
  system: msg`Linked by system`,
  task: msg`Task setup`,
};

export function taskAssetTypeLabel(type: NewAssetType): string {
  const label = ASSET_TYPE_LABELS[type] as MessageDescriptor | undefined;
  return label ? tr(label) : (label as unknown as string);
}

export function taskAssetSourceLabel(source: string): string {
  const label = TASK_ASSET_SOURCE_LABELS[source] as MessageDescriptor | undefined;
  return label ? tr(label) : source;
}
