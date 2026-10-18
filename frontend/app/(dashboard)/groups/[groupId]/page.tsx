"use client"

import * as React from "react"
import { useParams } from "next/navigation"
import { useRouter } from "nextjs-toploader/app"
import {
  AddCircleIcon,
  Alert02Icon,
  ChartIncreaseIcon,
  Delete02Icon,
  Logout01Icon,
  PencilEdit02Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { AppHeader } from "@/components/layout/app-header"
import { PageContainer } from "@/components/layout/app-shell"
import { useSession } from "@/components/providers/session-provider"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { GroupIcon } from "@/components/shared/group-icon"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useDeleteGroup, useLeaveGroup } from "@/hooks/mutations"
import { useExpenses, useGroup, useGroupExpenses } from "@/hooks/queries"
import { canDeleteGroup, canUserLeaveGroup } from "@/lib/money"
import { GroupInviteCard } from "../../_components/group-invite-card"
import { EditGroupDialog } from "./_components/edit-group-dialog"
import { GroupActionsMenu } from "./_components/group-actions-menu"
import { GroupExpenseList } from "./_components/group-expense-list"
import { GroupError, GroupLoading, GroupNotFound } from "./_components/group-state"
import { InviteDialog } from "./_components/invite-dialog"
import { MembersTab } from "./_components/members-tab"
import { OverviewTab } from "./_components/overview-tab"

type Tab = "overview" | "expenses" | "members"
type OpenDialog = "edit" | "leave" | "delete" | "invite" | null

const TABS: Tab[] = ["overview", "expenses", "members"]

