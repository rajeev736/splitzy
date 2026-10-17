"use client"

import { useMutation, useQueryClient, type QueryClient, type QueryKey } from "@tanstack/react-query"

import { useSession } from "@/components/providers/session-provider"
import { AppError } from "@/lib/errors"
import { queryKeys } from "@/lib/query/keys"
import type { AppNotification, Expense, FriendRequest, Group, UserProfile } from "@/lib/types"
import * as authService from "@/services/auth"
import * as expenseService from "@/services/expenses"
import * as friendService from "@/services/friends"
import * as groupService from "@/services/groups"
import * as notificationService from "@/services/notifications"

/* ────────────────────────────────────────────────────────────────────────────
 * Plumbing
 * ──────────────────────────────────────────────────────────────────────────── */

export interface MutationToastOptions {
  /** Success toast; a function receives the mutation result. Omit for no toast. */
  successMessage?: string | ((data: unknown) => string | undefined)
  /** Error toast override. `false` = caller handles the error itself. */
  errorMessage?: string | false
}

/** Typed read/patch access to the signed-in user's cached collections. */
function cacheFor(qc: QueryClient, uid: string) {
  const list =
    <T,>(key: QueryKey) =>
    () =>
      qc.getQueryData<T[]>(key) ?? []
  const patch =
    <T,>(key: QueryKey) =>
    (fn: (list: T[]) => T[]) =>
      qc.setQueryData<T[]>(key, (prev) => fn(prev ?? []))

  return {
    friends: list<UserProfile>(queryKeys.friends(uid)),
    friendRequests: list<FriendRequest>(queryKeys.friendRequests(uid)),
    groups: list<Group>(queryKeys.groups(uid)),
    expenses: list<Expense>(queryKeys.expenses(uid)),
    notifications: list<AppNotification>(queryKeys.notifications(uid)),
    setFriends: patch<UserProfile>(queryKeys.friends(uid)),
    setFriendRequests: patch<FriendRequest>(queryKeys.friendRequests(uid)),
    setGroups: patch<Group>(queryKeys.groups(uid)),
    setExpenses: patch<Expense>(queryKeys.expenses(uid)),
    setNotifications: patch<AppNotification>(queryKeys.notifications(uid)),
  }
}

type Ctx = { user: UserProfile; cache: ReturnType<typeof cacheFor> }

/**
 * Builds a mutation hook that requires a signed-in user. `run` performs the
 * work; `apply` patches the cache on success (Firestore listeners reconcile
 * shortly after, so the UI updates instantly either way).
 */
function createUserMutation<TVars, TData>(config: {
  run: (ctx: Ctx, vars: TVars) => Promise<TData>
  apply?: (ctx: Ctx, data: TData, vars: TVars) => void
  defaults?: MutationToastOptions
}) {
  return function useUserMutation(options: MutationToastOptions = {}) {
    const qc = useQueryClient()
    const { user } = useSession()

    const ctx = (): Ctx => {
      if (!user) throw new AppError("Please log in first")
      return { user, cache: cacheFor(qc, user.uid) }
    }

    return useMutation({
      mutationFn: (vars: TVars) => config.run(ctx(), vars),
      onSuccess: (data, vars) => config.apply?.(ctx(), data, vars),
      meta: { ...config.defaults, ...options },
    })
  }
}

const withMessage = (data: unknown) => (data as { message?: string } | undefined)?.message

const patchById =
  <T extends { id: string }>(id: string, patch: Partial<T>) =>
  (list: T[]) =>
    list.map((item) => (item.id === id ? { ...item, ...patch } : item))

/* ────────────────────────────────────────────────────────────────────────────
 * Auth
 * ──────────────────────────────────────────────────────────────────────────── */

export function useLogin(options: MutationToastOptions = {}) {
  const { login } = useSession()
  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) => login(email, password),
    meta: options,
  })
}

export function useSignup(options: MutationToastOptions = {}) {
  const { signup } = useSession()
  return useMutation({
    mutationFn: (v: { name: string; email: string; password?: string; preferredSplitzyId?: string }) =>
      signup(v.name, v.email, v.password, v.preferredSplitzyId),
    meta: options,
  })
}

export function useGoogleLogin(options: MutationToastOptions = {}) {
  const { loginWithGoogle } = useSession()
  return useMutation({ mutationFn: () => loginWithGoogle(), meta: options })
}

