import { createRouter as createTanStackRouter, parseSearchWith, stringifySearchWith } from "@tanstack/react-router";

import NotFound from "./components/common/not-found";
import { routeTree } from "./routeTree.gen";

export function getRouter() {
  const router = createTanStackRouter({
    routeTree,

    // A URL that matches no route renders at the deepest layout it got into
    // (`/zh/typo` at /$lang); those layouts carry no notFoundComponent of their
    // own, so without a default the router falls back to its bare
    // `<p>Not Found</p>`. Same page as the root's notFoundComponent.
    defaultNotFoundComponent: NotFound,

    // Plain query strings, every value a string — the URLs the Next.js build
    // used and the ones the backend puts in notifications
    // (server/notifier.go: /function/findings/detail?id=123). TanStack's
    // default JSON encoding would read `id=123` as a number and write the
    // string "123" back as `id=%22123%22`.
    parseSearch: parseSearchWith((value) => value),
    stringifySearch: stringifySearchWith((value) => JSON.stringify(value)),

    scrollRestoration: true,
    defaultPreload: "intent",
    defaultPreloadStaleTime: 30_000,
  });

  return router;
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
