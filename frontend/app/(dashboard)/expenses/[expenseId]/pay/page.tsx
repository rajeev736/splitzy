"use client"

import * as React from "react"
import { useParams } from "next/navigation"
import { useRouter } from "nextjs-toploader/app"
import { toast } from "sonner"
import { Spinner } from "@/components/ui/spinner"

export default function PayExpensePage() {
  const params = useParams<{ expenseId: string }>()
  const router = useRouter()

  React.useEffect(() => {
    toast.info("Payments are made person-to-person based on net balance, not per individual expense.")
    router.replace(`/expenses/${params.expenseId}`)
  }, [params.expenseId, router])

  return (
    <div className="flex h-[50vh] flex-col items-center justify-center gap-3">
      <Spinner className="size-6 text-primary" />
      <p className="text-xs text-muted-foreground">Redirecting to expense details...</p>
    </div>
  )
}
