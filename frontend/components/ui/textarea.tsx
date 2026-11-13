import * as React from "react"
import { cn } from "cn"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-16 w-full rounded-md border border-input border-b-stroke-accessible bg-card px-3 py-2 text-base transition-[border-color,box-shadow] outline-none placeholder:text-muted-foreground focus-visible:border-b-primary focus-visible:shadow-[inset_0_-1px_0_var(--primary)] disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive md:text-sm dark:disabled:bg-input/80",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
