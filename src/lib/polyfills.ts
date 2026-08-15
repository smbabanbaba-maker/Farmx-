if (typeof window !== "undefined") {
  if (!(window as unknown as Record<string, unknown>).global) {
    (window as unknown as Record<string, unknown>).global = window;
  }
  if (!(window as unknown as Record<string, unknown>).process) {
    (window as unknown as Record<string, unknown>).process = { env: {} };
  }
}
export {};
