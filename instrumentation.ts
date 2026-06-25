/**
 * Next.js instrumentation hook — runs once when the server starts.
 * Stubs browser-only APIs (indexedDB, localStorage, sessionStorage)
 * that WalletConnect / wagmi try to access during SSR on a plain Node.js server.
 * Vercel handles these silently; cPanel standalone does not.
 *
 * IMPORTANT: indexedDB must be a working stub, NOT null.
 * WalletConnect uses idb-keyval which calls indexedDB.open() then open.onsuccess,
 * so setting it to null causes TypeError: Cannot read properties of null.
 */
export function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const g = globalThis as Record<string, unknown>;

  if (typeof g.indexedDB === "undefined") {
    // In-memory IDB stub — holds key/value data in Maps per object store name.
    // WalletConnect reads back undefined (no stored wallet) and silently starts fresh.
    const stores: Record<string, Map<unknown, unknown>> = {};
    const getStore = (name: string) => (stores[name] ??= new Map());

    const makeRequest = <T>(resultFn: () => T) => {
      const req: Record<string, unknown> = {};
      queueMicrotask(() => {
        try { req.result = resultFn(); } catch { req.result = undefined; }
        req.readyState = "done";
        if (typeof req.onsuccess === "function") (req.onsuccess as (e: unknown) => void)({ target: req });
      });
      return req;
    };

    const makeObjectStore = (name: string): Record<string, unknown> => ({
      get:        (k: unknown) => makeRequest(() => getStore(name).get(k)),
      put:        (v: unknown, k?: unknown) => makeRequest(() => { if (k != null) getStore(name).set(k, v); return k; }),
      delete:     (k: unknown) => makeRequest(() => { getStore(name).delete(k); }),
      clear:      ()           => makeRequest(() => { getStore(name).clear(); }),
      getAll:     ()           => makeRequest(() => Array.from(getStore(name).values())),
      getAllKeys:  ()           => makeRequest(() => Array.from(getStore(name).keys())),
      openCursor: ()           => makeRequest(() => null),
      openKeyCursor: ()        => makeRequest(() => null),
      count:      ()           => makeRequest(() => getStore(name).size),
      add:        (v: unknown, k?: unknown) => makeRequest(() => { if (k != null) getStore(name).set(k, v); return k; }),
      index:      ()           => makeObjectStore(name),
      createIndex:()           => makeObjectStore(name),
    });

    const makeTx = (storeNames: string[]) => {
      const tx: Record<string, unknown> = {
        objectStore: (n: string) => makeObjectStore(storeNames.includes(n) ? n : storeNames[0]),
        commit:      () => { queueMicrotask(() => { if (typeof tx.oncomplete === "function") (tx.oncomplete as () => void)(); }); },
        abort:       () => {},
        oncomplete:  null,
        onerror:     null,
        onabort:     null,
        error:       null,
        mode:        "readwrite",
        addEventListener:    (evt: string, cb: () => void) => { if (evt === "complete") queueMicrotask(cb); },
        removeEventListener: () => {},
        dispatchEvent:       () => true,
      };
      // auto-fire oncomplete so idb-keyval's promise resolves
      queueMicrotask(() => { if (typeof tx.oncomplete === "function") (tx.oncomplete as () => void)(); });
      return tx;
    };

    const makeDB = () => ({
      transaction:       (s: string | string[]) => makeTx(Array.isArray(s) ? s : [s]),
      createObjectStore: (n: string) => makeObjectStore(n),
      deleteObjectStore: () => {},
      close:             () => {},
      objectStoreNames:  { contains: () => true, item: () => "", length: 0, [Symbol.iterator]: function*() {} },
      name:              "",
      version:           1,
      onversionchange:   null,
      onabort:           null,
      onerror:           null,
      addEventListener:    () => {},
      removeEventListener: () => {},
      dispatchEvent:       () => true,
    });

    g.indexedDB = {
      open:           () => makeRequest(makeDB),
      deleteDatabase: () => makeRequest(() => undefined),
      cmp:            () => 0,
      databases:      async () => [],
    };
  }

  // Stub localStorage / sessionStorage with functional in-memory implementations
  const memStorage = () => {
    const s: Record<string, string> = {};
    return {
      getItem:    (k: string) => Object.prototype.hasOwnProperty.call(s, k) ? s[k] : null,
      setItem:    (k: string, v: string) => { s[k] = String(v); },
      removeItem: (k: string) => { delete s[k]; },
      clear:      () => { Object.keys(s).forEach((k) => delete s[k]); },
      key:        (i: number) => Object.keys(s)[i] ?? null,
      get length() { return Object.keys(s).length; },
    };
  };
  if (typeof g.localStorage   === "undefined") g.localStorage   = memStorage();
  if (typeof g.sessionStorage  === "undefined") g.sessionStorage  = memStorage();
}
