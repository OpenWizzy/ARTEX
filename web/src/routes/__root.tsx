import type { ReactNode } from "react";

import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/react-router";

import { useLingui } from "@lingui/react/macro";

import NotFound from "@/components/common/not-found";
import I18nProvider from "@/components/i18n/i18n-provider";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { defaultLocale, getLocaleFromPathname } from "@/lib/i18n";
import { PREFERENCE_DEFAULTS } from "@/lib/preferences/preferences-config";
import { ThemeBootScript } from "@/scripts/theme-boot";
import { PreferencesStoreProvider } from "@/stores/preferences/preferences-provider";
import appCss from "@/styles.css?url";

export const Route = createRootRoute({
  head: () => ({
    meta: [{ charSet: "utf-8" }, { name: "viewport", content: "width=device-width, initial-scale=1" }],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.ico", sizes: "any" },
      { rel: "icon", href: "/icon.png", type: "image/png" },
    ],
  }),
  // The locale comes from the URL alone: /en/… is English, bare paths are the
  // default locale. `context`, not beforeLoad, on purpose: in SPA mode the
  // shell is prerendered once at "/", and hydration reuses the shell's
  // beforeLoad result as-is, while `context` is recomputed in the browser from
  // the real URL.
  context: ({ location }) => ({
    locale: getLocaleFromPathname(location.pathname) ?? defaultLocale,
  }),
  shellComponent: RootDocument,
  component: RootComponent,
  notFoundComponent: NotFound,
});

// React 19 hoists <title> and <meta> into <head>; rendered here, inside the
// I18nProvider, they follow the page's language.
function DocumentMeta() {
  const { t } = useLingui();
  return (
    <>
      <title>{t`ARTEX — Autonomous Penetration Testing Console`}</title>
      <meta name="description" content={t`Console for the LLM-driven autonomous penetration testing system`} />
    </>
  );
}

function RootComponent() {
  const { theme_mode, theme_preset, content_layout, navbar_style, font } = PREFERENCE_DEFAULTS;
  return (
    <I18nProvider>
      <DocumentMeta />
      <TooltipProvider>
        <PreferencesStoreProvider
          themeMode={theme_mode}
          themePreset={theme_preset}
          contentLayout={content_layout}
          navbarStyle={navbar_style}
          font={font}
        >
          <Outlet />
          <Toaster />
        </PreferencesStoreProvider>
      </TooltipProvider>
    </I18nProvider>
  );
}

function RootDocument({ children }: { children: ReactNode }) {
  const { locale } = Route.useRouteContext();
  const { theme_mode, theme_preset, content_layout, navbar_style, sidebar_variant, sidebar_collapsible, font } =
    PREFERENCE_DEFAULTS;
  return (
    <html
      lang={locale}
      data-theme-mode={theme_mode}
      data-theme-preset={theme_preset}
      data-content-layout={content_layout}
      data-navbar-style={navbar_style}
      data-sidebar-variant={sidebar_variant}
      data-sidebar-collapsible={sidebar_collapsible}
      data-font={font}
      suppressHydrationWarning
    >
      <head>
        {/* Applies theme and layout preferences before first paint to avoid flicker. */}
        <ThemeBootScript />
        <HeadContent />
      </head>
      <body className="min-h-screen antialiased">
        {children}
        <Scripts />
      </body>
    </html>
  );
}
