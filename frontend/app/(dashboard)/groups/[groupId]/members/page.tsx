"use client"

import * as React from "react"
import { useParams } from "next/navigation"
import {
  Copy01Icon,
  Share08Icon,
  Tick02Icon,
  UserAdd01Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { AppHeader } from "@/components/layout/app-header"
import { PageContainer } from "@/components/layout/app-shell"
import { useSession } from "@/components/providers/session-provider"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group"
import { useInviteGroupMember } from "@/hooks/mutations"
import { useFriends, useGroup, useGroupExpenses } from "@/hooks/queries"
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard"
import {
  GroupError,
  GroupLoading,
  GroupNotFound,
} from "../_components/group-state"
import { InviteFriendsList } from "../_components/invite-friends-list"
import { canAddGroupMembers } from "@/lib/groups"
import { GroupMembersCard } from "../_components/group-members-card"

export default function GroupMembersPage() {
  const params = useParams<{ groupId: string }>()
  const groupId = params.groupId
  const { user } = useSession()
  const groupQuery = useGroup(groupId)
  const { data: expenses } = useGroupExpenses(groupId)
  const { data: friends } = useFriends()
  const invite = useInviteGroupMember()
  const { copied, copy } = useCopyToClipboard()
  const [isInviteOpen, setIsInviteOpen] = React.useState(false)

  const group = groupQuery.data

  if (groupQuery.isPending) return <GroupLoading title="Members" hero={false} />
  if (groupQuery.isError && !group)
    return (
      <GroupError
        title="Members"
        error={groupQuery.error}
        onRetry={groupQuery.refetch}
      />
    )
  if (!group) return <GroupNotFound title="Members" />

  const canAdd = canAddGroupMembers(group, user?.uid)
  const inviteLink = `https://joysplit.app/invite/${group.name.toLowerCase().replace(/\s+/g, "")}`

  const handleCopyLink = () =>
    copy(inviteLink, "Group invite link copied to clipboard!")

  const handleShareLink = () => {
    if (navigator.share) {
      navigator
        .share({
          title: `Join ${group.name} on JoySplit`,
          text: `Hey! Join our group "${group.name}" on JoySplit: ${inviteLink}`,
          url: inviteLink,
        })
        .catch(() => {})
    } else {
      handleCopyLink()
    }
  }

  return (
    <>
      <AppHeader
        title="Members"
        showBack
        rightAction={
          canAdd ? (
            <Button
              variant="secondary"
              size="icon"
              aria-label="Add Member"
              onClick={() => setIsInviteOpen(true)}
            >
              <HugeiconsIcon
                icon={UserAdd01Icon}
                className="size-5"
                strokeWidth={2.2}
              />
            </Button>
          ) : undefined
        }
      />

      <PageContainer className="max-w-xl">
        <GroupMembersCard
          group={group}
          expenses={expenses}
          onAdd={() => setIsInviteOpen(true)}
        />

        {canAdd && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold">
                Group invite link
              </CardTitle>
              <CardDescription className="text-xs">
                Share this link with your friends to let them join this group.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <InputGroup>
                <InputGroupInput
                  readOnly
                  value={inviteLink}
                  aria-label="Group invite link"
                  className="font-mono text-xs"
                />
                <InputGroupAddon align="inline-end">
                  <InputGroupButton
                    size="icon-xs"
                    aria-label="Copy Link"
                    title="Copy Link"
                    onClick={handleCopyLink}
                  >
                    <HugeiconsIcon
                      icon={copied ? Tick02Icon : Copy01Icon}
                      className={copied ? "text-success" : undefined}
                    />
                  </InputGroupButton>
                </InputGroupAddon>
              </InputGroup>

              <Button
                variant="outline"
                className="w-full"
                onClick={handleShareLink}
              >
                <HugeiconsIcon icon={Share08Icon} data-icon="inline-start" />
                Share Invite Link
              </Button>
            </CardContent>
          </Card>
        )}
      </PageContainer>

      <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Invite Friends</DialogTitle>
            <DialogDescription className="text-xs">
              Select an accepted friend to add to <strong>{group.name}</strong>:
            </DialogDescription>
          </DialogHeader>

          <InviteFriendsList
            group={group}
            friends={friends}
            className="max-h-60"
            pendingUid={invite.isPending ? invite.variables?.target : undefined}
            onInvite={(uid) =>
              invite.mutate({
                groupId: group.id,
                target: uid,
                option: "GROUP_ONLY",
              })
            }
          />

          <Button
            variant="secondary"
            className="w-full"
            onClick={() => setIsInviteOpen(false)}
          >
            Done
          </Button>
        </DialogContent>
      </Dialog>
    </>
  )
}