export default function GroupDashboardPage() {
  const params = useParams<{ groupId: string }>()
  const groupId = params.groupId
  const router = useRouter()
  const { user } = useSession()

  const groupQuery = useGroup(groupId)
  const { data: groupExpenses } = useGroupExpenses(groupId)
  const { data: expenses } = useExpenses()

  const [activeTab, setActiveTab] = React.useState<Tab>("overview")
  const [dialog, setDialog] = React.useState<OpenDialog>(null)
  const closeDialog = (open: boolean) => !open && setDialog(null)

  const leaveGroup = useLeaveGroup({ successMessage: "You have left the group" })
  const deleteGroup = useDeleteGroup({ successMessage: "Group deleted successfully" })

  const group = groupQuery.data

  if (groupQuery.isPending) return <GroupLoading />
  if (groupQuery.isError && !group) return <GroupError error={groupQuery.error} onRetry={groupQuery.refetch} />
  if (!group) return <GroupNotFound />

  // Invited but not joined yet: show the invitation instead of the group dashboard
  if (user && !group.members.includes(user.uid) && group.invitedMembers?.includes(user.uid)) {
    return (
      <>
        <AppHeader title={group.name} showBack />
        <PageContainer className="max-w-xl">
          <GroupInviteCard group={group} className="rounded-3xl p-4" />
        </PageContainer>
      </>
    )
  }

  const isCreator = user?.uid === group.createdBy
  const leaveCheck = user ? canUserLeaveGroup(user.uid, group, expenses) : { allowed: false, reason: "" }
  const deleteCheck = user ? canDeleteGroup(user.uid, group, expenses) : { allowed: false, reason: "" }
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
          <div className="flex min-w-0 items-center gap-3">
            <GroupIcon src={group.icon} alt={group.name} size="sm" className="size-10 rounded-full" />
            <div className="min-w-0">
              <div className="flex min-w-0 items-center gap-0.5">
                <h1 className="truncate text-lg font-bold tracking-tight">{group.name}</h1>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="shrink-0 text-muted-foreground"
                  aria-label="Edit group"
                  title="Edit group"
                  onClick={() => setDialog("edit")}
                >
                  <HugeiconsIcon icon={PencilEdit02Icon} className="size-4" />
                </Button>
              </div>
              <p className="-mt-1 truncate text-xs text-muted-foreground">
                {group.description || `${group.members.length} members`}
              </p>
            </div>
          </div>
        }
        rightAction={
          <GroupActionsMenu
            isCreator={isCreator}
            onViewMembers={() => router.push(`/groups/${group.id}/members`)}
            onInvite={() => setDialog("invite")}
            onEdit={() => setDialog("edit")}
            onLeave={() => setDialog("leave")}
            onDelete={() => setDialog("delete")}
          />
        }
      />

      <PageContainer className="max-w-4xl pb-24 md:pb-6">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as Tab)} className="gap-6">
          <TabsList className="w-full">
            {TABS.map((tab) => (
              <TabsTrigger key={tab} value={tab} className="font-bold capitalize">
                {tab}
                {tab === "members" && (
                  <Badge variant="secondary" className="ml-1">
                    {group.members.length}
                  </Badge>
                )}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="overview">
            <OverviewTab
              group={group}
              expenses={groupExpenses}
              userId={user?.uid}
              onViewAll={() => setActiveTab("expenses")}
            />
          </TabsContent>

          <TabsContent value="expenses">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-bold">All Expenses</CardTitle>
              </CardHeader>
              <CardContent>
                <GroupExpenseList expenses={groupExpenses} emptyText="No expenses added yet." />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="members">
            <MembersTab group={group} expenses={groupExpenses} onInvite={() => setDialog("invite")} />
          </TabsContent>
        </Tabs>

        {/* Action bar: pinned above the bottom nav on mobile, inline on desktop. */}
        <div className="fixed inset-x-0 bottom-16 z-30 border-t bg-background/95 p-4 backdrop-blur-md md:static md:border-0 md:bg-transparent md:p-0">
          <div className="mx-auto flex max-w-md items-center gap-3">
            <Button size="lg" variant="outline" className="h-11 flex-1" onClick={() => router.push(addExpenseHref)}>
              <HugeiconsIcon icon={AddCircleIcon} data-icon="inline-start" />
              Add Expense
            </Button>
            <Button size="lg" className="h-11 flex-1" onClick={() => router.push(addExpenseHref)}>
              Split Bill
              <HugeiconsIcon icon={ChartIncreaseIcon} data-icon="inline-end" />
            </Button>
          </div>
        </div>
      </PageContainer>

      <EditGroupDialog group={group} open={dialog === "edit"} onOpenChange={closeDialog} />

      <ConfirmDialog
        open={dialog === "leave"}
        onOpenChange={closeDialog}
        title="Leave Group"
        icon={Logout01Icon}
        destructive
        confirmLabel="Leave Group"
        isPending={leaveGroup.isPending}
        confirmDisabled={!leaveCheck.allowed}
        description={
          leaveCheck.allowed ? (
            <>
              Are you sure you want to leave <strong>{group.name}</strong>? All historical expenses and your records in
              them will be preserved.
            </>
          ) : undefined
        }
        onConfirm={() => leaveGroup.mutate(group.id, { onSuccess: goToGroups })}
      >
        {!leaveCheck.allowed && <BlockedNotice title="Cannot Leave Group" reason={leaveCheck.reason} />}
      </ConfirmDialog>

      <ConfirmDialog
        open={dialog === "delete"}
        onOpenChange={closeDialog}
        title="Delete Group"
        icon={Delete02Icon}
        destructive
        confirmLabel="Delete Group"
        isPending={deleteGroup.isPending}
        confirmDisabled={!deleteCheck.allowed}
        description={
          deleteCheck.allowed ? (
            <>
              Are you sure you want to delete and archive <strong>{group.name}</strong>? All balances are fully
              settled.
            </>
          ) : undefined
        }
        onConfirm={() => deleteGroup.mutate(group.id, { onSuccess: goToGroups })}
      >
        {!deleteCheck.allowed && <BlockedNotice title="Cannot Delete Group" reason={deleteCheck.reason} />}
      </ConfirmDialog>

      <InviteDialog group={group} open={dialog === "invite"} onOpenChange={closeDialog} />
    </>
  )
}

/** Explains why leave/delete is currently blocked (unsettled balances etc.). */
function BlockedNotice({ title, reason }: { title: string; reason?: string }) {
  return (
    <Alert className="border-warning/30 bg-warning/10 text-warning">
      <HugeiconsIcon icon={Alert02Icon} />
      <AlertTitle className="font-bold">{title}</AlertTitle>
      <AlertDescription className="leading-relaxed text-foreground">{reason}</AlertDescription>
    </Alert>
  )
}
