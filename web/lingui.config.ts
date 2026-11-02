import type { LinguiConfig } from "@lingui/conf";
import { formatter } from "@lingui/format-po";

// The locale list is mirrored in src/lib/i18n.ts (`locales`), which the app
// reads at runtime. Source strings in code are English; zh is the default
// locale and is served at bare paths.
const config: LinguiConfig = {
  locales: ["zh", "en"],
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
