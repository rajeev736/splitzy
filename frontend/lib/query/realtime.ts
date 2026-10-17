import type { QueryClient, QueryKey } from "@tanstack/react-query"

/**
 * Bridge between Firestore `onSnapshot` listeners and the TanStack Query cache.
 *
 * Listeners (see `components/realtime-sync.tsx`) push every snapshot into the
 * cache with `publish`. Queries read with `awaitRealtime`, which resolves
 * immediately when a snapshot is cached, or waits for the first one. This
 * means a collection is read exactly once by its listener — queries never
 * issue duplicate Firestore reads — while components still get proper
 * `isPending` / `isError` states and shared, de-duplicated cache entries.
 */

type Waiter = { resolve: (value: unknown) => void; reject: (error: unknown) => void }

const waiters = new Map<string, Waiter[]>()

const hashKey = (key: QueryKey) => JSON.stringify(key)

export function awaitRealtime<T>(queryClient: QueryClient, key: QueryKey): Promise<T> {
  const cached = queryClient.getQueryData<T>(key)
  if (cached !== undefined) return Promise.resolve(cached)

  return new Promise<T>((resolve, reject) => {
    const hash = hashKey(key)
    const list = waiters.get(hash) ?? []
    list.push({ resolve: resolve as (value: unknown) => void, reject })
    waiters.set(hash, list)
  })
}

export function publish<T>(queryClient: QueryClient, key: QueryKey, data: T) {
  queryClient.setQueryData(key, data)
  const hash = hashKey(key)
  waiters.get(hash)?.forEach((w) => w.resolve(data))
  waiters.delete(hash)
}

export function publishError(queryClient: QueryClient, key: QueryKey, error: unknown) {
  const hash = hashKey(key)
  const pending = waiters.get(hash)
  waiters.delete(hash)

  if (pending?.length) {
    pending.forEach((w) => w.reject(error))
    return
  }

  // Listener failed after data was already delivered: keep the stale data but
  // flag the query so components can surface the error.
  const query = queryClient.getQueryCache().find({ queryKey: key, exact: true })
  if (query && query.state.data !== undefined) {
    query.setState({ error: error as Error, errorUpdatedAt: Date.now() })
  }
}
