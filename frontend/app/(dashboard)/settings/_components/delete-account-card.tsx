"use client"

import * as React from "react"
import { Alert02Icon, Delete02Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { useSession } from "@/components/providers/session-provider"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { useDeleteAccount } from "@/hooks/mutations"
import { useExpenseHistory } from "@/hooks/queries"
import { canDeleteAccount } from "@/services/account"

const CONFIRM_WORD = "DELETE"

/** Danger zone: permanent account deletion with balance guard and re-authentication. */
export function DeleteAccountCard() {
  const { user, fbUser } = useSession()
  const { data: expenses } = useExpenseHistory()
  const deleteAccount = useDeleteAccount()

  const [open, setOpen] = React.useState(false)
  const [password, setPassword] = React.useState("")
  const [typed, setTyped] = React.useState("")

  const check = React.useMemo(
    () => (user ? canDeleteAccount(user.uid, expenses) : { allowed: false }),
    [user, expenses]
  )
  const usesPassword = !!fbUser?.providerData?.some((p) => p.providerId === "password")
  const ready = check.allowed && typed.trim().toUpperCase() === CONFIRM_WORD && (!usesPassword || password.length > 0)

  const close = (next: boolean) => {
    setOpen(next)
    if (!next) {
      setPassword("")
      setTyped("")
    }
  }

  return (
    <>
      <Card className="rounded-3xl border-destructive/30">
        <CardContent className="flex flex-col gap-3">
          <h3 className="text-xs font-bold tracking-wider text-destructive uppercase">Danger zone</h3>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-0.5">
              <p className="text-sm font-bold">Delete account</p>
              <p className="text-xs text-muted-foreground">
                Permanently removes your profile, personal expenses, friends and notifications.
              </p>
            </div>
            <Button variant="destructive" className="shrink-0" onClick={() => setOpen(true)}>
              <HugeiconsIcon icon={Delete02Icon} data-icon="inline-start" />
              Delete account
            </Button>
          </div>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={open}
        onOpenChange={close}
        destructive
        icon={check.allowed ? Delete02Icon : Alert02Icon}
        title={check.allowed ? "Delete your account?" : "Settle up first"}
        description={
          check.allowed
            ? "This can't be undone. Shared expenses stay in your friends' history as “Deleted user” — nothing they owe or are owed changes."
            : check.reason
        }
        confirmLabel="Delete forever"
        confirmDisabled={!ready}
        isPending={deleteAccount.isPending}
        onConfirm={() => deleteAccount.mutate({ password: usesPassword ? password : undefined })}
      >
        {check.allowed && (
          <div className="flex flex-col gap-3">
            {usesPassword ? (
              <Field>
                <FieldLabel htmlFor="delete-password">Password</FieldLabel>
                <Input
                  id="delete-password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </Field>
            ) : (
              <FieldDescription>You&apos;ll be asked to sign in with Google again to confirm.</FieldDescription>
            )}
            <Field>
              <FieldLabel htmlFor="delete-confirm">
                Type <strong>{CONFIRM_WORD}</strong> to confirm
              </FieldLabel>
              <Input
                id="delete-confirm"
                autoComplete="off"
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
              />
            </Field>
          </div>
        )}
      </ConfirmDialog>
    </>
  )
}
