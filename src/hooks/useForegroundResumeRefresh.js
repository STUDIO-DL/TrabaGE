/**
 * Resume auto-refresh is intentionally disabled.
 * Leaving/returning the app must keep scroll position and in-memory state.
 * Realtime subscriptions + pull-to-refresh cover freshness instead.
 */
export function useForegroundResumeRefresh(_onRefresh, _deps = []) {
  // no-op
}
