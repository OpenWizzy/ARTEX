import * as React from "react";

import type { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { Plural, useLingui } from "@lingui/react/macro";
import { SearchIcon } from "lucide-react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

// ── DSL autocomplete ──────────────────────────────────────────────────────────
// Shared by the global asset view (/function/assets) and the per-task 测试资产
// search, so both search boxes behave and look identical.

const DSL_FIELDS: { name: string; desc: MessageDescriptor; ops: { op: string; desc: MessageDescriptor }[] }[] = [
  {
    name: "domain",
    desc: msg`Domain (root domain / subdomain / service domain)`,
    ops: [
      { op: "=", desc: msg`Fuzzy match` },
      { op: "==", desc: msg`Exact match` },
      { op: "!=", desc: msg`Exclude` },
    ],
  },
  {
    name: "ip",
    desc: msg`IPv4/IPv6 address`,
    ops: [
      { op: "=", desc: msg`Fuzzy match` },
      { op: "==", desc: msg`Exact match` },
      { op: "!=", desc: msg`Exclude` },
    ],
  },
  {
    name: "url",
    desc: msg`Full URL (service / endpoint)`,
    ops: [
      { op: "=", desc: msg`Fuzzy match` },
      { op: "==", desc: msg`Exact match` },
      { op: "!=", desc: msg`Exclude` },
    ],
  },
  {
    name: "root_domain",
    desc: msg`Root domain`,
    ops: [
      { op: "=", desc: msg`Fuzzy match` },
      { op: "==", desc: msg`Exact match` },
      { op: "!=", desc: msg`Exclude` },
    ],
  },
  {
    name: "page_title",
    desc: msg`Page title (HTTP service)`,
    ops: [
      { op: "=", desc: msg`Fuzzy match` },
      { op: "==", desc: msg`Exact match` },
      { op: "!=", desc: msg`Exclude` },
    ],
  },
  {
    name: "icp",
    desc: msg`ICP filing number`,
    ops: [
      { op: "=", desc: msg`Fuzzy match` },
      { op: "==", desc: msg`Exact match` },
      { op: "!=", desc: msg`Exclude` },
    ],
  },
  {
    name: "service_name",
    desc: msg`Service name (non-HTTP service)`,
    ops: [
      { op: "=", desc: msg`Fuzzy match` },
      { op: "==", desc: msg`Exact match` },
      { op: "!=", desc: msg`Exclude` },
    ],
  },
  {
    name: "app_name",
    desc: msg`Application name`,
    ops: [
      { op: "=", desc: msg`Fuzzy match` },
      { op: "==", desc: msg`Exact match` },
      { op: "!=", desc: msg`Exclude` },
    ],
  },
  {
    name: "bundle_id",
    desc: msg`Application bundle ID`,
    ops: [
      { op: "=", desc: msg`Fuzzy match` },
      { op: "==", desc: msg`Exact match` },
      { op: "!=", desc: msg`Exclude` },
    ],
  },
  {
    name: "category",
    desc: msg`Application category`,
    ops: [
      { op: "=", desc: msg`Fuzzy match` },
      { op: "==", desc: msg`Exact match` },
      { op: "!=", desc: msg`Exclude` },
    ],
  },
  {
    name: "app_icp",
    desc: msg`Application ICP filing`,
    ops: [
      { op: "=", desc: msg`Fuzzy match` },
      { op: "==", desc: msg`Exact match` },
      { op: "!=", desc: msg`Exclude` },
    ],
  },
  {
    name: "method",
    desc: msg`HTTP method GET/POST/PUT/…`,
    ops: [
      { op: "==", desc: msg`Exact match` },
      { op: "!=", desc: msg`Exclude` },
    ],
  },
  {
    name: "service_type",
    desc: msg`Service type: http | other`,
    ops: [
      { op: "==", desc: msg`Exact match` },
      { op: "!=", desc: msg`Exclude` },
    ],
  },
  {
    name: "record_type",
    desc: msg`DNS record type A/CNAME/MX/…`,
    ops: [
      { op: "==", desc: msg`Exact match` },
      { op: "!=", desc: msg`Exclude` },
    ],
  },
  {
    name: "technology",
    desc: msg`Technology fingerprint (array field)`,
    ops: [
      { op: "=", desc: msg`Fuzzy match` },
      { op: "==", desc: msg`Exact match` },
      { op: "!=", desc: msg`Exclude` },
    ],
  },
  {
    name: "port",
    desc: msg`Port number (integer)`,
    ops: [
      { op: "==", desc: msg`Equals` },
      { op: "!=", desc: msg`Not equal to` },
      { op: ">", desc: msg`Greater than` },
      { op: ">=", desc: msg`Greater than or equal to` },
      { op: "<", desc: msg`Less than` },
      { op: "<=", desc: msg`Less than or equal to` },
    ],
  },
  {
    name: "status_code",
    desc: msg`HTTP status code (integer)`,
    ops: [
      { op: "==", desc: msg`Equals` },
      { op: "!=", desc: msg`Not equal to` },
      { op: ">", desc: msg`Greater than` },
      { op: ">=", desc: msg`Greater than or equal to` },
      { op: "<", desc: msg`Less than` },
      { op: "<=", desc: msg`Less than or equal to` },
    ],
  },
  { name: "company_id", desc: msg`Owning company ID (integer)`, ops: [{ op: "==", desc: msg`Equals` }] },
  { name: "task_id", desc: msg`Source task ID (integer)`, ops: [{ op: "==", desc: msg`Equals` }] },
];

const LOGIC_OPS = [
  { label: "AND", desc: msg`And (both conditions match)` },
  { label: "OR", desc: msg`Or (either condition matches)` },
];

interface DslSuggestion {
  kind: "field" | "operator" | "logic";
  label: string;
  desc: MessageDescriptor;
  replaceStart: number;
  replaceEnd: number;
  insertText: string;
}

function getDslSuggestions(text: string, cursor: number): DslSuggestion[] {
  const before = text.slice(0, cursor);
  // Current token: non-whitespace, non-paren run ending at cursor
  const tokenMatch = before.match(/([^\s()]*$)/);
  const currentToken = tokenMatch?.[1] ?? "";
  const tokenStart = cursor - currentToken.length;

  // Token already contains field+operator → typing a value, no suggestions
  if (/^[a-z_]+(==|!=|>=|<=|=|>|<)/.test(currentToken)) return [];

  // Complete known field name → suggest operators for that field
  const exactField = DSL_FIELDS.find((f) => f.name === currentToken.toLowerCase());
  if (exactField) {
    return exactField.ops.map(({ op, desc }) => ({
      kind: "operator",
      label: `${exactField.name}${op}`,
      desc,
      replaceStart: tokenStart,
      replaceEnd: cursor,
      insertText: `${exactField.name}${op}`,
    }));
  }

  // Everything before the current token (trimmed)
  const beforeToken = before.slice(0, tokenStart).trimEnd();
  const afterExpression = beforeToken.length > 0 && !/\b(AND|OR)\s*$/i.test(beforeToken) && !beforeToken.endsWith("(");

  // Current token is a prefix of AND/OR and follows a complete expression
  if (/^(a|an|and|o|or)$/i.test(currentToken) && afterExpression) {
    return LOGIC_OPS.filter((l) => l.label.startsWith(currentToken.toUpperCase())).map(({ label, desc }) => ({
      kind: "logic",
      label,
      desc,
      replaceStart: tokenStart,
      replaceEnd: cursor,
      insertText: `${label} `,
    }));
  }

  // No current token, after a complete expression → suggest AND/OR
  if (!currentToken && afterExpression) {
    return LOGIC_OPS.map(({ label, desc }) => ({
      kind: "logic",
      label,
      desc,
      replaceStart: cursor,
      replaceEnd: cursor,
      insertText: `${label} `,
    }));
  }

  // Default: suggest fields filtered by prefix
  const prefix = currentToken.toLowerCase();
  return DSL_FIELDS.filter((f) => f.name.startsWith(prefix)).map((f) => ({
    kind: "field",
    label: f.name,
    desc: f.desc,
    replaceStart: tokenStart,
    replaceEnd: cursor,
    insertText: f.name,
  }));
}

function applyDslSuggestion(text: string, s: DslSuggestion): { text: string; cursor: number } {
  const newText = text.slice(0, s.replaceStart) + s.insertText + text.slice(s.replaceEnd);
  return { text: newText, cursor: s.replaceStart + s.insertText.length };
}

const KIND_STYLE: Record<string, string> = {
  field: "text-blue-500 dark:text-blue-400",
  operator: "text-amber-500 dark:text-amber-400",
  logic: "text-emerald-500 dark:text-emerald-400",
};

// AssetDslSearch is the shared DSL search box: a monospace input with a
// field/operator/logic autocomplete popover and a status line ("找到 N 条" /
// error / loading). Used by both the global asset view and the per-task view.
export function AssetDslSearch({
  query,
  onChange,
  loading,
  error,
  count,
}: {
  query: string;
  onChange: (v: string) => void;
  loading: boolean;
  error: string;
  count?: number;
}) {
  const { t, i18n } = useLingui();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [suggestions, setSuggestions] = React.useState<DslSuggestion[]>([]);
  const [selIdx, setSelIdx] = React.useState(0);
  const [open, setOpen] = React.useState(false);

  const refresh = React.useCallback((val: string, pos: number) => {
    const suggs = getDslSuggestions(val, pos);
    setSuggestions(suggs);
    setSelIdx(0);
    setOpen(suggs.length > 0);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    onChange(val);
    refresh(val, e.target.selectionStart ?? val.length);
  };

  const apply = React.useCallback(
    (s: DslSuggestion) => {
      const cursor = inputRef.current?.selectionStart ?? query.length;
      // use cursor for logic-kind (insert at cursor), replaceStart/End for others
      const adjusted: DslSuggestion =
        s.kind === "logic" && !query.slice(s.replaceStart, s.replaceEnd)
          ? { ...s, replaceStart: cursor, replaceEnd: cursor }
          : s;
      const { text: newText, cursor: newCursor } = applyDslSuggestion(query, adjusted);
      onChange(newText);
      requestAnimationFrame(() => {
        if (!inputRef.current) return;
        inputRef.current.setSelectionRange(newCursor, newCursor);
        inputRef.current.focus();
        refresh(newText, newCursor);
      });
    },
    [query, onChange, refresh],
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelIdx((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Tab" || e.key === "Enter") {
      const s = suggestions[selIdx];
      if (s) {
        e.preventDefault();
        apply(s);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  const cursorPos = () => inputRef.current?.selectionStart ?? query.length;
  const found = count ?? 0;

  return (
    <div className="flex flex-col gap-1">
      <div className="relative max-w-lg">
        <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          ref={inputRef}
          placeholder={t`DSL search: domain=example AND status_code>=400`}
          value={query}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => refresh(query, cursorPos())}
          onClick={() => refresh(query, cursorPos())}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          className="h-8 pl-8 font-mono text-xs"
        />
        {open && suggestions.length > 0 && (
          <div className="absolute top-full left-0 z-50 mt-1 w-max min-w-full max-w-sm rounded-md border bg-popover py-1 shadow-md">
            {suggestions.map((s, i) => (
              <button
                type="button"
                key={i}
                className={cn(
                  "flex w-full cursor-pointer items-center gap-3 px-3 py-1.5 text-left",
                  i === selIdx ? "bg-accent" : "hover:bg-accent/50",
                )}
                onMouseEnter={() => setSelIdx(i)}
                onMouseDown={(e) => {
                  e.preventDefault();
                  apply(s);
                }}
              >
                <span className={cn("shrink-0 font-mono text-xs font-semibold", KIND_STYLE[s.kind])}>{s.label}</span>
                <span className="text-xs text-muted-foreground">{i18n._(s.desc)}</span>
              </button>
            ))}
          </div>
        )}
      </div>
      {query.trim() && !open && (
        <p className="pl-1 text-[11px] text-muted-foreground">
          {loading ? (
            t`Searching…`
          ) : error ? (
            <span className="text-destructive">{error}</span>
          ) : (
            <Plural value={found} one="Found # result" other="Found # results" />
          )}
        </p>
      )}
    </div>
  );
}
