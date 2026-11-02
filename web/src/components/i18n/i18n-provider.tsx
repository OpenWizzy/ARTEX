import { use, useEffect } from "react";

import { useRouteContext } from "@tanstack/react-router";

import { I18nProvider as LinguiProvider } from "@lingui/react";

import { loadI18n } from "@/lib/i18n";

export default function I18nProvider({ children }: { children: React.ReactNode }) {
  const { locale } = useRouteContext({ from: "__root__" });
  // Suspends until the active locale's catalog chunk is in — the other locale
  // never loads. loadI18n returns a stable per-locale promise, as use() requires.
  const i18n = use(loadI18n(locale));

  // The prerendered shell is always the default locale; a page opened at
  // /zh/… corrects <html lang> here (hydration keeps the shell's attribute).
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  return (
    <LinguiProvider i18n={i18n} key={locale}>
      {children}
    </LinguiProvider>
  );
}
