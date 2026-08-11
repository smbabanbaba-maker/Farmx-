export type AppErrorContext = Record<string, unknown>;

/**
 * Records errors locally during development without sending visitor data to a
 * third-party service. Connect this boundary to the approved production
 * observability service only after its privacy policy and credentials are set.
 */
export function reportApplicationError(error: unknown, context: AppErrorContext = {}) {
  if (import.meta.env.DEV) {
    console.error("FarmX application error", {
      error,
      route: typeof window === "undefined" ? undefined : window.location.pathname,
      ...context,
    });
  }
}
