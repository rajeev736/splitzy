# JoySplit — frontend

The shadcn/ui + TanStack Query rebuild of the app in `../src`. Business logic is unchanged; the UI layer, data access, and error handling are new.

```bash
cp .env.example .env.local   # fill in Firebase keys
npm install
npm run dev
```

## Layout

```
app/                      routes (same paths as ../src/app)
  (auth)/                 login, signup, onboarding, forgot-password
  (dashboard)/layout.tsx  AppShell (auth guard + sidebar + bottom nav) — pages don't repeat it
components/
  ui/                     shadcn components (Base UI flavour — use `render`, not `asChild`)
  shared/                 app building blocks: UserAvatar, StatusBadge, Amount, GroupIcon,
                          EmptyState, ConfirmDialog, QueryError/ListSkeleton, ButtonLink, JoySplitLogo
  layout/                 AppShell, AppHeader, AppSidebar, BottomNav, LogoutDialog, nav-items
  providers/              theme, QueryClient, session (auth), realtime sync, top loader, toaster
services/                 every Firestore read/write — pure async functions, no React
hooks/
  queries.ts              useGroups, useExpenses, useFriends, useGroup, useExpense, useUserSearch, …
  mutations.ts            useCreateExpense, useLeaveGroup, useInviteGroupMember, …
lib/
  query/                  QueryClient config, key factory, Firestore ↔ cache bridge
  errors.ts               AppError + getErrorMessage (friendly Firebase messages)
  money, expenses, upi, types, firebase   copied verbatim from ../src/lib
```

## Data flow

- **Reads.** `RealtimeSync` opens one `onSnapshot` listener per collection for the signed-in user and
  pushes each snapshot into the query cache (`lib/query/realtime.ts`). `useGroups()` etc. read that cache,
  so every component shares one listener and gets `isPending` / `isError` states. One-off reads
  (`useUserSearch`, `useFriendSuggestions`, deep-linked `useExpense` / `useGroup`) are normal cached queries.
- **Writes.** Mutation hooks call `services/*` and patch the cache on success, so the UI updates instantly;
  the listener reconciles moments later.
- **Errors.** Services throw `AppError("user-facing message")` for business-rule failures. The global
  `MutationCache` / `QueryCache` toast them via `getErrorMessage`, which also maps Firebase codes to friendly
  text. Non-retryable errors (permission-denied, auth/*, AppError) are never retried. Pass
  `{ successMessage }` / `{ errorMessage: false }` to any mutation hook to customise toasts.
- **Sign-out** clears the whole query cache, and every key is scoped by uid, so data never leaks across accounts.

## Conventions

- Semantic colour tokens only (`bg-card`, `text-muted-foreground`, `text-success`, `bg-destructive/10` …) —
  the JoySplit palette lives in `app/globals.css` and handles dark mode. No hex values or `dark:` overrides in pages.
- Icons: Hugeicons (`@hugeicons/react` + `@hugeicons/core-free-icons`).
- Programmatic navigation: `useRouter` from `nextjs-toploader/app` so the top loader shows.
- Confirmations always use `ConfirmDialog`; toasts always use `sonner`.
