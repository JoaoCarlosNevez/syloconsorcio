// TanStack Query client — the sole manager of server state in the frontend.
//
// ADR-09: all API data flows through this client.
// Never store API responses in useState, useReducer, or global stores (Zustand, Context).
//
// Default configuration rationale:
//   staleTime 30s  — data is considered fresh for 30 seconds before a background refetch
//   gcTime 5min    — inactive cache entries are kept for 5 minutes before garbage collection
//   retry 1        — one retry on failure before surfacing the error to the UI
//   refetchOnWindowFocus — data is revalidated when the user returns to the tab

import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000,
      gcTime: 5 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: true,
    },
    mutations: {
      retry: 0,
    },
  },
})
