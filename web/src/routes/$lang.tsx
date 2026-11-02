import { createFileRoute, notFound, Outlet, redirect } from "@tanstack/react-router";

import { defaultLocale, isValidLocale, stripLocaleFromPathname } from "@/lib/i18n";

export const Route = createFileRoute("/$lang")({
  beforeLoad: ({ params, location }) => {
    if (!isValidLocale(params.lang)) {
      throw notFound();
    }
    // The default locale lives at bare paths: /zh/… is a duplicate of …
    if (params.lang === defaultLocale) {
      const path = stripLocaleFromPathname(location.pathname);
      const hash = location.hash ? `#${location.hash}` : "";
      throw redirect({ href: `${path}${location.searchStr}${hash}`, replace: true });
    }
  },
  component: LangLayout,
});

function LangLayout() {
  return <Outlet />;
}