export function useLogout(options: MutationToastOptions = {}) {
  const { logout } = useSession()
  return useMutation({
    mutationFn: () => logout(),
    meta: { successMessage: "Logged out successfully", ...options },
  })
}

export function useSendVerificationEmail(options: MutationToastOptions = {}) {
  const { sendVerificationEmail } = useSession()
  return useMutation({ mutationFn: () => sendVerificationEmail(), meta: options })
}

export function useUpdateProfile(options: MutationToastOptions = {}) {
  const qc = useQueryClient()
  const { user, setProfile } = useSession()
  return useMutation({
    mutationFn: (updates: Partial<UserProfile>) =>
      authService.updateProfile({
        user,
        updates,
        groups: user ? (qc.getQueryData<Group[]>(queryKeys.groups(user.uid)) ?? []) : [],
      }),
    onSuccess: (updated) => setProfile(updated),
    meta: options,
  })
}

/* ────────────────────────────────────────────────────────────────────────────
 * Groups
 * ──────────────────────────────────────────────────────────────────────────── */

export const useCreateGroup = createUserMutation({
  run: ({ user, cache }, input: groupService.CreateGroupInput) =>
    groupService.createGroup(user, cache.friends(), input),
  apply: ({ cache }, group) => cache.setGroups((list) => [group, ...list]),
})

export const useUpdateGroup = createUserMutation({
  run: async (_ctx, { groupId, updates }: { groupId: string; updates: Partial<Group> }) =>
    groupService.updateGroup(groupId, updates),
  apply: ({ cache }, _data, { groupId, updates }) => {
    cache.setGroups(patchById(groupId, updates))
    // Also sync groupName/groupIcon in related expenses
    if (updates.name || updates.icon) {
      cache.setExpenses((list) =>
        list.map((exp) =>
          exp.groupId === groupId
            ? { ...exp, groupName: updates.name || exp.groupName, groupIcon: updates.icon || exp.groupIcon }
            : exp
        )
      )
    }
  },
})

export const useLeaveGroup = createUserMutation({
  run: ({ user, cache }, groupId: string) =>
    groupService.leaveGroup(user, cache.groups().find((g) => g.id === groupId), cache.expenses()),
  apply: ({ cache }, _data, groupId) => cache.setGroups((list) => list.filter((g) => g.id !== groupId)),
})

export const useDeleteGroup = createUserMutation({
  run: ({ user, cache }, groupId: string) =>
    groupService.deleteGroup(user, cache.groups().find((g) => g.id === groupId), cache.expenses()),
  apply: ({ cache }, _data, groupId) => cache.setGroups((list) => list.filter((g) => g.id !== groupId)),
})

export const useInviteGroupMember = createUserMutation({
  run: (
    { user, cache },
    v: { groupId: string; target: string; option?: groupService.InviteOption }
  ) =>
    groupService.inviteGroupMember(
      { user, groups: cache.groups(), friends: cache.friends(), friendRequests: cache.friendRequests() },
      v.groupId,
      v.target,
      v.option
    ),
  apply: ({ cache }, res, { groupId }) => {
    if (res.invitedMembers) cache.setGroups(patchById<Group>(groupId, { invitedMembers: res.invitedMembers }))
    if (res.friendRequest) cache.setFriendRequests((list) => [res.friendRequest!, ...list])
  },
  defaults: { successMessage: withMessage },
})

export const useAcceptGroupInvite = createUserMutation({
  run: (
    { user, cache },
    v: { groupId: string; acceptCombinedFriendship?: boolean; friendRequestId?: string }
  ) =>
    groupService.acceptGroupInvite(user, cache.groups(), v.groupId, {
      acceptCombinedFriendship: v.acceptCombinedFriendship,
      friendRequestId: v.friendRequestId,
    }),
  apply: ({ cache }, res, { groupId }) => cache.setGroups(patchById<Group>(groupId, res.patch)),
  defaults: { successMessage: withMessage },
})

export const useDeclineGroupInvite = createUserMutation({
  run: ({ user, cache }, v: { groupId: string; friendRequestId?: string }) =>
    groupService.declineGroupInvite(user, cache.groups(), v.groupId, v.friendRequestId),
  defaults: { successMessage: withMessage },
})

/* ────────────────────────────────────────────────────────────────────────────
 * Expenses & payments
 * ──────────────────────────────────────────────────────────────────────────── */

export const useCreateExpense = createUserMutation({
  run: ({ user }, input: expenseService.CreateExpenseInput) => expenseService.createExpense(user, input),
  apply: ({ cache }, expense) => cache.setExpenses((list) => [expense, ...list]),
})

