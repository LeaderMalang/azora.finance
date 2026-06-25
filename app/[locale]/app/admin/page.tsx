"use client";

import { AppTopbar } from "@/components/app/AppTopbar";
import { useAccount } from "wagmi";
import { Spinner } from "@/components/ui/Spinner";
import { isAddress } from "viem";
import { useState, useEffect } from "react";
import { useToast } from "@/components/ui/Toast";
import { useAppStore } from "@/lib/store";
import Link from "next/link";
import { AdminPaginator } from "@/components/ui/AdminPaginator";
import { useParams } from "next/navigation";

const CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? 97);

function AdminCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="az-card">
      <h3 className="font-semibold mb-5 text-sm uppercase az-mono tracking-wider" style={{ color: "var(--muted)" }}>{title}</h3>
      {children}
    </div>
  );
}

export default function AdminPage() {
  const { address: addr } = useAccount();
  const { toast } = useToast();
  const { locale } = useParams<{ locale: string }>();

  // Admin status from Zustand store (set by layout.tsx on wallet connect)
  const isAdminStore = useAppStore((s) => s.isAdmin);
  const [isAdmin, setIsAdminLocal] = useState<boolean | null>(null); // null = still loading
  // Pool AZR balance (platform overview)
  // poolAzrBal removed — platform is custodial; on-chain contract pool is no longer displayed

  // Helper: add admin wallet header to all fetch calls
  const adminFetch = (url: string, opts: RequestInit = {}) =>
    fetch(url, { ...opts, headers: { ...(opts.headers ?? {}), "x-admin-wallet": addr ?? "" } });

  // Sync local state from store (layout already did the DB check)
  // Also do an independent check so admin page works even if layout check was slow
  useEffect(() => {
    if (!addr) { setIsAdminLocal(null); return; }
    if (isAdminStore) { setIsAdminLocal(true); return; }
    fetch(`/api/admin/auth?wallet=${addr}`)
      .then(r => r.json())
      .then(d => setIsAdminLocal(!!d.isAdmin))
      .catch(() => setIsAdminLocal(false));
  }, [addr, isAdminStore]);

  // DB stats
  const [dbStats, setDbStats] = useState<{ userCount: number; referralTotal: string; totalActiveStaked: number; totalUsdtBalance: number; totalAzrBalance: number } | null>(null);
  useEffect(() => {
    if (!addr || !isAdmin) return;
    adminFetch("/api/admin/stats").then(r => r.json()).then(setDbStats).catch(() => {});
  }, [addr, isAdmin]);

  // Admin wallet management
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [adminWallets, setAdminWallets] = useState<any[]>([]);
  const [newAdminWallet, setNewAdminWallet] = useState("");
  const [newAdminLabel, setNewAdminLabel] = useState("");
  const [adminWalletsLoading, setAdminWalletsLoading] = useState(false);

  const fetchAdminWallets = async () => {
    setAdminWalletsLoading(true);
    try {
      const res = await adminFetch("/api/admin/wallets");
      if (res.ok) { const d = await res.json(); setAdminWallets(d.wallets ?? []); }
    } finally { setAdminWalletsLoading(false); }
  };


  // Adjust Balance (custodial)
  const [adjWallet, setAdjWallet] = useState("");
  const [adjAsset, setAdjAsset] = useState<"azr" | "usdt">("usdt");
  const [adjAmount, setAdjAmount] = useState("");
  const [adjBal, setAdjBal] = useState<{ usdtBalance: number; azrBalance: number; username?: string } | null>(null);
  const [adjLoading, setAdjLoading] = useState(false);
  // Platform Settings
  const [settings, setSettings] = useState<{ minStakeAzr: number; lockDays: number; dailyRewardPct: number; minWithdrawal: number; withdrawalFeePct: number; referralRateL1: number; referralRateL2: number; referralRateL3: number; treasuryWallet: string } | null>(null);
  const [newTreasuryWallet, setNewTreasuryWallet] = useState("");
  const [treasuryLoading, setTreasuryLoading] = useState(false);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [seedWallet, setSeedWallet] = useState("");
  const [seedReferrer, setSeedReferrer] = useState("");
  const [seedUsername, setSeedUsername] = useState("");
  const [seedLoading, setSeedLoading] = useState(false);
  // User lookup
  const [userQuery, setUserQuery] = useState("");
  const [userQueryLoading, setUserQueryLoading] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [userResult, setUserResult] = useState<any>(null);
  // Virtual withdrawal queue — with filters + search
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [vwList, setVwList] = useState<any[]>([]);
  const [vwLoading, setVwLoading] = useState(false);
  const [vwSentHash, setVwSentHash] = useState<Record<number, string>>({});
  const [vwSearch, setVwSearch] = useState("");
  const [vwStatusFilter, setVwStatusFilter] = useState("-1");
  const [vwAssetFilter, setVwAssetFilter] = useState("-1");
  // Balance adjustments history
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [baList, setBaList] = useState<any[]>([]);
  const [baTotal, setBaTotal] = useState(0);
  const [baLoading, setBaLoading] = useState(false);
  const [baSearch, setBaSearch] = useState("");
  const [baAsset, setBaAsset] = useState("");
  const [baAction, setBaAction] = useState("");
  // Users list for lookup
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [ulList, setUlList] = useState<any[]>([]);
  const [ulTotal, setUlTotal] = useState(0);
  const [ulLoading, setUlLoading] = useState(false);
  const [ulSearch, setUlSearch] = useState("");
  const [ulHasUpline, setUlHasUpline] = useState("");
  // Compact card pagination (10 per page, client-side slice)
  const [vwCardPage, setVwCardPage] = useState(1);
  const [baCardPage, setBaCardPage] = useState(1);
  const [ulCardPage, setUlCardPage] = useState(1);
  const [stakeDetailPage, setStakeDetailPage] = useState(1);
  const [claimDetailPage, setClaimDetailPage] = useState(1);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [unstaking, setUnstaking] = useState<number | null>(null);
  // DB migrations
  const [migrationLoading, setMigrationLoading] = useState(false);
  const [migrationResult, setMigrationResult] = useState<{ ok: boolean; results: { id: string; status: "ok" | "error"; message?: string }[] } | null>(null);
  // DB sync
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [syncCounts, setSyncCounts] = useState<any>(null);
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [syncResult, setSyncResult] = useState<any>(null);

  const fetchVirtualWithdrawals = async (statusF = vwStatusFilter) => {
    setVwLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusF !== "-1") params.set("status", statusF);
      const res = await adminFetch(`/api/admin/virtual-withdrawals?${params}`);
      if (res.ok) { const d = await res.json(); setVwList(d.withdrawals ?? []); }
    } finally { setVwLoading(false); }
  };

  const fetchBalanceAdjustments = async (search = baSearch, asset = baAsset, action = baAction) => {
    setBaLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (asset)  params.set("asset", asset);
      if (action) params.set("action", action);
      params.set("limit", "50");
      const res = await adminFetch(`/api/admin/balance-adjustments?${params}`);
      if (res.ok) { const d = await res.json(); setBaList(d.adjustments ?? []); setBaTotal(d.total ?? 0); }
    } finally { setBaLoading(false); }
  };

  const fetchUsersList = async (search = ulSearch, hasUpline = ulHasUpline) => {
    setUlLoading(true);
    try {
      const params = new URLSearchParams();
      if (search)    params.set("search", search);
      if (hasUpline) params.set("hasUpline", hasUpline);
      params.set("limit", "50");
      const res = await adminFetch(`/api/admin/users-list?${params}`);
      if (res.ok) { const d = await res.json(); setUlList(d.users ?? []); setUlTotal(d.total ?? 0); }
    } finally { setUlLoading(false); }
  };

  const handleVwAction = async (id: number, action: "send" | "reject") => {
    const res = await adminFetch("/api/admin/withdrawal-send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ withdrawalId: id, action, sentTxHash: vwSentHash[id] || null }),
    });
    const d = await res.json();
    if (!res.ok) { toast(d.error ?? "Failed", "error"); return; }
    toast(action === "send" ? "Withdrawal marked as sent" : "Withdrawal rejected · balance refunded");
    fetchVirtualWithdrawals();
  };

  // searchedAzrBal removed — user data now shows virtual balance from DB

  // Load all data when admin is confirmed
  useEffect(() => {
    if (!isAdmin || !addr) return;
    adminFetch("/api/admin/settings").then(r => r.json()).then(d => { if (!d.error) setSettings(d); }).catch(() => {});
    fetchVirtualWithdrawals("-1");
    fetchBalanceAdjustments("", "", "");
    fetchUsersList("", "");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, addr]);

  if (!addr) {
    return (
      <>
        <AppTopbar title="Admin" sub="Admin-only controls" />
        <div className="p-4 md:p-8 flex items-center justify-center" style={{ minHeight: "50vh" }}>
          <p style={{ color: "var(--text-2)" }}>Connect your wallet to access this page.</p>
        </div>
      </>
    );
  }

  if (isAdmin === null) {
    return (
      <>
        <AppTopbar title="Admin" sub="Admin-only controls" />
        <div className="p-4 md:p-8 flex items-center justify-center" style={{ minHeight: "50vh" }}>
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "var(--teal)", borderTopColor: "transparent" }} />
            <p className="text-sm" style={{ color: "var(--text-2)" }}>Verifying admin access…</p>
          </div>
        </div>
      </>
    );
  }

  if (!isAdmin) {
    return (
      <>
        <AppTopbar title="Admin" sub="Admin-only controls" />
        <div className="p-4 md:p-8 flex flex-col items-center justify-center gap-4" style={{ minHeight: "50vh" }}>
          <svg className="w-12 h-12" style={{ color: "#ef4444" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="12" cy="12" r="9" /><path d="M15 9l-6 6M9 9l6 6" />
          </svg>
          <p className="font-semibold">Access Denied</p>
          <p className="text-sm" style={{ color: "var(--text-2)" }}>Your wallet is not authorized as an admin.</p>
          <p className="text-xs az-mono" style={{ color: "var(--muted)" }}>{addr}</p>
        </div>
      </>
    );
  }

  // Normalize large numbers: 1.23B, 456.7M, 12.3K
  const fmtNum = (n: number): string => {
    if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(2) + "B";
    if (n >= 1_000_000)     return (n / 1_000_000).toFixed(2) + "M";
    if (n >= 1_000)         return (n / 1_000).toFixed(2) + "K";
    return n.toFixed(4);
  };

  return (
    <>
      <AppTopbar title="Admin Panel" sub="Admin controls · custodial system" />
      <div className="p-4 md:p-8 max-w-app space-y-6">

        {/* User Data Lookup */}
        {/* Users List + Detail Lookup */}
        <AdminCard title="User Data Lookup">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs" style={{ color: "var(--muted)" }}>Search and paginate all registered users</p>
            <Link href={`/${locale}/app/admin/users`} className="text-xs az-mono font-semibold" style={{ color: "var(--teal)" }}>View all →</Link>
          </div>
          {/* Search & Filters */}
          <div className="flex flex-wrap gap-2 mb-3">
            <input className="az-input flex-1 min-w-[160px]" placeholder="Search wallet or username…"
              value={ulSearch} onChange={e => { setUlSearch(e.target.value); }}
              onKeyDown={e => e.key === "Enter" && fetchUsersList(ulSearch, ulHasUpline)} />
            <select className="rounded-ctl px-3 py-2 text-xs az-mono" style={{ background: "var(--bg-2)", border: "1px solid var(--line)", color: "var(--text-2)" }}
              value={ulHasUpline} onChange={e => { setUlHasUpline(e.target.value); fetchUsersList(ulSearch, e.target.value); }}>
              <option value="">All Users</option>
              <option value="yes">Has Upline</option>
              <option value="no">No Upline</option>
            </select>
            <button className="az-btn-primary px-4 text-sm" disabled={ulLoading} onClick={() => fetchUsersList(ulSearch, ulHasUpline)}>
              {ulLoading ? <Spinner size="sm" /> : "Search"}
            </button>
          </div>
          {/* Users Table */}
          {ulList.length > 0 && (
            <div className="overflow-x-auto mb-4">
              <p className="text-[11px] az-mono mb-2" style={{ color: "var(--muted)" }}>Showing {Math.min(ulCardPage * 10, ulList.length)} of {ulTotal} users</p>
              <table className="w-full text-xs">
                <thead><tr className="az-mono text-[11px] uppercase" style={{ color: "var(--muted)" }}>
                  <th className="text-left pb-2 font-normal">#</th>
                  <th className="text-left pb-2 font-normal">Username</th>
                  <th className="text-left pb-2 font-normal">Wallet</th>
                  <th className="text-left pb-2 font-normal">USDT</th>
                  <th className="text-left pb-2 font-normal">AZR</th>
                  <th className="text-left pb-2 font-normal">Upline</th>
                  <th className="text-left pb-2 font-normal">Stakes</th>
                  <th className="text-left pb-2 font-normal">Action</th>
                </tr></thead>
                <tbody className="divide-y" style={{ borderColor: "var(--line)" }}>
                  {ulList.slice((ulCardPage - 1) * 10, ulCardPage * 10).map((u: {seqId: number; username: string; walletAddress: string; userBalance: {usdtBalance: number; azrBalance: number} | null; referredByUser: {username: string; seqId: number} | null; _count: {virtualStakes: number; referrals: number}; createdAt: string}) => (
                    <tr key={u.seqId}>
                      <td className="py-1.5 az-mono" style={{ color: "var(--muted)" }}>#{u.seqId}</td>
                      <td className="py-1.5 az-mono font-semibold" style={{ color: "var(--teal)" }}>{u.username}.azr</td>
                      <td className="py-1.5 az-mono" style={{ color: "var(--muted)" }}>{u.walletAddress.slice(0,8)}…{u.walletAddress.slice(-4)}</td>
                      <td className="py-1.5 az-mono">{(u.userBalance?.usdtBalance ?? 0).toFixed(2)}</td>
                      <td className="py-1.5 az-mono">{(u.userBalance?.azrBalance ?? 0).toFixed(2)}</td>
                      <td className="py-1.5" style={{ color: "var(--muted)" }}>{u.referredByUser ? `${u.referredByUser.username} (#${u.referredByUser.seqId})` : "—"}</td>
                      <td className="py-1.5 az-mono">{u._count.virtualStakes}</td>
                      <td className="py-1.5">
                        <button className="text-[11px] px-2 py-0.5 rounded-ctl" style={{ background: "rgba(45,212,191,0.1)", color: "var(--teal)" }}
                          onClick={() => { setUserQuery(u.walletAddress); setUserQueryLoading(true); adminFetch(`/api/admin/user-data?query=${u.walletAddress}`).then(r => r.json()).then(d => { setUserResult(d); setStakeDetailPage(1); setClaimDetailPage(1); }).finally(() => setUserQueryLoading(false)); }}>
                          Detail
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {ulList.length > 0 && (
            <AdminPaginator page={ulCardPage} totalPages={Math.max(1, Math.ceil(ulList.length / 10))} total={ulList.length} pageSize={10}
              onFirst={() => setUlCardPage(1)} onPrev={() => setUlCardPage(p => p-1)} onNext={() => setUlCardPage(p => p+1)} onLast={() => setUlCardPage(Math.max(1, Math.ceil(ulList.length / 10)))} />
          )}
          {/* Detail Lookup */}
          <div style={{ borderTop: ulList.length > 0 ? "1px solid var(--line)" : undefined, paddingTop: ulList.length > 0 ? "1rem" : undefined }}>
            <p className="text-xs mb-2" style={{ color: "var(--muted)" }}>User Detail — search by exact wallet or username:</p>
            <div className="flex gap-2 mb-4">
              <input className="az-input flex-1" placeholder="0x... or username"
                value={userQuery} onChange={e => setUserQuery(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && userQuery) { setUserQueryLoading(true); adminFetch(`/api/admin/user-data?query=${encodeURIComponent(userQuery)}`).then(r => r.json()).then(d => { setUserResult(d); setStakeDetailPage(1); setClaimDetailPage(1); }).finally(() => setUserQueryLoading(false)); } }}
              />
              <button className="az-btn-primary px-4" disabled={userQueryLoading || !userQuery}
                onClick={() => { setUserQueryLoading(true); adminFetch(`/api/admin/user-data?query=${encodeURIComponent(userQuery)}`).then(r => r.json()).then(d => { setUserResult(d); setStakeDetailPage(1); setClaimDetailPage(1); }).finally(() => setUserQueryLoading(false)); }}>
                {userQueryLoading ? <Spinner size="sm" /> : "Lookup"}
              </button>
            </div>
          </div>
          {userResult?.error && <p className="text-sm" style={{ color: "#ef4444" }}>{userResult.error}</p>}
          {userResult?.user && (() => {
            const u = userResult.user;
            const sectionHead = (label: string) => (
              <div className="text-[11px] az-mono uppercase tracking-wider mt-4 mb-2 pb-1" style={{ color: "var(--muted)", borderBottom: "1px solid var(--line)" }}>{label}</div>
            );
            const row = (label: string, value: React.ReactNode) => (
              <div className="flex justify-between text-xs py-1">
                <span style={{ color: "var(--text-2)" }}>{label}</span>
                <span className="az-mono font-semibold text-right ml-4" style={{ maxWidth: "60%" }}>{value}</span>
              </div>
            );
            return (
              <div className="rounded-ctl p-4" style={{ background: "var(--bg-2)" }}>
                {/* Delete Account */}
                <div className="mb-3">
                  {!deleteConfirm ? (
                    <button
                      className="text-xs px-3 py-1.5 rounded-ctl font-semibold"
                      style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.25)" }}
                      onClick={() => setDeleteConfirm(true)}
                    >
                      Delete Account
                    </button>
                  ) : (
                    <div className="rounded-ctl px-3 py-2 text-xs" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)" }}>
                      <p className="mb-2" style={{ color: "#ef4444" }}>This will permanently delete <strong>{u.username}.azr</strong> and ALL their data. This cannot be undone.</p>
                      <div className="flex gap-2">
                        <button
                          className="px-3 py-1 rounded-ctl text-xs font-semibold"
                          style={{ background: "#ef4444", color: "#fff" }}
                          disabled={deleting}
                          onClick={async () => {
                            setDeleting(true);
                            try {
                              const res = await adminFetch("/api/admin/delete-user", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: u.id }) });
                              const d = await res.json();
                              if (!res.ok) { toast(d.error ?? "Delete failed", "error"); return; }
                              toast(`Deleted ${d.deleted}.azr`);
                              setUserResult(null);
                              setUserQuery("");
                              setDeleteConfirm(false);
                            } catch { toast("Network error", "error"); }
                            finally { setDeleting(false); }
                          }}
                        >
                          {deleting ? "Deleting…" : "Confirm Delete"}
                        </button>
                        <button className="px-3 py-1 rounded-ctl text-xs" style={{ color: "var(--muted)" }} onClick={() => setDeleteConfirm(false)}>Cancel</button>
                      </div>
                    </div>
                  )}
                </div>
                {sectionHead("Identity")}
                {row("User #", `#${u.seqId}`)}
                {row("Username", `${u.username}.azr`)}
                {row("Wallet", <span className="break-all">{u.walletAddress}</span>)}
                {row("Joined", new Date(u.createdAt).toLocaleString())}
                {row("Virtual USDT Balance", <span style={{ color: "var(--teal)" }}>{(u.userBalance?.usdtBalance ?? 0).toFixed(4)} USDT</span>)}
                {row("Virtual AZR Balance",  <span style={{ color: "var(--teal)" }}>{(u.userBalance?.azrBalance  ?? 0).toFixed(4)} AZR</span>)}
                {row("Total Active Staked",   <span style={{ color: "var(--teal)" }}>{userResult.totalStaked?.toFixed(4) ?? "0.0000"} AZR</span>)}
                {row("Total Deposited",       <span style={{ color: "var(--teal)" }}>{userResult.totalDeposited?.toFixed(4) ?? "0.0000"} USDT</span>)}
                {row("Total Commissions",     <span style={{ color: "var(--teal)" }}>{userResult.totalCommissions?.toFixed(4) ?? "0.0000"} AZR</span>)}
                {row("Total Claims",          <span style={{ color: "var(--teal)" }}>{userResult.totalClaims?.toFixed(4) ?? "0.0000"} AZR</span>)}

                {sectionHead("Referral Network")}
                {row("Upline (Referrer)", u.referredByUser ? `${u.referredByUser.username}.azr (#${u.referredByUser.seqId})` : "None")}
                {row("Downlines (L1)", u.referrals?.length ? u.referrals.map((r: {username: string; seqId: number}) => `${r.username}.azr (#${r.seqId})`).join(", ") : "None")}

                {sectionHead(`Virtual Stakes (${u.virtualStakes?.length ?? 0} total · ${userResult.totalStaked?.toFixed(4)} AZR active)`)}
                {u.virtualStakes?.length ? (
                  <>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs mt-1">
                        <thead><tr style={{ color: "var(--muted)" }}><th className="text-left pb-1 font-normal">Amount</th><th className="text-left pb-1 font-normal">Unlocks</th><th className="text-left pb-1 font-normal">Status</th><th className="pb-1 font-normal"></th></tr></thead>
                        <tbody>{u.virtualStakes.slice((stakeDetailPage - 1) * 10, stakeDetailPage * 10).map((s: {id: number; amount: number; startTime: string; unlockTime: string; isActive: boolean}) => (
                          <tr key={s.id}>
                            <td className="py-0.5 az-mono">{s.amount.toFixed(4)} AZR</td>
                            <td className="py-0.5" style={{ color: "var(--text-2)" }}>{new Date(s.unlockTime).toLocaleDateString()}</td>
                            <td className="py-0.5"><span style={{ color: s.isActive ? "var(--teal)" : "var(--muted)" }}>{s.isActive ? "Active" : "Ended"}</span></td>
                            <td className="py-0.5 text-right">
                              {s.isActive && (
                                <button
                                  className="px-2 py-0.5 rounded text-[10px] font-semibold"
                                  style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444" }}
                                  disabled={unstaking === s.id}
                                  onClick={async () => {
                                    setUnstaking(s.id);
                                    try {
                                      const res = await adminFetch("/api/admin/admin-unstake", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ stakeId: s.id }) });
                                      const d = await res.json();
                                      if (!res.ok) { toast(d.error ?? "Unstake failed", "error"); return; }
                                      toast(`Unstaked · ${d.total.toFixed(4)} AZR returned to balance`);
                                      setUserQueryLoading(true);
                                      adminFetch(`/api/admin/user-data?query=${encodeURIComponent(u.walletAddress)}`).then(r => r.json()).then(d2 => { setUserResult(d2); setStakeDetailPage(1); }).finally(() => setUserQueryLoading(false));
                                    } catch { toast("Network error", "error"); }
                                    finally { setUnstaking(null); }
                                  }}
                                >
                                  {unstaking === s.id ? "…" : "Unstake"}
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}</tbody>
                      </table>
                    </div>
                    {u.virtualStakes.length > 10 && (
                      <AdminPaginator page={stakeDetailPage} totalPages={Math.max(1, Math.ceil(u.virtualStakes.length / 10))} total={u.virtualStakes.length} pageSize={10}
                        onFirst={() => setStakeDetailPage(1)} onPrev={() => setStakeDetailPage(p => p - 1)} onNext={() => setStakeDetailPage(p => p + 1)} onLast={() => setStakeDetailPage(Math.max(1, Math.ceil(u.virtualStakes.length / 10)))} />
                    )}
                  </>
                ) : <p className="text-xs" style={{ color: "var(--muted)" }}>No virtual stakes</p>}

                {sectionHead(`Claim History (${userResult.claimHistory?.length ?? 0})`)}
                {userResult.claimHistory?.length ? (
                  <>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs mt-1">
                        <thead><tr style={{ color: "var(--muted)" }}><th className="text-left pb-1 font-normal">Date</th><th className="text-right pb-1 font-normal">Amount</th></tr></thead>
                        <tbody>{userResult.claimHistory.slice((claimDetailPage - 1) * 10, claimDetailPage * 10).map((c: {id: number; amount: string; claimedAt: string}) => (
                          <tr key={c.id}><td className="py-0.5" style={{ color: "var(--text-2)" }}>{new Date(c.claimedAt).toLocaleString()}</td><td className="py-0.5 az-mono text-right" style={{ color: "var(--teal)" }}>+{(parseFloat(c.amount) / 1e18).toFixed(4)} AZR</td></tr>
                        ))}</tbody>
                      </table>
                    </div>
                    {userResult.claimHistory.length > 10 && (
                      <AdminPaginator page={claimDetailPage} totalPages={Math.max(1, Math.ceil(userResult.claimHistory.length / 10))} total={userResult.claimHistory.length} pageSize={10}
                        onFirst={() => setClaimDetailPage(1)} onPrev={() => setClaimDetailPage(p => p - 1)} onNext={() => setClaimDetailPage(p => p + 1)} onLast={() => setClaimDetailPage(Math.max(1, Math.ceil(userResult.claimHistory.length / 10)))} />
                    )}
                  </>
                ) : <p className="text-xs" style={{ color: "var(--muted)" }}>No claims</p>}

                {sectionHead(`Withdrawals (${u.withdrawals?.length ?? 0})`)}
                {u.withdrawals?.length ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs mt-1">
                      <thead><tr style={{ color: "var(--muted)" }}><th className="text-left pb-1 font-normal">Date</th><th className="text-left pb-1 font-normal">Asset</th><th className="text-right pb-1 font-normal">Amount</th><th className="text-left pb-1 font-normal pl-3">Status</th></tr></thead>
                      <tbody>{u.withdrawals.map((w: {id: string; amount: string; assetType: number; status: number; createdAt: string}) => (
                        <tr key={w.id}><td className="py-0.5" style={{ color: "var(--text-2)" }}>{new Date(w.createdAt).toLocaleDateString()}</td><td className="py-0.5 az-mono">{w.assetType === 0 ? "AZR" : "USDT"}</td><td className="py-0.5 az-mono text-right">{(parseFloat(w.amount) / 1e18).toFixed(4)}</td><td className="py-0.5 pl-3" style={{ color: w.status === 0 ? "var(--warn)" : w.status === 1 ? "var(--teal)" : "#ef4444" }}>{["Pending","Approved","Rejected"][w.status]}</td></tr>
                      ))}</tbody>
                    </table>
                  </div>
                ) : <p className="text-xs" style={{ color: "var(--muted)" }}>No withdrawals</p>}

                {sectionHead(`Referral Commissions (${u.referralEarnings?.length ?? 0} · ${userResult.totalCommissions?.toFixed(4)} AZR total)`)}
                {u.referralEarnings?.length ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs mt-1">
                      <thead><tr style={{ color: "var(--muted)" }}><th className="text-left pb-1 font-normal">Date</th><th className="text-left pb-1 font-normal">Level</th><th className="text-left pb-1 font-normal">From</th><th className="text-right pb-1 font-normal">Amount</th></tr></thead>
                      <tbody>{u.referralEarnings.map((e: {id: string; level: number; fromUser: string; amount: string; createdAt: string}) => (
                        <tr key={e.id}><td className="py-0.5" style={{ color: "var(--text-2)" }}>{new Date(e.createdAt).toLocaleDateString()}</td><td className="py-0.5 az-mono">L{e.level}</td><td className="py-0.5 az-mono">{e.fromUser.slice(0,6)}…{e.fromUser.slice(-4)}</td><td className="py-0.5 az-mono text-right" style={{ color: "var(--teal)" }}>+{(parseFloat(e.amount) / 1e18).toFixed(4)}</td></tr>
                      ))}</tbody>
                    </table>
                  </div>
                ) : <p className="text-xs" style={{ color: "var(--muted)" }}>No commissions</p>}
              </div>
            );
          })()}
        </AdminCard>

        {/* Stats overview — all values from DB except AZR Contract Pool (on-chain) */}
        <div className="az-card-glow">
          <h3 className="font-semibold mb-4 text-sm">Platform Overview</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 xl:grid-cols-8 gap-3">
            {[
              { label: "Total Stakes 🗄",    value: dbStats ? fmtNum(dbStats.totalActiveStaked) : "…",   unit: "AZR",      color: "var(--teal)" },
              { label: "Total Users 🗄",     value: dbStats ? String(dbStats.userCount) : "…",            unit: "",         color: "var(--text)" },
              { label: "Referral Paid 🗄",   value: dbStats ? fmtNum(parseFloat(dbStats.referralTotal)) : "…", unit: "AZR", color: "var(--text)" },
              { label: "Pending W/D 🗄",     value: String(vwList.filter(w => w.status === 0).length),    unit: "requests", color: vwList.filter(w => w.status === 0).length > 0 ? "var(--warn)" : "var(--text)" },
              { label: "Daily Rate 🗄",      value: settings ? `${settings.dailyRewardPct}%` : "…",       unit: "/ day",    color: "var(--teal)" },
              { label: "Ref Rates 🗄",       value: settings ? `${settings.referralRateL1}/${settings.referralRateL2}/${settings.referralRateL3}%` : "…", unit: "L1/L2/L3", color: "var(--text)" },
              { label: "Accounts USDT 🗄",  value: dbStats ? fmtNum(dbStats.totalUsdtBalance) : "…",     unit: "USDT",     color: "var(--teal)" },
              { label: "Accounts AZR 🗄",   value: dbStats ? fmtNum(dbStats.totalAzrBalance) : "…",      unit: "AZR",      color: "var(--teal)" },
            ].map((s) => (
              <div key={s.label} className="rounded-ctl px-3 py-3 text-center" style={{ background: "var(--bg-2)" }}>
                <div className="text-[10px] az-mono mb-1" style={{ color: "var(--muted)" }}>{s.label}</div>
                <div className="font-bold az-mono text-sm" style={{ color: s.color }}>{s.value}</div>
                {s.unit && <div className="text-[10px] az-mono mt-0.5" style={{ color: "var(--muted)" }}>{s.unit}</div>}
              </div>
            ))}
          </div>
          {settings && (
            <div className="mt-3 text-[11px] az-mono" style={{ color: "var(--muted)" }}>
              Min stake: {settings.minStakeAzr} AZR · Lock: {settings.lockDays} days · Fee: {settings.withdrawalFeePct}% · L1: {settings.referralRateL1}% · L2: {settings.referralRateL2}% · L3: {settings.referralRateL3}%
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Lock period */}
          {/* Removed: Lock Period, Min Stake, Withdrawal Fee, Referral Rates, Deposit Liquidity */}
          {/* All are now managed via Platform Settings card below */}

          {/* Adjust User Balance (custodial — replaces old credit/debit) */}
          <AdminCard title="Adjust User Balance (Custodial)">
            <p className="text-xs mb-3" style={{ color: "var(--muted)" }}>
              Credit or debit a user&apos;s virtual USDT or AZR balance directly in the database. No on-chain transaction needed.
            </p>
            <div className="space-y-3">
              <div>
                <label className="text-[11px] az-mono mb-1 block" style={{ color: "var(--muted)" }}>Wallet Address</label>
                <div className="flex gap-2">
                  <input className="az-input flex-1" placeholder="0x..." value={adjWallet} onChange={(e) => { setAdjWallet(e.target.value); setAdjBal(null); }} />
                  <button
                    className="px-3 rounded-ctl text-xs font-semibold"
                    style={{ background: "rgba(45,212,191,0.1)", color: "var(--teal)" }}
                    disabled={!isAddress(adjWallet)}
                    onClick={async () => {
                      const res = await adminFetch(`/api/admin/adjust-balance?wallet=${adjWallet}`);
                      const d = await res.json();
                      setAdjBal(d);
                    }}
                  >Check</button>
                </div>
                {adjBal && (
                  <p className="text-[11px] az-mono mt-1" style={{ color: "var(--teal)" }}>
                    {adjBal.username && <span>{adjBal.username}.azr · </span>}
                    USDT: <strong>{adjBal.usdtBalance.toFixed(4)}</strong> · AZR: <strong>{adjBal.azrBalance.toFixed(4)}</strong>
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                {(["usdt", "azr"] as const).map((a) => (
                  <button key={a} onClick={() => setAdjAsset(a)}
                    className="flex-1 py-2 rounded-ctl border text-xs font-semibold uppercase"
                    style={{ borderColor: adjAsset === a ? "var(--teal)" : "var(--line)", background: adjAsset === a ? "rgba(45,212,191,0.08)" : "var(--bg-2)", color: adjAsset === a ? "var(--teal)" : "var(--text-2)" }}>
                    {a}
                  </button>
                ))}
              </div>
              <div>
                <label className="text-[11px] az-mono mb-1 block" style={{ color: "var(--muted)" }}>Amount ({adjAsset.toUpperCase()})</label>
                <input className="az-input" placeholder="0.00" type="number" value={adjAmount} onChange={(e) => setAdjAmount(e.target.value)} />
              </div>
              <div className="flex gap-2">
                <button
                  className="az-btn-primary flex-1"
                  disabled={adjLoading || !adjAmount || !isAddress(adjWallet)}
                  onClick={async () => {
                    setAdjLoading(true);
                    try {
                      const res = await adminFetch("/api/admin/adjust-balance", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ wallet: adjWallet, asset: adjAsset, amount: adjAmount, action: "credit" }) });
                      const d = await res.json();
                      if (!res.ok) { toast(d.error ?? "Failed", "error"); }
                      else { toast(`Credited ${adjAmount} ${adjAsset.toUpperCase()}`); setAdjBal(d); setAdjAmount(""); }
                    } catch { toast("Network error", "error"); }
                    finally { setAdjLoading(false); }
                  }}
                >{adjLoading ? <Spinner size="sm" /> : `Credit +`}</button>
                <button
                  className="az-btn-primary flex-1"
                  style={{ background: "rgba(239,68,68,0.15)", borderColor: "#ef4444", color: "#ef4444" }}
                  disabled={adjLoading || !adjAmount || !isAddress(adjWallet)}
                  onClick={async () => {
                    setAdjLoading(true);
                    try {
                      const res = await adminFetch("/api/admin/adjust-balance", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ wallet: adjWallet, asset: adjAsset, amount: adjAmount, action: "debit" }) });
                      const d = await res.json();
                      if (!res.ok) { toast(d.error ?? "Failed", "error"); }
                      else { toast(`Debited ${adjAmount} ${adjAsset.toUpperCase()}`); setAdjBal(d); setAdjAmount(""); }
                    } catch { toast("Network error", "error"); }
                    finally { setAdjLoading(false); }
                  }}
                >{adjLoading ? <Spinner size="sm" /> : `Debit −`}</button>
              </div>
            </div>
          </AdminCard>

          {/* Treasury Wallet */}
          <AdminCard title="Treasury Wallet">
            <p className="text-xs mb-4" style={{ color: "var(--muted)" }}>
              The BSC wallet address users send USDT deposits to. Changing this takes effect immediately for all new deposits.
            </p>
            {/* Current wallet display */}
            <div className="mb-4">
              <label className="text-[11px] az-mono mb-1 block" style={{ color: "var(--muted)" }}>Current Treasury Wallet</label>
              <div className="flex gap-2 items-center">
                <div className="flex-1 rounded-ctl px-3 py-2.5 text-sm az-mono break-all"
                  style={{ background: "var(--bg-2)", border: "1px solid var(--line)", color: "var(--teal)" }}>
                  {settings?.treasuryWallet || process.env.NEXT_PUBLIC_TREASURY_WALLET || "Not configured"}
                </div>
                <button
                  className="px-3 py-2.5 rounded-ctl text-xs font-semibold flex-shrink-0"
                  style={{ background: "rgba(45,212,191,0.1)", color: "var(--teal)" }}
                  onClick={() => {
                    const w = settings?.treasuryWallet || "";
                    if (w) { navigator.clipboard.writeText(w); toast("Copied!"); }
                  }}
                >Copy</button>
              </div>
            </div>
            {/* Change wallet */}
            <div className="space-y-3">
              <div>
                <label className="text-[11px] az-mono mb-1 block" style={{ color: "var(--muted)" }}>New Treasury Wallet Address (BEP-20 / BSC)</label>
                <input
                  className="az-input"
                  placeholder="0x..."
                  value={newTreasuryWallet}
                  onChange={(e) => setNewTreasuryWallet(e.target.value)}
                />
                {newTreasuryWallet && !newTreasuryWallet.startsWith("0x") && (
                  <p className="text-[10px] mt-0.5" style={{ color: "#ef4444" }}>Must start with 0x</p>
                )}
                {newTreasuryWallet && newTreasuryWallet.length !== 42 && newTreasuryWallet.startsWith("0x") && (
                  <p className="text-[10px] mt-0.5" style={{ color: "#ef4444" }}>Must be 42 characters (0x + 40 hex)</p>
                )}
                {newTreasuryWallet && newTreasuryWallet.length === 42 && newTreasuryWallet.startsWith("0x") && (
                  <p className="text-[10px] mt-0.5" style={{ color: "var(--teal)" }}>✓ Valid BSC address format</p>
                )}
              </div>
              <button
                className="az-btn-primary w-full"
                style={{ background: "rgba(239,68,68,0.15)", borderColor: "#ef4444", color: "#ef4444" }}
                disabled={treasuryLoading || !newTreasuryWallet || newTreasuryWallet.length !== 42 || !newTreasuryWallet.startsWith("0x")}
                onClick={async () => {
                  setTreasuryLoading(true);
                  try {
                    const res = await adminFetch("/api/admin/settings", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ treasuryWallet: newTreasuryWallet }),
                    });
                    const d = await res.json();
                    if (!res.ok) { toast(d.error ?? "Failed", "error"); }
                    else {
                      toast("Treasury wallet updated — new deposits will verify against this address");
                      if (d.settings) setSettings(d.settings);
                      setNewTreasuryWallet("");
                    }
                  } catch { toast("Network error", "error"); }
                  finally { setTreasuryLoading(false); }
                }}
              >{treasuryLoading ? <span className="flex items-center justify-center gap-2"><Spinner size="sm" /> Saving…</span> : "Update Treasury Wallet"}</button>
              <div className="rounded-ctl px-3 py-2 text-[11px] az-mono" style={{ background: "rgba(243,186,47,0.06)", color: "#f3ba2f", border: "1px solid rgba(243,186,47,0.2)" }}>
                ⚠ Only change this if you are moving to a new treasury wallet. Users must send USDT to the new address for deposits to be credited.
              </div>
            </div>
          </AdminCard>

          {/* Platform Settings */}
          <AdminCard title="Platform Settings">
            <p className="text-xs mb-4" style={{ color: "var(--muted)" }}>
              Configure virtual staking parameters. Changes apply to all new stakes and withdrawals immediately.
            </p>
            {settings ? (
              <div className="space-y-3">
                {[
                  { label: "Min Stake (AZR)", key: "minStakeAzr" as const, hint: "Minimum AZR to open a stake" },
                  { label: "Lock Period (days)", key: "lockDays" as const, hint: "Days until a stake can be withdrawn" },
                  { label: "Daily Reward Rate (%)", key: "dailyRewardPct" as const, hint: "e.g. 0.7 = 0.7%/day" },
                  { label: "Min Withdrawal (AZR/USDT)", key: "minWithdrawal" as const, hint: "Set 0 to disable minimum" },
                  { label: "Withdrawal Fee (%)", key: "withdrawalFeePct" as const, hint: "e.g. 2 = 2% deducted from withdrawal" },
                  { label: "Referral Commission L1 (%)", key: "referralRateL1" as const, hint: "Direct referrer gets X% of stake" },
                  { label: "Referral Commission L2 (%)", key: "referralRateL2" as const, hint: "2nd level referrer gets X% of stake" },
                  { label: "Referral Commission L3 (%)", key: "referralRateL3" as const, hint: "3rd level referrer gets X% of stake" },
                ].map(({ label, key, hint }) => (
                  <div key={key}>
                    <label className="text-[11px] az-mono mb-1 block" style={{ color: "var(--muted)" }}>{label}</label>
                    <input
                      className="az-input"
                      type="number"
                      step="any"
                      value={settings[key]}
                      onChange={(e) => setSettings((p) => p ? { ...p, [key]: parseFloat(e.target.value) || 0 } : p)}
                    />
                    <p className="text-[10px] mt-0.5" style={{ color: "var(--muted)" }}>{hint}</p>
                  </div>
                ))}
                <button
                  className="az-btn-primary w-full"
                  disabled={settingsLoading}
                  onClick={async () => {
                    setSettingsLoading(true);
                    try {
                      const res = await adminFetch("/api/admin/settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(settings) });
                      const d = await res.json();
                      if (!res.ok) { toast(d.error ?? "Failed", "error"); }
                      else { toast("Settings saved — applies to new stakes and withdrawals"); if (d.settings) setSettings(d.settings); }
                    } catch { toast("Network error", "error"); }
                    finally { setSettingsLoading(false); }
                  }}
                >{settingsLoading ? <span className="flex items-center justify-center gap-2"><Spinner size="sm" /> Saving…</span> : "Save Settings"}</button>
              </div>
            ) : (
              <p className="text-xs" style={{ color: "var(--muted)" }}>Loading settings…</p>
            )}
          </AdminCard>

          {/* Withdrawal request controls */}
          {/* On-chain withdrawal requests removed — use Virtual Withdrawal Queue below */}

          {/* Seed referral relationship in DB */}
          {/* Admin Wallets Management */}
          <AdminCard title="Admin Wallets">
            <p className="text-xs mb-4" style={{ color: "var(--muted)" }}>
              Manage wallets that have admin access. Only active admins can add or remove wallets. You cannot remove your own wallet.
            </p>
            <div className="flex gap-2 mb-4">
              <input className="az-input flex-1 h-8 text-sm" placeholder="Filter by wallet or label…"
                id="aw-search" />
              <button className="az-btn-primary text-xs px-3 py-1.5" onClick={() => { fetchAdminWallets(); }} disabled={adminWalletsLoading}>
                {adminWalletsLoading ? <Spinner size="sm" /> : "Refresh"}
              </button>
            </div>
            {adminWallets.length > 0 && (
              <div className="space-y-2 mb-4">
                {adminWallets.map((w) => (
                  <div key={w.id} className="flex items-center justify-between rounded-ctl px-3 py-2 text-xs" style={{ background: "var(--bg-2)", border: `1px solid ${w.isActive ? "var(--line)" : "rgba(239,68,68,0.2)"}` }}>
                    <div>
                      <div className="az-mono font-semibold" style={{ color: w.isActive ? "var(--teal)" : "#ef4444" }}>
                        {w.walletAddress.slice(0,10)}…{w.walletAddress.slice(-6)} {!w.isActive && "(inactive)"}
                      </div>
                      {w.label && <div style={{ color: "var(--muted)" }}>{w.label}</div>}
                      <div style={{ color: "var(--muted)" }}>Added {new Date(w.addedAt).toLocaleDateString()}</div>
                    </div>
                    {w.isActive && w.walletAddress.toLowerCase() !== addr?.toLowerCase() && (
                      <button
                        className="text-xs px-2 py-1 rounded-ctl"
                        style={{ color: "#ef4444", border: "1px solid rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.06)" }}
                        onClick={async () => {
                          if (!confirm(`Remove admin access for ${w.walletAddress}?`)) return;
                          const res = await adminFetch("/api/admin/wallets", {
                            method: "DELETE",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ walletAddress: w.walletAddress }),
                          });
                          const d = await res.json();
                          if (!res.ok) { toast(d.error ?? "Failed", "error"); }
                          else { toast("Admin wallet removed"); fetchAdminWallets(); }
                        }}
                      >Remove</button>
                    )}
                  </div>
                ))}
              </div>
            )}
            <div className="space-y-2 pt-3" style={{ borderTop: "1px solid var(--line)" }}>
              <p className="text-[11px] az-mono" style={{ color: "var(--muted)" }}>Add new admin wallet</p>
              <input className="az-input" placeholder="0x... wallet address" value={newAdminWallet} onChange={e => setNewAdminWallet(e.target.value)} />
              <input className="az-input" placeholder="Label (e.g. Support Team)" value={newAdminLabel} onChange={e => setNewAdminLabel(e.target.value)} />
              <button
                className="az-btn-primary w-full text-sm"
                disabled={!newAdminWallet || !isAddress(newAdminWallet)}
                onClick={async () => {
                  const res = await adminFetch("/api/admin/wallets", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ walletAddress: newAdminWallet, label: newAdminLabel }),
                  });
                  const d = await res.json();
                  if (!res.ok) { toast(d.error ?? "Failed", "error"); }
                  else { toast(`Admin wallet added`); setNewAdminWallet(""); setNewAdminLabel(""); fetchAdminWallets(); }
                }}
              >Add Admin Wallet</button>
            </div>
          </AdminCard>

          <AdminCard title="Link / Change User Upline">
            <p className="text-xs mb-3" style={{ color: "var(--muted)" }}>
              Links a user to their referrer, or reassigns an existing upline. If the user has never visited the app, fill in their username too — the profile will be created automatically.
            </p>
            <div className="space-y-3">
              <div>
                <label className="text-[11px] az-mono mb-1 block" style={{ color: "var(--muted)" }}>Referred User Wallet Address</label>
                <input className="az-input" placeholder="0x..." value={seedWallet} onChange={(e) => setSeedWallet(e.target.value)} />
              </div>
              <div>
                <label className="text-[11px] az-mono mb-1 block" style={{ color: "var(--muted)" }}>Referred User Username (only needed if not yet in DB)</label>
                <input className="az-input" placeholder="leadermalang2" value={seedUsername} onChange={(e) => setSeedUsername(e.target.value)} />
              </div>
              <div>
                <label className="text-[11px] az-mono mb-1 block" style={{ color: "var(--muted)" }}>Referrer Username</label>
                <input className="az-input" placeholder="leadermalang" value={seedReferrer} onChange={(e) => setSeedReferrer(e.target.value)} />
              </div>
              <button
                className="az-btn-primary w-full"
                disabled={seedLoading || !seedWallet || !seedReferrer}
                onClick={async () => {
                  setSeedLoading(true);
                  try {
                    const res = await adminFetch("/api/admin/seed-referral", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ walletAddress: seedWallet, referrerUsername: seedReferrer, referredUsername: seedUsername || undefined }),
                    });
                    const data = await res.json();
                    if (!res.ok) { toast(data.error ?? "Failed", "error"); }
                    else { toast(`Linked ${data.updated?.username} → ${seedReferrer}`); setSeedWallet(""); setSeedReferrer(""); setSeedUsername(""); }
                  } catch { toast("Network error", "error"); }
                  finally { setSeedLoading(false); }
                }}
              >{seedLoading ? <span className="flex items-center justify-center gap-2"><Spinner size="sm" /> Linking…</span> : "Link Referral"}</button>
            </div>
          </AdminCard>

          {/* Planned Features removed — all now implemented in custodial system */}

        </div>

        {/* DB Migrations — run ALTER TABLE without phpPgAdmin */}
        <AdminCard title="DB Migrations">
          <p className="text-xs mb-3" style={{ color: "var(--muted)" }}>
            Applies missing schema columns to cPanel&apos;s PostgreSQL without needing phpPgAdmin.
            Safe to run multiple times — all statements use <code className="text-[11px]">IF NOT EXISTS</code>.
          </p>
          {migrationResult && (
            <div className="rounded-ctl p-3 mb-3 text-xs space-y-1" style={{ background: "var(--bg-2)" }}>
              {migrationResult.results.map((r) => (
                <div key={r.id} className="flex items-start gap-2">
                  <span className="flex-shrink-0" style={{ color: r.status === "ok" ? "var(--teal)" : "#ef4444" }}>
                    {r.status === "ok" ? "✓" : "✗"}
                  </span>
                  <span className="az-mono">{r.id}</span>
                  {r.message && <span style={{ color: "#ef4444" }}>{r.message}</span>}
                </div>
              ))}
              <p className="mt-2" style={{ color: migrationResult.ok ? "var(--teal)" : "#ef4444" }}>
                {migrationResult.ok ? "All migrations applied successfully." : "Some migrations failed — check errors above."}
              </p>
            </div>
          )}
          <button
            className="az-btn-primary w-full"
            disabled={migrationLoading}
            onClick={async () => {
              setMigrationLoading(true);
              setMigrationResult(null);
              try {
                const res = await adminFetch("/api/admin/run-migrations", { method: "POST" });
                setMigrationResult(await res.json());
              } catch {
                setMigrationResult({ ok: false, results: [{ id: "network", status: "error", message: "Network error — could not reach server" }] });
              } finally {
                setMigrationLoading(false);
              }
            }}
          >
            {migrationLoading
              ? <span className="flex items-center justify-center gap-2"><Spinner size="sm" /> Running…</span>
              : "Run Migrations"}
          </button>
        </AdminCard>

        {/* DB Sync — Neon ↔ Local PostgreSQL */}
        <AdminCard title="Database Sync (Neon → Local PostgreSQL)">
          <p className="text-xs mb-4" style={{ color: "var(--muted)" }}>
            Sync all users, balances, stakes, deposits and earnings from Neon (Vercel) into the local cPanel PostgreSQL.
            Requires <code className="text-[11px]">NEON_DATABASE_URL</code> environment variable to be set on cPanel.
          </p>
          <button
            className="az-btn-primary text-xs px-3 py-1.5 mb-4"
            disabled={syncLoading}
            onClick={async () => {
              setSyncLoading(true);
              try {
                const res = await adminFetch("/api/admin/sync-neon");
                if (res.ok) setSyncCounts(await res.json());
              } finally { setSyncLoading(false); }
            }}
          >{syncLoading ? <span className="flex items-center gap-2"><Spinner size="sm" /> Loading…</span> : "Refresh Counts"}</button>

          {syncCounts && (
            <div className="rounded-ctl p-3 mb-4 text-xs" style={{ background: "var(--bg-2)" }}>
              {!syncCounts.hasNeonUrl && (
                <p className="mb-2" style={{ color: "#f3ba2f" }}>⚠ NEON_DATABASE_URL not set — Neon counts unavailable. Only local counts shown.</p>
              )}
              {syncCounts.neonError && (
                <p className="mb-2" style={{ color: "#ef4444" }}>Neon error: {syncCounts.neonError}</p>
              )}
              <table className="w-full">
                <thead><tr className="az-mono text-[11px]" style={{ color: "var(--muted)" }}><th className="text-left pb-1 font-normal">Table</th><th className="text-right pb-1 font-normal">Local</th><th className="text-right pb-1 font-normal">Neon</th></tr></thead>
                <tbody className="divide-y" style={{ borderColor: "var(--line)" }}>
                  {["users","deposits","virtualStakes","virtualWithdrawals","claimHistory","referralEarnings"].map(k => (
                    <tr key={k}>
                      <td className="py-1 az-mono capitalize">{k}</td>
                      <td className="py-1 az-mono text-right">{syncCounts.local?.[k] ?? "—"}</td>
                      <td className="py-1 az-mono text-right" style={{ color: "var(--teal)" }}>{syncCounts.neon?.[k] ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {syncResult && (
            <div className="rounded-ctl p-3 mb-4 text-xs" style={{ background: syncResult.error ? "rgba(239,68,68,0.08)" : "rgba(45,212,191,0.06)", border: `1px solid ${syncResult.error ? "rgba(239,68,68,0.2)" : "rgba(45,212,191,0.2)"}` }}>
              {syncResult.error ? (
                <p style={{ color: "#ef4444" }}>Error: {syncResult.error}</p>
              ) : (
                <div>
                  <p className="font-semibold mb-1" style={{ color: "var(--teal)" }}>✓ Sync complete</p>
                  {Object.entries(syncResult.synced ?? {}).map(([k, v]) => (
                    <div key={k} className="az-mono">{k}: {v as number} records synced</div>
                  ))}
                </div>
              )}
            </div>
          )}

          <button
            className="az-btn-primary w-full"
            disabled={syncing || !syncCounts?.hasNeonUrl}
            onClick={async () => {
              setSyncing(true);
              setSyncResult(null);
              try {
                const res = await adminFetch("/api/admin/sync-neon", { method: "POST" });
                const d = await res.json();
                setSyncResult(d);
                // Refresh counts after sync
                const r2 = await adminFetch("/api/admin/sync-neon");
                if (r2.ok) setSyncCounts(await r2.json());
              } catch { setSyncResult({ error: "Network error" }); }
              finally { setSyncing(false); }
            }}
          >
            {syncing ? <span className="flex items-center justify-center gap-2"><Spinner size="sm" /> Syncing…</span> : "Sync Neon → Local PostgreSQL"}
          </button>
          {!syncCounts?.hasNeonUrl && (
            <p className="text-[11px] az-mono mt-2" style={{ color: "var(--muted)" }}>Set NEON_DATABASE_URL in cPanel environment variables to enable sync.</p>
          )}
        </AdminCard>

        {/* Virtual withdrawal queue — auto-loads on mount, shows all withdrawals */}
        <AdminCard title="Withdrawal Queue">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs" style={{ color: "var(--muted)" }}>All virtual withdrawal requests</p>
            <Link href={`/${locale}/app/admin/withdrawals`} className="text-xs az-mono font-semibold" style={{ color: "var(--teal)" }}>View all →</Link>
          </div>
          {/* Filters + Search */}
          <div className="flex flex-wrap gap-2 mb-4">
            <input className="az-input flex-1 min-w-[160px] h-8 text-sm" placeholder="Search username or wallet…"
              value={vwSearch} onChange={e => setVwSearch(e.target.value)}
              onKeyDown={e => e.key === "Enter" && fetchVirtualWithdrawals(vwStatusFilter)} />
            <select className="rounded-ctl px-3 py-1.5 text-xs az-mono" style={{ background: "var(--bg-2)", border: "1px solid var(--line)", color: "var(--text-2)" }}
              value={vwStatusFilter} onChange={e => { setVwStatusFilter(e.target.value); fetchVirtualWithdrawals(e.target.value); }}>
              <option value="-1">All Status</option>
              <option value="0">Pending</option>
              <option value="1">Sent</option>
              <option value="2">Rejected</option>
              <option value="3">Cancelled</option>
            </select>
            <select className="rounded-ctl px-3 py-1.5 text-xs az-mono" style={{ background: "var(--bg-2)", border: "1px solid var(--line)", color: "var(--text-2)" }}
              value={vwAssetFilter} onChange={e => { setVwAssetFilter(e.target.value); fetchVirtualWithdrawals(vwStatusFilter); }}>
              <option value="-1">All Assets</option>
              <option value="0">AZR</option>
              <option value="1">USDT</option>
            </select>
            <button className="az-btn-primary text-xs px-3 py-1.5" onClick={() => fetchVirtualWithdrawals(vwStatusFilter)} disabled={vwLoading}>
              {vwLoading ? <Spinner size="sm" /> : "Refresh"}
            </button>
          </div>
          {/* Table */}
          {vwList.length === 0 ? (
            <p className="text-xs py-6 text-center" style={{ color: "var(--text-2)" }}>No withdrawals found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead><tr className="az-mono text-[11px] uppercase" style={{ color: "var(--muted)" }}>
                  <th className="text-left pb-2 font-normal">#</th>
                  <th className="text-left pb-2 font-normal">User</th>
                  <th className="text-left pb-2 font-normal">Asset</th>
                  <th className="text-left pb-2 font-normal">Amount</th>
                  <th className="text-left pb-2 font-normal">To Wallet</th>
                  <th className="text-left pb-2 font-normal">Status</th>
                  <th className="text-left pb-2 font-normal">Date</th>
                  <th className="text-left pb-2 font-normal">Action</th>
                </tr></thead>
                <tbody className="divide-y" style={{ borderColor: "var(--line)" }}>
                  {vwList
                    .filter(w => {
                      if (vwSearch && !JSON.stringify(w).toLowerCase().includes(vwSearch.toLowerCase())) return false;
                      if (vwAssetFilter !== "-1" && w.assetType !== parseInt(vwAssetFilter)) return false;
                      return true;
                    })
                    .slice((vwCardPage - 1) * 10, vwCardPage * 10)
                    .map((w) => {
                    const WD_STATUS = ["Pending","Sent","Rejected","Cancelled"];
                    const WD_COLOR  = ["var(--warn)","var(--teal)","#ef4444","var(--muted)"];
                    return (
                      <tr key={w.id}>
                        <td className="py-2 az-mono" style={{ color: "var(--muted)" }}>#{w.id}</td>
                        <td className="py-2 az-mono" style={{ color: "var(--teal)" }}>{w.user?.username ?? w.user?.walletAddress?.slice(0,8)}.azr</td>
                        <td className="py-2 az-mono font-semibold">{w.assetType === 0 ? "AZR" : "USDT"}</td>
                        <td className="py-2 az-mono font-semibold">{w.amount.toFixed(4)}</td>
                        <td className="py-2 az-mono" style={{ color: "var(--muted)" }}>{w.toWallet.slice(0,8)}…{w.toWallet.slice(-4)}</td>
                        <td className="py-2"><span className="az-mono text-[11px] font-semibold" style={{ color: WD_COLOR[w.status] }}>{WD_STATUS[w.status] ?? "—"}</span></td>
                        <td className="py-2" style={{ color: "var(--muted)" }}>{new Date(w.createdAt).toLocaleDateString()}</td>
                        <td className="py-2">
                          {w.status === 0 && (
                            <div className="flex gap-1 items-center">
                              <input className="az-input h-6 text-[11px]" style={{ width: 100 }} placeholder="TX hash" value={vwSentHash[w.id] ?? ""} onChange={e => setVwSentHash(p => ({ ...p, [w.id]: e.target.value }))} />
                              <button className="az-btn-primary text-[11px] px-2 py-0.5" onClick={() => handleVwAction(w.id, "send")}>Sent</button>
                              <button className="text-[11px] px-2 py-0.5 rounded-ctl" style={{ color: "#ef4444", border: "1px solid rgba(239,68,68,0.3)" }} onClick={() => handleVwAction(w.id, "reject")}>Reject</button>
                            </div>
                          )}
                          {w.status === 1 && w.sentTxHash && (() => {
                            const isValid = /^0x[0-9a-fA-F]{64}$/.test(w.sentTxHash);
                            const short = `${w.sentTxHash.slice(0,10)}…${w.sentTxHash.slice(-6)}`;
                            const bscUrl = `${CHAIN_ID === 56 ? "https://bscscan.com/tx/" : "https://testnet.bscscan.com/tx/"}${w.sentTxHash}`;
                            return (
                              <div className="flex items-center gap-1 mt-0.5">
                                {isValid ? (
                                  <a href={bscUrl} target="_blank" rel="noopener noreferrer"
                                    className="az-mono text-[10px] underline" style={{ color: "var(--teal)" }}
                                    title="View on BSCScan">{short}</a>
                                ) : (
                                  <span className="az-mono text-[10px]" style={{ color: "var(--muted)" }} title={w.sentTxHash}>{short}</span>
                                )}
                                <button onClick={() => navigator.clipboard.writeText(w.sentTxHash)} title="Copy TX hash" style={{ color: "var(--muted)" }}>
                                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                                </button>
                              </div>
                            );
                          })()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <AdminPaginator page={vwCardPage} totalPages={Math.max(1, Math.ceil(vwList.length / 10))} total={vwList.length} pageSize={10}
                onFirst={() => setVwCardPage(1)} onPrev={() => setVwCardPage(p => p-1)} onNext={() => setVwCardPage(p => p+1)} onLast={() => setVwCardPage(Math.max(1, Math.ceil(vwList.length / 10)))} />
            </div>
          )}
        </AdminCard>

        {/* Balance Adjustment History */}
        <AdminCard title="Balance Adjustment History">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs" style={{ color: "var(--muted)" }}>All admin credit and debit operations</p>
            <Link href={`/${locale}/app/admin/adjustments`} className="text-xs az-mono font-semibold" style={{ color: "var(--teal)" }}>View all →</Link>
          </div>
          <div className="flex flex-wrap gap-2 mb-4">
            <input className="az-input flex-1 min-w-[160px] h-8 text-sm" placeholder="Search username or wallet…"
              value={baSearch} onChange={e => setBaSearch(e.target.value)}
              onKeyDown={e => e.key === "Enter" && fetchBalanceAdjustments(baSearch, baAsset, baAction)} />
            <select className="rounded-ctl px-3 py-1.5 text-xs az-mono" style={{ background: "var(--bg-2)", border: "1px solid var(--line)", color: "var(--text-2)" }}
              value={baAsset} onChange={e => { setBaAsset(e.target.value); fetchBalanceAdjustments(baSearch, e.target.value, baAction); }}>
              <option value="">All Assets</option>
              <option value="azr">AZR</option>
              <option value="usdt">USDT</option>
            </select>
            <select className="rounded-ctl px-3 py-1.5 text-xs az-mono" style={{ background: "var(--bg-2)", border: "1px solid var(--line)", color: "var(--text-2)" }}
              value={baAction} onChange={e => { setBaAction(e.target.value); fetchBalanceAdjustments(baSearch, baAsset, e.target.value); }}>
              <option value="">All Actions</option>
              <option value="credit">Credit</option>
              <option value="debit">Debit</option>
            </select>
            <button className="az-btn-primary text-xs px-3 py-1.5" onClick={() => fetchBalanceAdjustments(baSearch, baAsset, baAction)} disabled={baLoading}>
              {baLoading ? <Spinner size="sm" /> : "Refresh"}
            </button>
          </div>
          {baList.length === 0 ? (
            <p className="text-xs py-6 text-center" style={{ color: "var(--text-2)" }}>No balance adjustments yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <p className="text-[11px] az-mono mb-2" style={{ color: "var(--muted)" }}>Showing {baList.length} of {baTotal}</p>
              <table className="w-full text-xs">
                <thead><tr className="az-mono text-[11px] uppercase" style={{ color: "var(--muted)" }}>
                  <th className="text-left pb-2 font-normal">#</th>
                  <th className="text-left pb-2 font-normal">User</th>
                  <th className="text-left pb-2 font-normal">Action</th>
                  <th className="text-left pb-2 font-normal">Asset</th>
                  <th className="text-left pb-2 font-normal">Amount</th>
                  <th className="text-left pb-2 font-normal">By Admin</th>
                  <th className="text-left pb-2 font-normal">Date</th>
                </tr></thead>
                <tbody className="divide-y" style={{ borderColor: "var(--line)" }}>
                  {baList.slice((baCardPage - 1) * 10, baCardPage * 10).map((b: {id: number; user: {username: string; walletAddress: string}; action: string; asset: string; amount: number; adminWallet: string; note: string; createdAt: string}) => (
                    <tr key={b.id}>
                      <td className="py-2 az-mono" style={{ color: "var(--muted)" }}>#{b.id}</td>
                      <td className="py-2 az-mono" style={{ color: "var(--teal)" }}>{b.user?.username}.azr</td>
                      <td className="py-2"><span className="az-mono text-[11px] font-semibold px-1.5 py-0.5 rounded" style={{ background: b.action === "credit" ? "rgba(45,212,191,0.1)" : "rgba(239,68,68,0.1)", color: b.action === "credit" ? "var(--teal)" : "#ef4444" }}>{b.action === "credit" ? "+" : "−"} {b.action}</span></td>
                      <td className="py-2 az-mono uppercase">{b.asset}</td>
                      <td className="py-2 az-mono font-semibold">{b.amount.toFixed(4)}</td>
                      <td className="py-2 az-mono" style={{ color: "var(--muted)" }}>{b.adminWallet.slice(0,8)}…</td>
                      <td className="py-2" style={{ color: "var(--muted)" }}>{new Date(b.createdAt).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <AdminPaginator page={baCardPage} totalPages={Math.max(1, Math.ceil(baList.length / 10))} total={baList.length} pageSize={10}
            onFirst={() => setBaCardPage(1)} onPrev={() => setBaCardPage(p => p-1)} onNext={() => setBaCardPage(p => p+1)} onLast={() => setBaCardPage(Math.max(1, Math.ceil(baList.length / 10)))} />
        </AdminCard>


      </div>
    </>
  );
}
