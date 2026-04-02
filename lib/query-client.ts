import { QueryClient } from "@tanstack/react-query";

/**
 * Shared QueryClient singleton.
 * Configured with sensible defaults for a live intelligence platform:
 * - staleTime 8s: matches the poll interval, avoids over-fetching on fast nav
 * - refetchOnWindowFocus: critical for live intel — always freshen on tab return
 * - retry 1: one retry before exposing an error state to the user
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime:          8_000,
      refetchOnWindowFocus: true,
      retry:              1,
    },
  },
});
