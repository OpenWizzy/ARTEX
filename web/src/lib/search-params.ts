/**
 * validateSearch for a route whose query is a few optional string params
 * (`?id=…`). The router keeps every value a string (router.tsx), so this only
 * picks the named keys and drops empty ones.
 */
export function stringParams<K extends string>(...keys: K[]) {
  return (search: Record<string, unknown>): { [P in K]?: string } => {
    const out: { [P in K]?: string } = {};
    for (const key of keys) {
      const value = search[key];
      if (typeof value === "string" && value !== "") out[key] = value;
    }
    return out;
  };
}
