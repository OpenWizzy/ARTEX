import { Trans, useLingui } from "@lingui/react/macro";
import { siX } from "simple-icons";

import { SimpleIcon } from "@/components/simple-icon";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function SidebarSupportCard() {
  const { t } = useLingui();
  return (
    <Card size="sm" className="overflow-hidden shadow-none group-data-[collapsible=icon]:hidden">
      <CardHeader className="min-w-0 px-4">
        <CardTitle className="truncate text-sm">
          <Trans>Looking for something more?</Trans>
        </CardTitle>
        <CardDescription className="line-clamp-2">
          <Trans>
            Open an issue or do reach out to me on&nbsp;
            <a
              href="https://x.com/arhamkhnz"
              target="_blank"
              rel="noreferrer"
              aria-label={t`Reach out on X`}
              className="inline-flex items-center text-foreground"
            >
              <SimpleIcon icon={siX} aria-hidden className="size-3 fill-current" />
            </a>
            .
          </Trans>
        </CardDescription>
      </CardHeader>
    </Card>
  );
}
