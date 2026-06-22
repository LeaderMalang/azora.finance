"use client";

import { useAccount } from "wagmi";
import { useState, useEffect, useCallback } from "react";
import { useAppStore } from "@/lib/store";

export function useAdminFetch() {
  const { address: addr } = useAccount();
  const isAdminStore = useAppStore((s) => s.isAdmin);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    if (!addr) { setIsAdmin(null); return; }
    if (isAdminStore) { setIsAdmin(true); return; }
    fetch(`/api/admin/auth?wallet=${addr}`)
      .then(r => r.json())
      .then(d => setIsAdmin(!!d.isAdmin))
      .catch(() => setIsAdmin(false));
  }, [addr, isAdminStore]);

  const adminFetch = useCallback((url: string, opts: RequestInit = {}) =>
    fetch(url, { ...opts, headers: { ...(opts.headers ?? {}), "x-admin-wallet": addr ?? "" } }),
  [addr]);

  return { isAdmin, adminFetch, addr };
}
