import * as React from "react";

import type { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";

import { Badge } from "@/components/ui/badge";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import type { ParsedCompanyScopeText } from "@/lib/company-scope";
import type { CompanyScopeKind } from "@/lib/types";

const SCOPE_KIND_LABELS: Record<CompanyScopeKind, MessageDescriptor> = {
  domain: msg`Domain`,
  ip: msg`IP`,
  cidr: msg`CIDR`,
  icp: msg`ICP`,
  keyword: msg`Keyword`,
};

export function ScopeTextEditor({
  id,
  value,
  onValueChange,
  parsed,
  label,
  description,
}: {
  id: string;
  value: string;
  onValueChange: (value: string) => void;
  parsed: ParsedCompanyScopeText;
  label?: string;
  description?: string;
}) {
  const { t, i18n } = useLingui();
  const counts = React.useMemo(() => {
    const result = new Map<CompanyScopeKind, number>();
    for (const rule of parsed.rules) result.set(rule.kind, (result.get(rule.kind) ?? 0) + 1);
    return result;
  }, [parsed.rules]);

  const resolvedLabel = label ?? t`Asset scope`;
  const resolvedDescription =
    description ??
    t`One entry per line; domains, IPs, CIDRs, ICP filings, and company keywords are detected automatically.`;
  const ruleCount = parsed.rules.length;
  const overflowCount = parsed.errors.length - 5;

  return (
    <Field data-invalid={parsed.errors.length > 0}>
      <FieldLabel htmlFor={id}>{resolvedLabel}</FieldLabel>
      <FieldDescription>{resolvedDescription}</FieldDescription>
      <Textarea
        id={id}
        rows={8}
        value={value}
        aria-invalid={parsed.errors.length > 0}
        placeholder={t`example.com\n203.0.113.10\n198.51.100.0/24\nICP filing number\nCompany name keyword`}
        className="min-h-36 resize-y font-mono text-sm"
        onChange={(event) => onValueChange(event.target.value)}
      />
      {parsed.rules.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 text-muted-foreground text-xs">
          <span>
            <Trans>{ruleCount} detected</Trans>
          </span>
          {Object.entries(SCOPE_KIND_LABELS).map(([kind, kindLabel]) => {
            const count = counts.get(kind as CompanyScopeKind) ?? 0;
            return count > 0 ? (
              <Badge key={kind} variant="secondary" className="font-mono tabular-nums">
                {i18n._(kindLabel)} {count}
              </Badge>
            ) : null;
          })}
        </div>
      )}
      {parsed.errors.length > 0 && (
        <FieldError>
          {parsed.errors.slice(0, 5).map((item) => {
            const line = item.line;
            const error = item.error;
            return (
              <span key={`${item.line}-${item.error}`} className="block">
                <Trans>
                  Line {line}: {error}
                </Trans>
              </span>
            );
          })}
          {parsed.errors.length > 5 && (
            <span className="block">
              <Trans>{overflowCount} more lines with errors</Trans>
            </span>
          )}
        </FieldError>
      )}
    </Field>
  );
}
