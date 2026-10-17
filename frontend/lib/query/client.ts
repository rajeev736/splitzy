import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { getErrorMessage, isRetryableError } from "@/lib/errors"

declare module "@tanstack/react-query" {
  interface Register {
    queryMeta: {
      /** Override the toast shown when this query fails. `false` silences it. */
      errorMessage?: string | false
    }
    mutationMeta: {
      /** Toast shown on success. A function receives the mutation result. */
      successMessage?: string | ((data: unknown) => string | undefined)
      /** Override the error toast. `false` lets the caller handle errors itself. */
      errorMessage?: string | false
    }
  }
}

export function makeQueryClient() {
  return new QueryClient({
    queryCache: new QueryCache({
      onError: (error, query) => {
        const override = query.meta?.errorMessage
        if (override === false) return
        // Only toast once per query; background failures with cached data stay quiet.
        if (query.state.data !== undefined) return
        toast.error(override ?? getErrorMessage(error))
      },
    }),
    mutationCache: new MutationCache({
      onSuccess: (data, _vars, _ctx, mutation) => {
        const msg = mutation.meta?.successMessage
        const text = typeof msg === "function" ? msg(data) : msg
        if (text) toast.success(text)
      },
      onError: (error, _vars, _ctx, mutation) => {
        const override = mutation.meta?.errorMessage
        if (override === false) return
        toast.error(override ?? getErrorMessage(error))
      },
    }),
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
        refetchOnWindowFocus: false,
        retry: (failureCount, error) => isRetryableError(error) && failureCount < 2,
      },
      mutations: {
        retry: false,
      },
    },
  })
}
