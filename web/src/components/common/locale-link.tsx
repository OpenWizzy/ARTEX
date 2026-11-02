import { type ComponentProps, useCallback } from "react";

import { Link, useNavigate, useParams, useRouteContext } from "@tanstack/react-router";

import { addLocaleToPathname, defaultLocale, isValidLocale, type Locale } from "@/lib/i18n";

type LinkProps = Omit<ComponentProps<typeof Link>, "params" | "search"> & {
  params?: Record<string, string>;
  search?: Record<string, unknown>;
};

function useActiveLocale(): Locale | undefined {
  const routeParams = useParams({ strict: false }) as { lang?: string };
  const { locale: rootLocale } = useRouteContext({ from: "__root__" });
  const candidate = routeParams.lang ?? rootLocale;
  return candidate && isValidLocale(candidate) ? candidate : undefined;
}

/**
 * Link wrapper that auto-prefixes /$lang when the active locale is non-default.
 * Uses the URL's lang param first, then the root locale context.
 */
export function LocaleLink({ to, params, search, ...rest }: LinkProps) {
  const lang = useActiveLocale();

  // biome-ignore lint/suspicious/noExplicitAny: TanStack Router's Link params/search types are too strict for a generic wrapper
  const linkParams = params as any;
  // biome-ignore lint/suspicious/noExplicitAny: see above
  const linkSearch = search as any;

  const prefix = lang !== undefined && lang !== defaultLocale && typeof to === "string" && to.startsWith("/");

  if (prefix) {
    const prefixedTo = (to === "/" ? "/$lang" : `/$lang${to}`) as typeof to;
    return <Link {...rest} to={prefixedTo} params={{ ...(linkParams ?? {}), lang }} search={linkSearch} />;
  }

  return <Link {...rest} to={to} params={linkParams} search={linkSearch} />;
}

/**
 * Drop-in replacement for TanStack Router's useNavigate() that prefixes a
 * string `to` with the active locale when it differs from the default.
 * Mirrors the logic used by LocaleLink.
 */
export function useLocaleNavigate() {
  const navigate = useNavigate();
  const lang = useActiveLocale();

  return useCallback(
    (opts: { to: string; search?: Record<string, unknown>; replace?: boolean }) => {
      let to = opts.to;
      if (lang !== undefined && lang !== defaultLocale && to.startsWith("/")) {
        to = addLocaleToPathname(to, lang);
      }
      // biome-ignore lint/suspicious/noExplicitAny: TanStack Router's navigate `to`/`search` types are too strict for a runtime-built path
      return navigate({ to: to as any, search: opts.search as any, replace: opts.replace });
    },
    [navigate, lang],
  );
}
