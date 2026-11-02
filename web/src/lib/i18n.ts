import { type I18n, type MessageDescriptor, type Messages, setupI18n } from "@lingui/core";

export const locales = {
  zh: "简体中文",
  en: "English",
} as const;

export type Locale = keyof typeof locales;

/** Served at bare paths. A request for `/<defaultLocale>/…` redirects to the bare path. */
export const defaultLocale: Locale = "zh";

// Dynamic per-locale loading: each compiled catalog becomes its own Vite chunk
// and only the ACTIVE locale's chunk ever reaches the browser.
const catalogImports: Record<Locale, () => Promise<{ messages: Messages }>> = {
  zh: () => import("../locales/zh.mjs"),
  en: () => import("../locales/en.mjs"),
};

export function isValidLocale(lang: string): lang is Locale {
  return Object.hasOwn(locales, lang);
}

export function getLocaleFromPathname(pathname: string): Locale | null {
  if (!pathname || pathname === "/") return null;
  const maybeLocale = pathname.split("/")[1];
  return maybeLocale && isValidLocale(maybeLocale) ? maybeLocale : null;
}

export function stripLocaleFromPathname(pathname: string): string {
  const locale = getLocaleFromPathname(pathname);
  if (!locale) return pathname || "/";
  const pathWithoutLocale = pathname.slice(locale.length + 1);
  return pathWithoutLocale || "/";
}

export function addLocaleToPathname(pathname: string, locale: Locale): string {
  const normalizedPathname = pathname.startsWith("/") ? pathname : `/${pathname}`;
  if (locale === defaultLocale) return normalizedPathname;
  return normalizedPathname === "/" ? `/${locale}` : `/${locale}${normalizedPathname}`;
}

/**
 * The page's locale, read from the URL. A page is one language for its whole
 * life — switching language is a full page load (LocaleSwitcher) — so code
 * outside React (api.ts redirects, error messages) can read it at any time.
 */
export function currentLocale(): Locale {
  if (typeof window === "undefined") return defaultLocale;
  return getLocaleFromPathname(window.location.pathname) ?? defaultLocale;
}

/** BCP 47 tag for Intl / toLocaleString in the current page's language. */
export function intlLocale(): string {
  return currentLocale() === "zh" ? "zh-CN" : "en-US";
}

/** An in-app absolute path in the current page's language, for `window.location` jumps. */
export function localizePath(path: string): string {
  return addLocaleToPathname(path, currentLocale());
}

// One I18n instance per locale, created after that locale's catalog chunk
// loads. Each is permanently locked to its locale (nobody ever calls
// activate() on it). The promise identity is stable per locale — React's
// use() requires that.
const i18nByLocale = new Map<Locale, Promise<I18n>>();
const loadedI18n = new Map<Locale, I18n>();

export function loadI18n(locale: Locale): Promise<I18n> {
  let instance = i18nByLocale.get(locale);
  if (!instance) {
    const created: Promise<I18n> = catalogImports[locale]().then((mod) => {
      const i18n = setupI18n({ locale, messages: { [locale]: mod.messages } });
      loadedI18n.set(locale, i18n);
      return i18n;
    });
    // A transient chunk-load failure must not poison the locale until reload.
    // Evict on rejection — identity-guarded so a newer retry is never clobbered.
    created.catch(() => {
      if (i18nByLocale.get(locale) === created) {
        i18nByLocale.delete(locale);
      }
    });
    i18nByLocale.set(locale, created);
    instance = created;
  }
  return instance;
}

/**
 * Translates a `msg` descriptor in the current page's language, for code that
 * runs outside React (api.ts errors and the like). Components use useLingui().
 * The catalog is loaded before any page renders (I18nProvider suspends on it);
 * should it somehow not be, the English source text is returned.
 */
export function tr(descriptor: MessageDescriptor): string {
  const i18n = loadedI18n.get(currentLocale());
  if (i18n) return i18n._(descriptor);
  return setupI18n({ locale: "en", messages: { en: {} } })._(descriptor);
}
