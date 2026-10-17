import * as React from "react"
import Link from "next/link"
import type { VariantProps } from "class-variance-authority"

import { Button, buttonVariants } from "@/components/ui/button"

type ButtonLinkProps = Omit<React.ComponentProps<typeof Link>, "className"> &
  VariantProps<typeof buttonVariants> & { className?: string }

/** A Next `<Link>` styled as a shadcn `<Button>` (keeps prefetch + top-loader). */
export function ButtonLink({ variant, size, className, children, ...linkProps }: ButtonLinkProps) {
  return (
    <Button variant={variant} size={size} className={className} nativeButton={false} render={<Link {...linkProps} />}>
      {children}
    </Button>
  )
}
