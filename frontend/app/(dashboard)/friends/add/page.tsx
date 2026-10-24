"use client"

import * as React from "react"
import Image from "next/image"
import { useSearchParams } from "next/navigation"
import {
  AlertCircleIcon,
  Cancel01Icon,
  Clock01Icon,
  InformationCircleIcon,
  QrCodeIcon,
  Search01Icon,
  SentIcon,
  UserCheck01Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { toast } from "sonner"

import { AppHeader } from "@/components/layout/app-header"
import { PageContainer } from "@/components/layout/app-shell"
import { useSession } from "@/components/providers/session-provider"
import { EmptyState } from "@/components/shared/empty-state"
import { QrScannerDialog } from "@/components/shared/qr-scanner-dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/components/ui/input-group"
import { Spinner } from "@/components/ui/spinner"
import { useAcceptFriendRequest, useSendFriendRequest } from "@/hooks/mutations"
import { useUserSearch } from "@/hooks/queries"
import { getErrorMessage } from "@/lib/errors"
import { extractJoySplitId } from "@/lib/joysplit-id"
import type { UserSearchResult } from "@/services/friends"

type StatusOverride = Pick<UserSearchResult, "status" | "message">

export default function AddFriendPage() {
  return (
    <React.Suspense fallback={<AppHeader title="Add Friend" showBack />}>
      <AddFriendContent />
    </React.Suspense>
  )
}

function AddFriendContent() {
  const { user } = useSession()
  // Opened from a scanned QR / shared link (?id=JOY-…): look them up straight away
  const linkedId = extractJoySplitId(useSearchParams().get("id")) ?? ""
  const [scanning, setScanning] = React.useState(false)
  const sendRequest = useSendFriendRequest()
  const acceptRequest = useAcceptFriendRequest()

  const [searchId, setSearchId] = React.useState(linkedId)
  const [submittedId, setSubmittedId] = React.useState(linkedId)
  const search = useUserSearch(submittedId)

  // The query key also tracks friends / requests counts, so keep showing the last
  // result for this ID while it re-resolves (instead of flashing empty).
  const [lastResult, setLastResult] = React.useState<{ id: string; data: UserSearchResult } | null>(null)
  if (search.data && (lastResult?.id !== submittedId || lastResult.data !== search.data)) {
    setLastResult({ id: submittedId, data: search.data })
  }
  // Local status after acting on the result (mirrors the original optimistic update).
  const [override, setOverride] = React.useState<{ id: string; value: StatusOverride } | null>(null)

  const baseResult: UserSearchResult | null = !submittedId
    ? null
    : search.isError
      ? { found: false, message: getErrorMessage(search.error, "Error searching for user.") }
      : (search.data ?? (lastResult?.id === submittedId ? lastResult.data : null))
  const searchResult =
    baseResult && override?.id === submittedId ? { ...baseResult, ...override.value } : baseResult

  const handlePerformSearch = (queryToSearch: string) => {
    const clean = queryToSearch.trim().toUpperCase()
    setOverride(null)
    if (!clean) {
      setSubmittedId("")
      return
    }
    if (clean === submittedId) void search.refetch()
    else setSubmittedId(clean)
  }

  const resetSearch = () => {
    setSearchId("")
    setSubmittedId("")
    setOverride(null)
  }

  const handleSendRequest = () => {
    const splitzyId = searchResult?.user?.splitzyId
    if (!splitzyId) return
    const id = submittedId
    sendRequest.mutate(splitzyId, {
      onSuccess: () => setOverride({ id, value: { status: "REQUEST_SENT", message: "Friend request sent" } }),
    })
  }

  const handleAcceptIncoming = () => {
    const requestId = searchResult?.requestId
    if (!requestId) return
    const id = submittedId
    const name = searchResult?.user?.displayName
    acceptRequest.mutate(requestId, {
      onSuccess: () => {
        toast.success(`You and ${name} are now friends!`)
        setOverride({ id, value: { status: "FRIENDS", message: "You are now friends" } })
      },
    })
  }

  return (
    <>
      <AppHeader title="Add Friend" showBack />

      <PageContainer className="max-w-md">
        {/* Search input */}
        <form
          onSubmit={(e) => {
            e.preventDefault()
            handlePerformSearch(searchId)
          }}
          className="flex gap-2"
        >
          <InputGroup className="h-10 min-w-0 flex-1 bg-card">
            <InputGroupAddon>
              <HugeiconsIcon icon={Search01Icon} />
            </InputGroupAddon>
            <InputGroupInput
              value={searchId}
              onChange={(e) => setSearchId(e.target.value)}
              placeholder="JoySplit ID, e.g. JOY-GXU8AD"
              className="font-mono uppercase placeholder:normal-case"
            />
            {searchId && (
              <InputGroupAddon align="inline-end">
                <InputGroupButton size="icon-xs" aria-label="Clear search" onClick={resetSearch}>
                  <HugeiconsIcon icon={Cancel01Icon} />
                </InputGroupButton>
              </InputGroupAddon>
            )}
          </InputGroup>

          <Button type="submit" size="lg" className="h-10 px-4" disabled={!searchId.trim() || search.isLoading}>
            {search.isLoading && <Spinner />}
            Search
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Scan a QR code"
            title="Scan a QR code"
            onClick={() => setScanning(true)}
          >
            <HugeiconsIcon icon={QrCodeIcon} />
          </Button>
        </form>
        <QrScannerDialog open={scanning} onOpenChange={setScanning} />

        {searchResult &&
          (searchResult.found && searchResult.user ? (
            /* User profile preview */
            <Card className="animate-in duration-200 fade-in">
              <CardContent className="flex flex-col items-center text-center">
                <div className="relative mb-3 size-20 overflow-hidden rounded-full border">
                  <Image
                    src={searchResult.user.photoURL || "/assets/avatar_boy.jpg"}
                    alt={searchResult.user.displayName || "User"}
                    fill
                    sizes="80px"
                    className="object-cover"
                  />
                </div>

                <h3 className="text-lg font-semibold">{searchResult.user.displayName}</h3>
                <div className="mt-0.5 font-mono text-xs text-muted-foreground">
                  {searchResult.user.splitzyId}
                </div>

                {/* Relationship status */}
                <div className="mt-5 mb-1 w-full">
                  {searchResult.status === "SELF" && (
                    <p className="text-xs text-muted-foreground">This is your own JoySplit ID</p>
                  )}

                  {searchResult.status === "FRIENDS" && (
                    <p className="flex items-center justify-center gap-1.5 text-sm font-medium text-success">
                      <HugeiconsIcon icon={UserCheck01Icon} className="size-4" />
                      Already friends
                    </p>
                  )}

                  {searchResult.status === "REQUEST_SENT" && (
                    <p className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground">
                      <HugeiconsIcon icon={Clock01Icon} className="size-4 text-warning" />
                      Request sent, waiting for a response
                    </p>
                  )}

                  {searchResult.status === "REQUEST_RECEIVED" && (
                    <div className="flex flex-col items-center gap-3">
                      <p className="text-sm text-muted-foreground">This user sent you a friend request.</p>
                      <Button
                        className="w-full"
                        disabled={acceptRequest.isPending}
                        onClick={handleAcceptIncoming}
                      >
                        {acceptRequest.isPending && <Spinner />}
                        Accept Friend Request
                      </Button>
                    </div>
                  )}

                  {searchResult.status === "CAN_ADD" && (
                    <Button size="lg" className="h-10 w-full" disabled={sendRequest.isPending} onClick={handleSendRequest}>
                      {sendRequest.isPending ? <Spinner /> : <HugeiconsIcon icon={SentIcon} data-icon="inline-start" />}
                      Send Friend Request
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            /* User not found */
            <Card>
              <CardContent className="flex flex-col items-center text-center">
                <span className="mb-3 flex size-10 items-center justify-center rounded-md border text-warning">
                  <HugeiconsIcon icon={AlertCircleIcon} className="size-5" />
                </span>
                <h4 className="text-sm font-semibold">User not found</h4>
                <p className="mx-auto mt-1 max-w-xs text-xs text-muted-foreground">
                  {searchResult.message || "Please check the JoySplit ID and try again."}
                </p>
              </CardContent>
            </Card>
          ))}

        {/* Empty state: find your friends guidance */}
        {!searchResult && (
          <div className="flex flex-col items-center gap-6">
            <EmptyState
              className="py-4"
              imageSrc="/assets/find_friends.jpg"
              title="Find your friends"
              description={
                <>
                  Enter a friend&apos;s JoySplit ID (e.g. {user?.splitzyId || "JOY-XXXX"}) to find their profile and
                  connect.
                </>
              }
            />

            <Alert>
              <HugeiconsIcon icon={InformationCircleIcon} className="text-muted-foreground" />
              <AlertDescription className="text-xs">
                Your JoySplit ID is <strong className="font-mono font-medium text-foreground">{user?.splitzyId}</strong>.
                Share it with friends so they can add you.
              </AlertDescription>
            </Alert>
          </div>
        )}
      </PageContainer>
    </>
  )
}
