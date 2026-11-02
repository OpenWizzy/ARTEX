import type { LinguiConfig } from "@lingui/conf";
import { formatter } from "@lingui/format-po";

// The locale list is mirrored in src/lib/i18n.ts (`locales`), which the app
// reads at runtime. Source strings in code are English, and English is the
// default locale, served at bare paths; Chinese lives under /zh/….
const config: LinguiConfig = {
  locales: ["en", "zh"],
  sourceLocale: "en",
  compileNamespace: "es",
  format: formatter({ lineNumbers: false }),
  catalogs: [
    {
      path: "<rootDir>/src/locales/{locale}",
      include: ["src"],
    },
  ],
};

export default config;
