"use client"

import * as React from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { useRouter } from "nextjs-toploader/app"
import {
  AddCircleIcon,
  BubbleChatIcon,
  ChartIncreaseIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { AppHeader } from "@/components/layout/app-header"
import { PageContainer } from "@/components/layout/app-shell"
import { useSession } from "@/components/providers/session-provider"
import { GroupIcon } from "@/components/shared/group-icon"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useGroup, useGroupExpenses } from "@/hooks/queries"
import { groupChatId } from "@/lib/chat"
import { canAddGroupMembers, canEditGroupInfo } from "@/lib/groups"
import { GroupInviteCard } from "../../_components/group-invite-card"
import { EditGroupSheet } from "./_components/edit-group-sheet"
import { GroupActionsMenu } from "./_components/group-actions-menu"
import { GroupExpenseList } from "./_components/group-expense-list"
import {
  GroupError,
  GroupLoading,
  GroupNotFound,
} from "./_components/group-state"
import { InviteDialog } from "./_components/invite-dialog"
import {
  DeleteGroupDialog,
  LeaveGroupDialog,
} from "./_components/leave-delete-dialogs"
import { MembersTab } from "./_components/members-tab"
import { OverviewTab } from "./_components/overview-tab"
import { useQueryTab } from "@/hooks/use-query-tab"
import { useSwipeTabs } from "@/hooks/use-swipe-tabs"
import { GroupGames } from "@/components/live/group-games"
import {
  SwipeTabIndicator,
  SwipeTabPanels,
} from "@/components/shared/swipe-tabs"
import { cn } from "@/lib/utils"

type Tab = "overview" | "expenses" | "members" | "games"
type OpenDialog = "edit" | "leave" | "delete" | "invite" | null

const TABS: Tab[] = ["overview", "expenses", "members", "games"]