export const useDeleteExpense = createUserMutation({
  run: ({ user, cache }, expenseId: string) => expenseService.deleteExpense(user, cache.expenses(), expenseId),
  apply: ({ cache }, _data, expenseId) => cache.setExpenses((list) => list.filter((e) => e.id !== expenseId)),
})

export const useReportPayment = createUserMutation({
  run: ({ user, cache }, v: { expenseId: string; note?: string }) =>
    expenseService.reportPayment(user, cache.expenses(), v.expenseId, v.note),
  apply: ({ cache }, shares, { expenseId }) => cache.setExpenses(patchById<Expense>(expenseId, { shares })),
})

export const useConfirmPayment = createUserMutation({
  run: ({ user, cache }, v: { expenseId: string; memberUserId: string }) =>
    expenseService.confirmPaymentReceipt(user, cache.expenses(), v.expenseId, v.memberUserId),
  apply: ({ cache }, shares, { expenseId }) => cache.setExpenses(patchById<Expense>(expenseId, { shares })),
})

export const useDisputePayment = createUserMutation({
  run: ({ user, cache }, v: { expenseId: string; memberUserId: string }) =>
    expenseService.disputePaymentReceipt(user, cache.expenses(), v.expenseId, v.memberUserId),
  apply: ({ cache }, shares, { expenseId }) => cache.setExpenses(patchById<Expense>(expenseId, { shares })),
})

export const useSendPaymentReminder = createUserMutation({
  run: ({ user, cache }, v: { expenseId: string; targetUserId: string }) =>
    expenseService.sendPaymentReminder(user, cache.expenses(), v.expenseId, v.targetUserId),
})

/* ────────────────────────────────────────────────────────────────────────────
 * Friends
 * ──────────────────────────────────────────────────────────────────────────── */

const friendsCtx = ({ user, cache }: Ctx) => ({
  user,
  friends: cache.friends(),
  friendRequests: cache.friendRequests(),
})

export const useSendFriendRequest = createUserMutation({
  run: (ctx, splitzyId: string) => friendService.sendFriendRequest(friendsCtx(ctx), splitzyId),
  apply: ({ cache }, res) => cache.setFriendRequests((list) => [res.request, ...list]),
  defaults: { successMessage: withMessage },
})

export const useAcceptFriendRequest = createUserMutation({
  run: (ctx, requestId: string) => friendService.acceptFriendRequest(friendsCtx(ctx), requestId),
  apply: ({ cache }, friend, requestId) => {
    cache.setFriendRequests(patchById<FriendRequest>(requestId, { status: "ACCEPTED" }))
    if (friend) cache.setFriends((list) => (list.some((f) => f.uid === friend.uid) ? list : [...list, friend]))
  },
})

export const useRejectFriendRequest = createUserMutation({
  run: async (_ctx, requestId: string) => friendService.rejectFriendRequest(requestId),
  apply: ({ cache }, _data, requestId) =>
    cache.setFriendRequests(patchById<FriendRequest>(requestId, { status: "REJECTED" })),
})

export const useRemoveFriend = createUserMutation({
  run: ({ user, cache }, friendUid: string) => friendService.removeFriend(user, friendUid, cache.expenses()),
  apply: ({ cache }, _data, friendUid) => cache.setFriends((list) => list.filter((f) => f.uid !== friendUid)),
})

/* ────────────────────────────────────────────────────────────────────────────
 * Notifications (optimistic, failures are silent — matches original UX)
 * ──────────────────────────────────────────────────────────────────────────── */

export function useMarkNotificationRead() {
  const qc = useQueryClient()
  const { user } = useSession()
  return useMutation({
    mutationFn: (id: string) => notificationService.markNotificationRead(id),
    onMutate: (id) => {
      if (user) cacheFor(qc, user.uid).setNotifications(patchById<AppNotification>(id, { read: true }))
    },
    onError: (e) => console.warn("Failed to mark notification read:", e),
    meta: { errorMessage: false },
  })
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient()
  const { user } = useSession()
  return useMutation({
    mutationFn: async () => {
      if (!user) return
      const cache = cacheFor(qc, user.uid)
      const snapshot = cache.notifications()
      cache.setNotifications((list) => list.map((n) => ({ ...n, read: true })))
      await notificationService.markAllNotificationsRead(snapshot)
    },
    onError: (e) => console.warn("Failed to mark all notifications read:", e),
    meta: { errorMessage: false },
  })
}
