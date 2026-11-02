import { useLingui } from "@lingui/react/macro"
import { cn } from "@/lib/utils"
import { Loader2Icon } from "lucide-react"

function Spinner({ className, ...props }: React.ComponentProps<"svg">) {
  const { t } = useLingui()
  return (
    <Loader2Icon data-slot="spinner" role="status" aria-label={t`Loading`} className={cn("size-4 animate-spin", className)} {...props} />
  )
}

export { Spinner }
