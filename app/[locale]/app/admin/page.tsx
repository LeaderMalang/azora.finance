"use client";

import { AppTopbar } from "@/components/app/AppTopbar";
import { useAccount, useReadContract } from "wagmi";
import { CONTRACTS, ERC20_ABI } from "@/lib/contracts";
import { Spinner } from "@/components/ui/Spinner";
import { useActiveChain } from "@/lib/hooks";
import { formatUnits, isAddress } from "viem";
import { useState, useEffect } from "react";
import { useToast } from "@/components/ui/Toast";

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
  const { chainId } = useActiveChain();

  // Wallet-based admin check (DB-driven, supports multiple admin wallets)
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null); // null = loading
  // Pool AZR balance (platform overview)
  const { data: poolAzrBal } = useReadContract({ address: CONTRACTS[chainId].azoraToken, abi: ERC20_ABI, functionName: "balanceOf", args: [CONTRACTS[chainId].staking], query: { enabled: true } });

  // Helper: add admin wallet header to all fetch calls
  const adminFetch = (url: string, opts: RequestInit = {}) =>
    fetch(url, { ...opts, headers: { ...(opts.headers ?? {}), "x-admin-wallet": addr ?? "" } });

  // Check if connected wallet is admin
  useEffect(() => {
    if (!addr) { setIsAdmin(null); return; }
    fetch(`/api/admin/auth?wallet=${addr}`)
      .then(r => r.json())
      .then(d => setIsAdmin(!!d.isAdmin))
      .catch(() => setIsAdmin(false));
  }, [addr]);

  // DB stats
  const [dbStats, setDbStats] = useState<{ userCount: number; referralTotal: string } | null>(null);
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
  const [settings, setSettings] = useState<{ minStakeAzr: number; lockDays: number; dailyRewardPct: number; minWithdrawal: number; withdrawalFeePct: number; referralRateL1: number; referralRateL2: number; referralRateL3: number } | null>(null);
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
  // Virtual withdrawal queue
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [vwList, setVwList] = useState<any[]>([]);
  const [vwLoading, setVwLoading] = useState(false);
  const [vwSentHash, setVwSentHash] = useState<Record<number, string>>({});
  // DB sync
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [syncCounts, setSyncCounts] = useState<any>(null);
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [syncResult, setSyncResult] = useState<any>(null);

  const fetchVirtualWithdrawals = async () => {
    setVwLoading(true);
    try {
      const res = await adminFetch("/api/admin/virtual-withdrawals");
      if (res.ok) { const d = await res.json(); setVwList(d.withdrawals ?? []); }
    } finally { setVwLoading(false); }
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

  // Load platform settings and withdrawal queue when admin is confirmed
  useEffect(() => {
    if (!isAdmin || !addr) return;
    adminFetch("/api/admin/settings").then(r => r.json()).then(d => { if (!d.error) setSettings(d); }).catch(() => {});
    fetchVirtualWithdrawals();
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

  const fmt = (v: bigint | undefined, decimals = 18, dp = 2) =>
    v !== undefined ? parseFloat(formatUnits(v, decimals)).toFixed(dp) : "—";

  return (
    <>
      <AppTopbar title="Admin Panel" sub="Owner-only contract controls · handle with care" />
      <div className="p-4 md:p-8 max-w-app space-y-6">

        {/* User Data Lookup */}
        <AdminCard title="User Data Lookup">
          <p className="text-xs mb-3" style={{ color: "var(--muted)" }}>Search by wallet address or username to view all data for a user.</p>
          <div className="flex gap-2 mb-4">
            <input
              className="az-input flex-1"
              placeholder="0x... or username"
              value={userQuery}
              onChange={(e) => setUserQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && userQuery) { setUserQueryLoading(true); adminFetch(`/api/admin/user-data?query=${encodeURIComponent(userQuery)}`).then(r => r.json()).then(d => { setUserResult(d); }).finally(() => setUserQueryLoading(false)); } }}
            />
            <button
              className="az-btn-primary px-4"
              disabled={userQueryLoading || !userQuery}
              onClick={() => { setUserQueryLoading(true); adminFetch(`/api/admin/user-data?query=${encodeURIComponent(userQuery)}`).then(r => r.json()).then(d => { setUserResult(d); }).finally(() => setUserQueryLoading(false)); }}
            >{userQueryLoading ? <Spinner size="sm" /> : "Search"}</button>
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
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs mt-1">
                      <thead><tr style={{ color: "var(--muted)" }}><th className="text-left pb-1 font-normal">Amount</th><th className="text-left pb-1 font-normal">Unlocks</th><th className="text-left pb-1 font-normal">Status</th></tr></thead>
                      <tbody>{u.virtualStakes.map((s: {id: number; amount: number; startTime: string; unlockTime: string; isActive: boolean}) => (
                        <tr key={s.id}><td className="py-0.5 az-mono">{s.amount.toFixed(4)} AZR</td><td className="py-0.5" style={{ color: "var(--text-2)" }}>{new Date(s.unlockTime).toLocaleDateString()}</td><td className="py-0.5"><span style={{ color: s.isActive ? "var(--teal)" : "var(--muted)" }}>{s.isActive ? "Active" : "Ended"}</span></td></tr>
                      ))}</tbody>
                    </table>
                  </div>
                ) : <p className="text-xs" style={{ color: "var(--muted)" }}>No virtual stakes</p>}

                {sectionHead(`Claim History (${userResult.claimHistory?.length ?? 0})`)}
                {userResult.claimHistory?.length ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs mt-1">
                      <thead><tr style={{ color: "var(--muted)" }}><th className="text-left pb-1 font-normal">Date</th><th className="text-right pb-1 font-normal">Amount</th></tr></thead>
                      <tbody>{userResult.claimHistory.map((c: {id: number; amount: string; claimedAt: string}) => (
                        <tr key={c.id}><td className="py-0.5" style={{ color: "var(--text-2)" }}>{new Date(c.claimedAt).toLocaleString()}</td><td className="py-0.5 az-mono text-right" style={{ color: "var(--teal)" }}>+{(parseFloat(c.amount) / 1e18).toFixed(4)} AZR</td></tr>
                      ))}</tbody>
                    </table>
                  </div>
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

        {/* Stats overview — custodial DB stats */}
        <div className="az-card-glow">
          <h3 className="font-semibold mb-4 text-sm">Platform Overview</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { label: "AZR Contract Pool", value: fmt(poolAzrBal as bigint | undefined), unit: "AZR", color: "var(--teal)" },
              { label: "Total Users", value: dbStats ? String(dbStats.userCount) : "…", unit: "", color: "var(--text)" },
              { label: "Referral Paid", value: dbStats ? dbStats.referralTotal : "…", unit: "AZR", color: "var(--text)" },
              { label: "Pending W/D", value: String(vwList.filter(w => w.status === 0).length), unit: "virtual", color: vwList.filter(w => w.status === 0).length > 0 ? "var(--warn)" : "var(--text)" },
              { label: "Settings", value: settings ? `${settings.dailyRewardPct}% / day` : "…", unit: "", color: "var(--teal)" },
              { label: "Ref Rates", value: settings ? `L1:${settings.referralRateL1}%` : "…", unit: "", color: "var(--text)" },
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
            <button className="az-btn-primary text-xs px-3 py-1.5 mb-4" onClick={() => { fetchAdminWallets(); }} disabled={adminWalletsLoading}>
              {adminWalletsLoading ? <Spinner size="sm" /> : "Load Admin Wallets"}
            </button>
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
          <p className="text-xs mb-4" style={{ color: "var(--muted)" }}>
            All virtual withdrawal requests. For pending ones: send tokens from your treasury wallet, paste the TX hash, and mark as sent. Reject refunds the user automatically.
          </p>
          <div className="flex gap-2 mb-4">
            <button className="az-btn-primary text-xs px-3 py-1.5" onClick={fetchVirtualWithdrawals} disabled={vwLoading}>
              {vwLoading ? <Spinner size="sm" /> : "Refresh"}
            </button>
          </div>
          {vwList.length === 0 ? (
            <p className="text-xs py-4 text-center" style={{ color: "var(--text-2)" }}>No pending withdrawals.</p>
          ) : (
            <div className="space-y-3">
              {vwList.map((w) => (
                <div key={w.id} className="rounded-ctl p-3" style={{ background: "var(--bg-2)", border: "1px solid var(--line)" }}>
                  <div className="flex flex-wrap justify-between gap-2 mb-1 text-xs">
                    <span className="az-mono font-semibold">#{w.id} · {w.user?.username ?? w.user?.walletAddress?.slice(0,8)}.azr</span>
                    <span className="az-mono font-bold" style={{ color: "var(--teal)" }}>{w.amount.toFixed(4)} {w.assetType === 0 ? "AZR" : "USDT"}</span>
                  </div>
                  <div className="text-[11px] az-mono mb-2" style={{ color: "var(--muted)" }}>
                    To: {w.toWallet} · {new Date(w.createdAt).toLocaleDateString()}
                    {" · "}<span style={{ color: w.status === 0 ? "var(--warn)" : w.status === 1 ? "var(--teal)" : "#ef4444" }}>{["Pending","Sent","Rejected"][w.status]}</span>
                  </div>
                  {w.status === 0 && (
                    <div className="flex gap-2 items-center">
                      <input
                        className="az-input h-7 text-xs flex-1"
                        placeholder="TX hash (optional)"
                        value={vwSentHash[w.id] ?? ""}
                        onChange={(e) => setVwSentHash((p) => ({ ...p, [w.id]: e.target.value }))}
                      />
                      <button className="az-btn-primary text-xs px-3 py-1" onClick={() => handleVwAction(w.id, "send")}>Mark Sent</button>
                      <button className="text-xs px-3 py-1 rounded-ctl" style={{ border: "1px solid #ef4444", color: "#ef4444", background: "rgba(239,68,68,0.07)" }} onClick={() => handleVwAction(w.id, "reject")}>Reject</button>
                    </div>
                  )}
                  {w.status === 1 && w.sentTxHash && (
                    <p className="text-[11px] az-mono" style={{ color: "var(--muted)" }}>TX: {w.sentTxHash}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </AdminCard>


      </div>
    </>
  );
}
