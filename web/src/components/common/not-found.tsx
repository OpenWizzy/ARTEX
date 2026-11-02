import { Trans } from "@lingui/react/macro";

import { LocaleLink } from "@/components/common/locale-link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex h-dvh flex-col items-center justify-center space-y-2 text-center">
      <h1 className="font-semibold text-2xl">
        <Trans>Page not found.</Trans>
      </h1>
      <p className="text-muted-foreground">
        <Trans>The page you are looking for could not be found.</Trans>
      </p>
      <LocaleLink replace to="/function/tasks">
        <Button variant="outline">
          <Trans>Go back home</Trans>
        </Button>
      </LocaleLink>
    </div>
  );
}
