/**
 * Central query-key factory. Every key is scoped by the signed-in uid so that
 * switching accounts can never surface another user's cached data.
 */
export const queryKeys = {
  all: ["joysplit"] as const,
  user: (uid: string) => [...queryKeys.all, uid] as const,

  friends: (uid: string) => [...queryKeys.user(uid), "friends"] as const,
  friendRequests: (uid: string) => [...queryKeys.user(uid), "friendRequests"] as const,
  groups: (uid: string) => [...queryKeys.user(uid), "groups"] as const,
  expenses: (uid: string) => [...queryKeys.user(uid), "expenses"] as const,
  notifications: (uid: string) => [...queryKeys.user(uid), "notifications"] as const,

  expense: (uid: string, expenseId: string) => [...queryKeys.user(uid), "expense", expenseId] as const,
  group: (uid: string, groupId: string) => [...queryKeys.user(uid), "group", groupId] as const,
  groupExpenses: (uid: string, groupId: string) => [...queryKeys.user(uid), "groupExpenses", groupId] as const,
  userSearch: (uid: string, splitzyId: string) => [...queryKeys.user(uid), "userSearch", splitzyId] as const,
  suggestions: (uid: string) => [...queryKeys.user(uid), "suggestions"] as const,
}
