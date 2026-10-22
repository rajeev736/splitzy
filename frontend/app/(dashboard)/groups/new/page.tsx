"use client"

import * as React from "react"
import { useRouter } from "nextjs-toploader/app"
import { toast } from "sonner"
import {
  AlertCircleIcon,
  Camera01Icon,
  Cancel01Icon,
  Search01Icon,
  UserAdd01Icon,
  UserGroupIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { AppHeader } from "@/components/layout/app-header"
import { PageContainer } from "@/components/layout/app-shell"
import { useSession } from "@/components/providers/session-provider"
import { EmptyState } from "@/components/shared/empty-state"
import {
  DEFAULT_GROUP_ICON,
  GROUP_ICONS,
  GroupIcon,
} from "@/components/shared/group-icon"
import { ListSkeleton, QueryError } from "@/components/shared/query-state"
import { UserAvatar } from "@/components/shared/user-avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group"
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemFooter,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item"
import { Spinner } from "@/components/ui/spinner"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { useCreateGroup } from "@/hooks/mutations"
import { useFriends, useUserSearch } from "@/hooks/queries"
import type { Group, UserProfile } from "@/lib/types"

export default function CreateGroupPage() {
  const router = useRouter()
  const { user } = useSession()
  const friendsQuery = useFriends()
  const friends = friendsQuery.data
  const createGroup = useCreateGroup({
    successMessage: (data) =>
      `Group "${(data as Group).name}" created! Invitations sent.`,
  })

  const [groupName, setGroupName] = React.useState("")
  const [description, setDescription] = React.useState("")
  const [selectedIcon, setSelectedIcon] =
    React.useState<string>(DEFAULT_GROUP_ICON)
  // On initial load, select ZERO additional members by default. No hardcoded sample users.
  const [selectedMemberIds, setSelectedMemberIds] = React.useState<string[]>([])
  // Non-friends found by JoySplit ID: always get a group invite, a friend request only if chosen
  const [selectedNonFriends, setSelectedNonFriends] = React.useState<
    { user: UserProfile; sendFriendRequest: boolean }[]
  >([])
  const [alsoSendFriendRequest, setAlsoSendFriendRequest] =
    React.useState(false)

  const [memberSearch, setMemberSearch] = React.useState("")
  // The JoySplit ID actually looked up; "" keeps the search idle / clears the result.
  const [submittedId, setSubmittedId] = React.useState("")
  const userSearch = useUserSearch(submittedId)
  const searchResult = submittedId ? userSearch.data : undefined

  const resetSearch = () => {
    setSubmittedId("")
    setMemberSearch("")
  }

  const toggleFriendMember = (id: string) => {
    setSelectedMemberIds((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    )
  }

  const removeNonFriend = (uid: string) => {
    setSelectedNonFriends((prev) => prev.filter((nf) => nf.user.uid !== uid))
  }

  const handleSearchId = () => {
    const clean = memberSearch.trim().toUpperCase()
    if (!clean) return
    setAlsoSendFriendRequest(false)
    setSubmittedId(clean)
  }

  const addNonFriendInvitee = (
    u: Partial<UserProfile>,
    sendFriendRequest: boolean
  ) => {
    if (!u.uid || !u.displayName) return
    if (selectedNonFriends.some((nf) => nf.user.uid === u.uid)) {
      toast.info(`${u.displayName} is already on the invite list`)
      return
    }
    if (u.uid === user?.uid) {
      toast.error("You are already the creator and member of this group")
      return
    }
    const full: UserProfile = {
      uid: u.uid,
      displayName: u.displayName,
      splitzyId: u.splitzyId || "",
      email: u.email || "",
      upiId: u.upiId || "",
      photoURL: u.photoURL,
      createdAt: new Date().toISOString(),
    }
    setSelectedNonFriends((prev) => [...prev, { user: full, sendFriendRequest }])
    resetSearch()
    toast.success(
      sendFriendRequest
        ? `${u.displayName} will get a group invite and a friend request`
        : `${u.displayName} will get a group invite`
    )
  }

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    if (!groupName.trim()) {
      toast.error("Please enter a group name")
      return
    }
    createGroup.mutate(
      {
        name: groupName.trim(),
        description: description.trim(),
        icon: selectedIcon,
        // Everyone joins by invitation: selected friends and people found by ID
        invites: [
          ...friends
            .filter((f) => selectedMemberIds.includes(f.uid))
            .map((f) => ({ user: f, sendFriendRequest: false })),
          ...selectedNonFriends,
        ],
      },
      { onSuccess: (group) => router.push(`/groups/${group.id}`) }
    )
  }

  const filteredFriends = friends.filter(
    (f) =>
      f.displayName.toLowerCase().includes(memberSearch.toLowerCase()) ||
      f.splitzyId.toLowerCase().includes(memberSearch.toLowerCase())
  )

  const totalSelectedCount =
    selectedMemberIds.length + selectedNonFriends.length
  const isSearchingId = !!submittedId && userSearch.isFetching

  return (
    <>
      <AppHeader title="Create Group" showBack />

      <PageContainer className="max-w-xl">
        <form onSubmit={handleCreate} className="flex flex-col gap-6">
          {/* Icon selector */}
          <div className="flex flex-col items-center gap-2">
            <div className="relative mb-1">
              <GroupIcon
                src={selectedIcon}
                alt="Group Icon"
                className="size-24 rounded-full border-4 border-card shadow-lg"
              />
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-full bg-black/15">
                <HugeiconsIcon
                  icon={Camera01Icon}
                  className="size-6 text-white drop-shadow-md"
                />
              </div>
            </div>
            <span className="text-xs font-semibold text-muted-foreground">
              Select group icon
            </span>
            <ToggleGroup
              aria-label="Group icon"
              spacing={3}
              value={[selectedIcon]}
              onValueChange={(next) => {
                if (next.length > 0) setSelectedIcon(next[0] as string)
              }}
            >
              {GROUP_ICONS.map((icon) => (
                <ToggleGroupItem
                  key={icon.id}
                  value={icon.id}
                  aria-label={icon.label}
                  className="size-12 rounded-2xl p-0 opacity-70 transition-all hover:bg-transparent hover:opacity-100 aria-pressed:scale-105 aria-pressed:bg-transparent aria-pressed:opacity-100 aria-pressed:ring-2 aria-pressed:ring-primary aria-pressed:ring-offset-2 aria-pressed:ring-offset-background"
                >
                  <GroupIcon
                    src={icon.id}
                    alt={icon.label}
                    className="size-12 rounded-2xl"
                  />
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>

          {/* Group details */}
          <Card className="rounded-3xl">
            <CardContent>
              <FieldGroup className="gap-4">
                <Field>
                  <FieldLabel htmlFor="group-name">Group Name</FieldLabel>
                  <Input
                    id="group-name"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    placeholder="e.g. Goa Trip"
                    required
                    className="h-10"
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="group-description">
                    Description (optional)
                  </FieldLabel>
                  <Input
                    id="group-description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="e.g. Trip to North Goa 🏖️"
                    className="h-10"
                  />
                </Field>
              </FieldGroup>
            </CardContent>
          </Card>

          {/* Members */}
          <Card className="rounded-3xl">
            <CardHeader>
              <CardTitle className="font-bold">Invite Members</CardTitle>
              <CardDescription className="text-[11px]">
                You join as creator. Everyone else gets a group invitation
                and joins once they accept.
              </CardDescription>
              <CardAction>
                <Badge variant="secondary" className="text-primary">
                  {totalSelectedCount} selected
                </Badge>
              </CardAction>
            </CardHeader>

            <CardContent className="flex flex-col gap-4">
              {totalSelectedCount > 0 && (
                <div className="flex flex-wrap gap-2">
                  {selectedMemberIds.map((mId) => {
                    const f = friends.find((fr) => fr.uid === mId)
                    if (!f) return null
                    return (
                      <MemberChip
                        key={mId}
                        user={f}
                        onRemove={() => toggleFriendMember(mId)}
                      />
                    )
                  })}
                  {selectedNonFriends.map((nf) => (
                    <MemberChip
                      key={nf.user.uid}
                      user={nf.user}
                      invite={nf.sendFriendRequest ? "Invite + Friend" : "Invite"}
                      onRemove={() => removeNonFriend(nf.user.uid)}
                    />
                  ))}
                </div>
              )}

              <div className="flex flex-col gap-2">
                <InputGroup className="h-10 bg-card/60 transition-colors">
                  <InputGroupAddon className="pl-3 text-muted-foreground">
                    <HugeiconsIcon icon={Search01Icon} className="size-4" />
                  </InputGroupAddon>
                  <InputGroupInput
                    value={memberSearch}
                    onChange={(e) => {
                      setMemberSearch(e.target.value)
                      setSubmittedId("")
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault()
                        handleSearchId()
                      }
                    }}
                    placeholder="Search friends or enter JoySplit ID (e.g. JOY-XXXX)..."
                    className="text-xs"
                  />
                  {memberSearch.trim().length >= 3 && (
                    <InputGroupAddon align="inline-end" className="pr-1.5 has-[>button]:mr-0">
                      <Button
                        type="button"
                        onClick={handleSearchId}
                        disabled={isSearchingId}
                        className="h-7 px-3 text-xs font-semibold rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        {isSearchingId && <Spinner className="size-3" />}
                        <span>{isSearchingId ? "Searching..." : "Lookup ID"}</span>
                      </Button>
                    </InputGroupAddon>
                  )}
                </InputGroup>

                {searchResult && (
                  <Item
                    variant="muted"
                    size="sm"
                    className="flex-wrap rounded-2xl border-border"
                  >
                    {searchResult.found && searchResult.user ? (
                      <>
                        <ItemMedia>
                          <UserAvatar
                            src={searchResult.user.photoURL}
                            name={searchResult.user.displayName || "User"}
                            size="sm"
                          />
                        </ItemMedia>
                        <ItemContent className="min-w-0 gap-0">
                          <ItemTitle className="text-xs font-bold">
                            {searchResult.user.displayName}
                          </ItemTitle>
                          <ItemDescription className="font-mono text-[11px]">
                            {searchResult.user.splitzyId}
                          </ItemDescription>
                        </ItemContent>
                        <ItemActions>
                          {searchResult.status === "SELF" ? (
                            <span className="text-[11px] font-medium text-muted-foreground">
                              You (Creator)
                            </span>
                          ) : searchResult.status === "FRIENDS" ? (
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => {
                                if (searchResult.user?.uid)
                                  toggleFriendMember(searchResult.user.uid)
                                resetSearch()
                              }}
                            >
                              {selectedMemberIds.includes(
                                searchResult.user.uid!
                              )
                                ? "Remove"
                                : "Select Friend"}
                            </Button>
                          ) : (
                            <Button
                              type="button"
                              size="sm"
                              variant="secondary"
                              onClick={() =>
                                addNonFriendInvitee(
                                  searchResult.user!,
                                  searchResult.status === "CAN_ADD" &&
                                    alsoSendFriendRequest
                                )
                              }
                            >
                              <HugeiconsIcon
                                icon={UserAdd01Icon}
                                data-icon="inline-start"
                              />
                              Invite to Group
                            </Button>
                          )}
                        </ItemActions>
                        {searchResult.status !== "SELF" &&
                          searchResult.status !== "FRIENDS" && (
                            <ItemFooter className="flex-col items-stretch gap-1 border-t pt-2">
                              {searchResult.status === "CAN_ADD" ? (
                                <Field orientation="horizontal" className="gap-2">
                                  <Checkbox
                                    id="also-friend-request"
                                    checked={alsoSendFriendRequest}
                                    onCheckedChange={(checked) =>
                                      setAlsoSendFriendRequest(checked)
                                    }
                                  />
                                  <FieldLabel
                                    htmlFor="also-friend-request"
                                    className="text-[11px] font-semibold"
                                  >
                                    Also send a friend request
                                  </FieldLabel>
                                </Field>
                              ) : (
                                <span className="text-[11px] text-muted-foreground">
                                  {searchResult.status === "REQUEST_SENT"
                                    ? "Friend request already sent."
                                    : "They already sent you a friend request."}
                                </span>
                              )}
                              <span className="text-[10px] text-muted-foreground">
                                {alsoSendFriendRequest &&
                                searchResult.status === "CAN_ADD"
                                  ? "They'll get a group invitation and a friend request, and can accept each one separately."
                                  : "They'll get a group invitation only and join once they accept it."}
                              </span>
                            </ItemFooter>
                          )}
                      </>
                    ) : (
                      <div className="flex items-center gap-2 text-xs text-warning">
                        <HugeiconsIcon
                          icon={AlertCircleIcon}
                          className="size-4 shrink-0"
                        />
                        <span>
                          {searchResult.message ||
                            "No user found with that JoySplit ID."}
                        </span>
                      </div>
                    )}
                  </Item>
                )}
              </div>

              {friendsQuery.isPending ? (
                <ListSkeleton rows={2} />
              ) : friendsQuery.isError ? (
                <QueryError
                  error={friendsQuery.error}
                  onRetry={friendsQuery.refetch}
                />
              ) : friends.length === 0 ? (
                <EmptyState
                  className="rounded-2xl border border-dashed bg-muted/40 py-6"
                  icon={UserGroupIcon}
                  title="No friends added yet"
                  description="You can create this group now and add members later, or enter their JoySplit ID above to invite them!"
                />
              ) : filteredFriends.length === 0 ? (
                <p className="py-4 text-center text-xs text-muted-foreground">
                  No friends matching &quot;{memberSearch}&quot;
                </p>
              ) : (
                <div className="flex max-h-60 flex-col gap-1 overflow-y-auto pr-1">
                  {filteredFriends.map((friend) => (
                    <Item
                      key={friend.uid}
                      size="sm"
                      className="cursor-pointer flex-nowrap select-none hover:bg-muted/60"
                      render={<label />}
                    >
                      <ItemMedia>
                        <UserAvatar
                          src={friend.photoURL}
                          name={friend.displayName}
                          size="sm"
                        />
                      </ItemMedia>
                      <ItemContent className="min-w-0 gap-0">
                        <ItemTitle className="text-xs font-bold">
                          {friend.displayName}
                        </ItemTitle>
                        <ItemDescription className="font-mono text-[11px]">
                          {friend.splitzyId}
                        </ItemDescription>
                      </ItemContent>
                      <ItemActions>
                        <Checkbox
                          className="size-5 rounded-md"
                          checked={selectedMemberIds.includes(friend.uid)}
                          onCheckedChange={() => toggleFriendMember(friend.uid)}
                        />
                      </ItemActions>
                    </Item>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Button
            type="submit"
            size="lg"
            className="h-11 w-full shadow-md"
            disabled={createGroup.isPending}
          >
            {createGroup.isPending && <Spinner />}
            Create Group
          </Button>
        </form>
      </PageContainer>
    </>
  )
}

function MemberChip({
  user,
  invite,
  onRemove,
}: {
  user: UserProfile
  /** Label for a pending invitee (e.g. "Invite"); omit for directly added friends. */
  invite?: string
  onRemove: () => void
}) {
  return (
    <Badge
      variant={invite ? "outline" : "secondary"}
      className="h-7 gap-1.5 pr-1 pl-1"
    >
      <UserAvatar src={user.photoURL} name={user.displayName} size="xs" />
      <span>{user.displayName}</span>
      {invite && (
        <span className="rounded bg-muted px-1 text-[10px]">{invite}</span>
      )}
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        className="rounded-full hover:text-destructive"
        aria-label={`Remove ${user.displayName}`}
        onClick={onRemove}
      >
        <HugeiconsIcon icon={Cancel01Icon} />
      </Button>
    </Badge>
  )
}
