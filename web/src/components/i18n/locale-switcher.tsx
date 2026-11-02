import { useRouteContext } from "@tanstack/react-router";

import { useLingui } from "@lingui/react/macro";
import { Check, Languages } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { addLocaleToPathname, type Locale, locales, stripLocaleFromPathname } from "@/lib/i18n";

// A full page load, not a client navigation: the page is one language for its
// whole life (lib/i18n.ts currentLocale), and only the new locale's catalog loads.
function switchLocale(current: Locale, next: Locale) {
  if (next === current) return;
  const bare = stripLocaleFromPathname(window.location.pathname);
  window.location.assign(addLocaleToPathname(bare, next) + window.location.search + window.location.hash);
}

/** One menu item per language, the current one checked. */
export function LocaleSwitcher({ variant = "default" }: { variant?: "default" | "outline" }) {
  const { locale } = useRouteContext({ from: "__root__" });
  const { t } = useLingui();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="icon" variant={variant} aria-label={t`Choose language`}>
          <Languages />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-36">
        {(Object.entries(locales) as [Locale, string][]).map(([code, name]) => (
          <DropdownMenuItem key={code} lang={code} onClick={() => switchLocale(locale, code)}>
            <span className="flex-1">{name}</span>
            {code === locale && <Check className="size-4" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