function GroupDashboardContent() {
  const params = useParams<{ groupId: string }>()
  const groupId = params.groupId
  const router = useRouter()
  const { user } = useSession()

  const groupQuery = useGroup(groupId)
  const { data: groupExpenses } = useGroupExpenses(groupId)

  const [activeTab, setActiveTab] = useQueryTab<Tab>({
    defaultValue: "overview",
    validValues: TABS,
  })
  // Swipe left / right anywhere below the header to move between tabs
  const { surface: swipeSurface, ...swipe } = useSwipeTabs(
    TABS,
    activeTab,
    setActiveTab
  )
  const [dialog, setDialog] = React.useState<OpenDialog>(null)
  const closeDialog = (open: boolean) => !open && setDialog(null)

  const group = groupQuery.data

  if (groupQuery.isPending) return <GroupLoading />
  if (groupQuery.isError && !group)
    return <GroupError error={groupQuery.error} onRetry={groupQuery.refetch} />
  if (!group) return <GroupNotFound />

  // Invited but not joined yet: show the invitation instead of the group dashboard
  if (
    user &&
    !group.members.includes(user.uid) &&
    group.invitedMembers?.includes(user.uid)
  ) {
    return (
      <>
        <AppHeader title={group.name} showBack />
        <PageContainer className="max-w-xl">
          <GroupInviteCard group={group} className="rounded-lg p-4" />
        </PageContainer>
      </>
    )
  }

  const isCreator = user?.uid === group.createdBy
  const canEdit = canEditGroupInfo(group, user?.uid)
  const canAdd = canAddGroupMembers(group, user?.uid)
  const infoHref = `/groups/${group.id}/info`
  const addExpenseHref = `/expenses/new?groupId=${group.id}`

  const goToGroups = () => {
    setDialog(null)
    router.push("/groups")
  }

  return (
    <>
      <AppHeader
        showBack
        titleContent={
          // Tap the name for group info, like WhatsApp
          <Link
            href={infoHref}
            aria-label={`${group.name}: group info`}
            className="-my-1 -ml-1 flex min-w-0 items-center gap-3 rounded-md py-1 pr-2 pl-1 transition-colors hover:bg-muted/60"
          >
            <GroupIcon
              src={group.icon}
              alt=""
              size="sm"
              className="size-9 rounded-md"
            />
            <div className="min-w-0">
              <h1 className="truncate text-base leading-tight font-semibold">
                {group.name}
              </h1>
              <p className="truncate text-xs text-muted-foreground">
                {group.description || `${group.members.length} members`}
              </p>
            </div>
          </Link>
        }
        rightAction={
          <div className="flex items-center">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Group chat"
              title="Group chat"
              nativeButton={false}
              render={<Link href={`/chat/${groupChatId(group.id)}`} />}
            >
              <HugeiconsIcon icon={BubbleChatIcon} className="size-5" />
            </Button>
            <GroupActionsMenu
              isCreator={isCreator}
              canEdit={canEdit}
              canAdd={canAdd}
              onViewInfo={() => router.push(infoHref)}
              onInvite={() => setDialog("invite")}
              onEdit={() => setDialog("edit")}
              onLeave={() => setDialog("leave")}
              onDelete={() => setDialog("delete")}
            />
          </div>
        }
      />

      {/* flex-1: the swipe surface reaches the bottom of the screen, even when a tab is short */}
      <PageContainer
        ref={swipeSurface}
        className="max-w-4xl flex-1 gap-4 pb-28 md:pb-6"
      >
        <div
          role="tablist"
          aria-label="Group sections"
          className="relative grid grid-cols-4 border-b"
        >
          {TABS.map((tab) => {
            const active = activeTab === tab
            return (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "flex items-center justify-center gap-1 pb-2.5 text-sm capitalize transition-colors",
                  active
                    ? "font-semibold text-foreground"
                    : "font-medium text-muted-foreground hover:text-foreground"
                )}
              >
                {tab}
                {tab === "members" && (
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {group.members.length}
                  </span>
                )}
              </button>
            )
          })}
          <SwipeTabIndicator swipe={swipe} className="bottom-[-1px]" />
        </div>

        {/* Edge to edge, so panels slide in from the screen edge; scroll-mt clears the sticky header */}
        <SwipeTabPanels
          swipe={swipe}
          className="-mx-4 scroll-mt-16 sm:-mx-6"
          panelClassName="px-4 sm:px-6"
        >
          <OverviewTab
            group={group}
            expenses={groupExpenses}
            userId={user?.uid}
            onViewAll={() => setActiveTab("expenses")}
          />
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold">
                All expenses
              </CardTitle>
            </CardHeader>
            <CardContent>
              <GroupExpenseList
                expenses={groupExpenses}
                emptyText="No expenses added yet."
              />
            </CardContent>
          </Card>
          <MembersTab
            group={group}
            expenses={groupExpenses}
            onInvite={() => setDialog("invite")}
          />
          {user ? <GroupGames group={group} uid={user.uid} /> : <div />}
        </SwipeTabPanels>

        {/* Action bar: at the very bottom of the screen on mobile, inline on desktop. */}
        <div className="pb-safe fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 px-4 pt-3 backdrop-blur-sm md:static md:border-0 md:bg-transparent md:p-0">
          <div className="mx-auto flex max-w-md items-center gap-3">
            <Button
              size="lg"
              variant="outline"
              className="h-11 flex-1"
              onClick={() => router.push(addExpenseHref)}
            >
              <HugeiconsIcon icon={AddCircleIcon} data-icon="inline-start" />
              Add Expense
            </Button>
            <Button
              size="lg"
              className="h-11 flex-1"
              onClick={() => router.push(addExpenseHref)}
            >
              Split Bill
              <HugeiconsIcon icon={ChartIncreaseIcon} data-icon="inline-end" />
            </Button>
          </div>
        </div>
      </PageContainer>

      {canEdit && (
        <EditGroupSheet
          group={group}
          open={dialog === "edit"}
          onOpenChange={closeDialog}
        />
      )}

      <LeaveGroupDialog
        group={group}
        open={dialog === "leave"}
        onOpenChange={closeDialog}
        onLeft={goToGroups}
      />

      {isCreator && (
        <DeleteGroupDialog
          group={group}
          open={dialog === "delete"}
          onOpenChange={closeDialog}
          onDeleted={goToGroups}
        />
      )}

      <InviteDialog
        group={group}
        open={dialog === "invite"}
        onOpenChange={closeDialog}
      />
    </>
  )
}

export default function GroupDashboardPage() {
  return (
    <React.Suspense fallback={<GroupLoading />}>
      <GroupDashboardContent />
    </React.Suspense>
  )
}
