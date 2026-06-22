/**
 * Next.js instrumentation hook — runs once when the server starts.
 * Stubs browser-only APIs (indexedDB, localStorage, sessionStorage)
 * that WalletConnect / wagmi try to access during SSR on a plain Node.js server.
 * Vercel handles these silently; cPanel standalone does not.
 */
export function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const g = globalThis as Record<string, unknown>;

    // Stub indexedDB
    if (typeof g.indexedDB === "undefined") {
      g.indexedDB = null;
    }

    // Stub localStorage
    if (typeof g.localStorage === "undefined") {
      g.localStorage = {
        getItem:    () => null,
        setItem:    () => {},
        removeItem: () => {},
        clear:      () => {},
        key:        () => null,
        length:     0,
      };
    }

    // Stub sessionStorage
    if (typeof g.sessionStorage === "undefined") {
      g.sessionStorage = {
        getItem:    () => null,
        setItem:    () => {},
        removeItem: () => {},
        clear:      () => {},
        key:        () => null,
        length:     0,
      };
    }
  }
}
