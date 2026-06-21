"use client";

import { AppTopbar } from "@/components/app/AppTopbar";
import { useAccount, useReadContract, useReadContracts, useWriteContract } from "wagmi";
import { CONTRACTS, STAKING_ABI, ERC20_ABI } from "@/lib/contracts";
import { Spinner } from "@/components/ui/Spinner";
import { TokenIcon } from "@/components/ui/TokenIcon";
import { useActiveChain } from "@/lib/hooks";
import { formatUnits, parseUnits, isAddress } from "viem";
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
  const { writeContractAsync } = useWriteContract();

  // Protocol reads
  const { data: owner } = useReadContract({ address: CONTRACTS[chainId].staking, abi: STAKING_ABI, functionName: "owner", query: { enabled: true } });
  const { data: lockPeriod, refetch: refetchLock } = useReadContract({ address: CONTRACTS[chainId].staking, abi: STAKING_ABI, functionName: "lockPeriod", query: { enabled: true } });
  const { data: minStake, refetch: refetchMin } = useReadContract({ address: CONTRACTS[chainId].staking, abi: STAKING_ABI, functionName: "minStakeAmount", query: { enabled: true } });
  const { data: feeBps, refetch: refetchFee } = useReadContract({ address: CONTRACTS[chainId].staking, abi: STAKING_ABI, functionName: "withdrawalFeeBps", query: { enabled: true } });
  const { data: l1Rate, refetch: refetchRates } = useReadContract({ address: CONTRACTS[chainId].staking, abi: STAKING_ABI, functionName: "referralRateL1", query: { enabled: true } });
  const { data: l2Rate } = useReadContract({ address: CONTRACTS[chainId].staking, abi: STAKING_ABI, functionName: "referralRateL2", query: { enabled: true } });
  const { data: l3Rate } = useReadContract({ address: CONTRACTS[chainId].staking, abi: STAKING_ABI, functionName: "referralRateL3", query: { enabled: true } });
  const { data: isPaused, refetch: refetchPaused } = useReadContract({ address: CONTRACTS[chainId].staking, abi: STAKING_ABI, functionName: "paused", query: { enabled: true } });
  const { data: reqCount, refetch: refetchReqCount } = useReadContract({ address: CONTRACTS[chainId].staking, abi: STAKING_ABI, functionName: "withdrawalRequestCount", query: { enabled: true } });

  // Pool balances
  const { data: poolUsdtBal, refetch: refetchPoolBal } = useReadContract({ address: CONTRACTS[chainId].usdt, abi: ERC20_ABI, functionName: "balanceOf", args: [CONTRACTS[chainId].staking], query: { enabled: true } });
  const { data: poolAzrBal } = useReadContract({ address: CONTRACTS[chainId].azoraToken, abi: ERC20_ABI, functionName: "balanceOf", args: [CONTRACTS[chainId].staking], query: { enabled: true } });

  // Admin wallet balances
  const { data: adminUsdtBal } = useReadContract({ address: CONTRACTS[chainId].usdt, abi: ERC20_ABI, functionName: "balanceOf", args: addr ? [addr] : undefined, query: { enabled: !!addr } });
  const { data: adminAzrBal } = useReadContract({ address: CONTRACTS[chainId].azoraToken, abi: ERC20_ABI, functionName: "balanceOf", args: addr ? [addr] : undefined, query: { enabled: !!addr } });

  // DB stats
  const [dbStats, setDbStats] = useState<{ userCount: number; referralTotal: string } | null>(null);
  useEffect(() => {
    fetch("/api/admin/stats").then((r) => r.json()).then(setDbStats).catch(() => {});
  }, []);

  // Batch-fetch all withdrawal requests
  const reqCountNum = reqCount ? Number(reqCount as bigint) : 0;
  type WRequest = { id: bigint; requester: `0x${string}`; amount: bigint; assetType: number; status: number; createdAt: bigint };
  const { data: allRequestsRaw, refetch: refetchAllRequests } = useReadContracts({
    contracts: Array.from({ length: reqCountNum }, (_, i) => ({
      address: CONTRACTS[chainId].staking as `0x${string}`,
      abi: STAKING_ABI,
      functionName: "withdrawalRequests" as const,
      args: [BigInt(i + 1)] as [bigint],
    })),
    query: { enabled: reqCountNum > 0 },
  });
  const allRequests: WRequest[] = (allRequestsRaw ?? [])
    .map((r) => {
      const res = r.result as readonly [bigint, `0x${string}`, bigint, number, number, bigint] | undefined;
      if (!res) return undefined;
      return { id: res[0], requester: res[1], amount: res[2], assetType: res[3], status: res[4], createdAt: res[5] } as WRequest;
    })
    .filter((r): r is WRequest => !!r);

  // Batch-fetch usernames for withdrawal requesters
  const { data: usernamesRaw } = useReadContracts({
    contracts: allRequests.map((req) => ({
      address: CONTRACTS[chainId].staking as `0x${string}`,
      abi: STAKING_ABI,
      functionName: "usersByAddress" as const,
      args: [req.requester] as [`0x${string}`],
    })),
    query: { enabled: allRequests.length > 0 },
  });
  const requestUsernames: string[] = (usernamesRaw ?? []).map((r) => {
    const res = r.result as [string, string, boolean] | undefined;
    return res?.[1] ?? "";
  });

  // Withdrawal stats
  const pendingCount = allRequests.filter((r) => r.status === 0).length;
  const approvedCount = allRequests.filter((r) => r.status === 1).length;
  const rejectedCount = allRequests.filter((r) => r.status === 2).length;

  // Transaction state
  const [txPending, setTxPending] = useState(false);

  // Withdrawal table filters
  const [wSearch, setWSearch] = useState("");
  const [wStatusFilter, setWStatusFilter] = useState(-1);
  const [wAssetFilter, setWAssetFilter] = useState(-1);

  // Form state
  const [usdtDepositAmt, setUsdtDepositAmt] = useState("");
  const [lockDays, setLockDays] = useState("");
  const [minStakeInput, setMinStakeInput] = useState("");
  const [feeInput, setFeeInput] = useState("");
  const [l1Input, setL1Input] = useState("");
  const [l2Input, setL2Input] = useState("");
  const [l3Input, setL3Input] = useState("");
  const [debitAmt, setDebitAmt] = useState("");
  const [debitAddr, setDebitAddr] = useState("");
  const [debitBalance, setDebitBalance] = useState<number | null>(null);
  const [debitLoading, setDebitLoading] = useState(false);
  const [creditAmt, setCreditAmt] = useState("");
  const [creditAddr, setCreditAddr] = useState("");
  const [withdrawId, setWithdrawId] = useState("");
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

  const fetchVirtualWithdrawals = async () => {
    setVwLoading(true);
    try {
      const res = await fetch("/api/admin/virtual-withdrawals?status=0");
      if (res.ok) { const d = await res.json(); setVwList(d.withdrawals ?? []); }
    } finally { setVwLoading(false); }
  };

  const handleVwAction = async (id: number, action: "send" | "reject") => {
    const res = await fetch("/api/admin/withdrawal-send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ withdrawalId: id, action, sentTxHash: vwSentHash[id] || null }),
    });
    const d = await res.json();
    if (!res.ok) { toast(d.error ?? "Failed", "error"); return; }
    toast(action === "send" ? "Withdrawal marked as sent" : "Withdrawal rejected · balance refunded");
    fetchVirtualWithdrawals();
  };

  // On-chain AZR balance for searched user
  const { data: searchedAzrBal } = useReadContract({
    address: CONTRACTS[chainId].azoraToken,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: userResult?.user?.walletAddress ? [userResult.user.walletAddress as `0x${string}`] : undefined,
    query: { enabled: !!userResult?.user?.walletAddress },
  });

  const isOwner = !!addr && !!owner && addr.toLowerCase() === (owner as string).toLowerCase();

  if (!addr) {
    return (
      <>
        <AppTopbar title="Admin" sub="Owner-only controls" />
        <div className="p-4 md:p-8 flex items-center justify-center" style={{ minHeight: "50vh" }}>
          <p style={{ color: "var(--text-2)" }}>Connect your wallet to access this page.</p>
        </div>
      </>
    );
  }

  if (!isOwner) {
    return (
      <>
        <AppTopbar title="Admin" sub="Owner-only controls" />
        <div className="p-4 md:p-8 flex flex-col items-center justify-center gap-4" style={{ minHeight: "50vh" }}>
          <svg className="w-12 h-12" style={{ color: "#ef4444" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="12" cy="12" r="9" /><path d="M15 9l-6 6M9 9l6 6" />
          </svg>
          <p className="font-semibold">Access Denied</p>
          <p className="text-sm" style={{ color: "var(--text-2)" }}>Only the contract owner can view this page.</p>
          <p className="text-xs az-mono" style={{ color: "var(--muted)" }}>Owner: {owner as string}</p>
        </div>
      </>
    );
  }

  const filteredRequests = allRequests
    .map((req, idx) => ({ req, idx }))
    .filter(({ req, idx }) => {
      if (wStatusFilter !== -1 && req.status !== wStatusFilter) return false;
      if (wAssetFilter !== -1 && req.assetType !== wAssetFilter) return false;
      if (wSearch) {
        const q = wSearch.toLowerCase();
        const name = (requestUsernames[idx] ?? "").toLowerCase();
        const addr2 = req.requester.toLowerCase();
        if (!name.includes(q) && !addr2.includes(q)) return false;
      }
      return true;
    })
    .sort(({ req: a }, { req: b }) => Number(b.id - a.id));

  const exec = async (fn: () => Promise<unknown>, successMsg: string, refetch?: () => void) => {
    setTxPending(true);
    try {
      await fn();
      toast(successMsg);
      setTimeout(() => refetch?.(), 3000);
    } catch (e) {
      toast(e instanceof Error ? e.message.slice(0, 120) : "Transaction failed", "error");
    } finally {
      setTxPending(false);
    }
  };

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
              onKeyDown={(e) => { if (e.key === "Enter" && userQuery) { setUserQueryLoading(true); fetch(`/api/admin/user-data?query=${encodeURIComponent(userQuery)}`).then(r => r.json()).then(d => { setUserResult(d); }).finally(() => setUserQueryLoading(false)); } }}
            />
            <button
              className="az-btn-primary px-4"
              disabled={userQueryLoading || !userQuery}
              onClick={() => { setUserQueryLoading(true); fetch(`/api/admin/user-data?query=${encodeURIComponent(userQuery)}`).then(r => r.json()).then(d => { setUserResult(d); }).finally(() => setUserQueryLoading(false)); }}
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
                {row("AZR Wallet Balance", <span style={{ color: "var(--teal)" }}>{searchedAzrBal !== undefined ? parseFloat(formatUnits(searchedAzrBal as bigint, 18)).toFixed(4) : "loading…"} AZR</span>)}
                {row("Total Active Staked", <span style={{ color: "var(--teal)" }}>{userResult.totalStaked?.toFixed(4) ?? "0.0000"} AZR</span>)}
                {row("Total Commissions Earned", <span style={{ color: "var(--teal)" }}>{userResult.totalCommissions?.toFixed(4) ?? "0.0000"} AZR</span>)}
                {row("Total Claims", <span style={{ color: "var(--teal)" }}>{userResult.totalClaims?.toFixed(4) ?? "0.0000"} AZR</span>)}
                {row("Account Balance (Platform)", <span style={{ color: (u.userCredit?.balance ?? 0) < 0 ? "#ef4444" : "var(--teal)" }}>{(u.userCredit?.balance ?? 0).toFixed(4)} AZR</span>)}

                {sectionHead("Referral Network")}
                {row("Upline (Referrer)", u.referredByUser ? `${u.referredByUser.username}.azr (#${u.referredByUser.seqId})` : "None")}
                {row("Downlines (L1)", u.referrals?.length ? u.referrals.map((r: {username: string; seqId: number}) => `${r.username}.azr (#${r.seqId})`).join(", ") : "None")}

                {sectionHead(`Stakes (${u.stakes?.length ?? 0} total · ${userResult.totalStaked?.toFixed(4)} AZR active)`)}
                {u.stakes?.length ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs mt-1">
                      <thead><tr style={{ color: "var(--muted)" }}><th className="text-left pb-1 font-normal">Amount</th><th className="text-left pb-1 font-normal">Start</th><th className="text-left pb-1 font-normal">Status</th></tr></thead>
                      <tbody>{u.stakes.map((s: {id: string; amount: string; stakeStartTime: string; isActive: boolean}) => (
                        <tr key={s.id}><td className="py-0.5 az-mono">{(parseFloat(s.amount) / 1e18).toFixed(4)} AZR</td><td className="py-0.5" style={{ color: "var(--text-2)" }}>{new Date(s.stakeStartTime).toLocaleDateString()}</td><td className="py-0.5"><span style={{ color: s.isActive ? "var(--teal)" : "var(--muted)" }}>{s.isActive ? "Active" : "Ended"}</span></td></tr>
                      ))}</tbody>
                    </table>
                  </div>
                ) : <p className="text-xs" style={{ color: "var(--muted)" }}>No stakes</p>}

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

        {/* Stats overview */}
        <div className="az-card-glow">
          <h3 className="font-semibold mb-4 text-sm">Platform Overview</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { label: "AZR Pool", value: fmt(poolAzrBal as bigint | undefined), unit: "AZR", color: "var(--teal)" },
              { label: "USDT Pool", value: fmt(poolUsdtBal as bigint | undefined), unit: "USDT", color: "var(--teal)" },
              { label: "Total Users", value: dbStats ? String(dbStats.userCount) : "…", unit: "", color: "var(--text)" },
              { label: "Referral Paid", value: dbStats ? dbStats.referralTotal : "…", unit: "AZR", color: "var(--text)" },
              { label: "Pending W/D", value: reqCount !== undefined ? String(pendingCount) : "…", unit: "", color: pendingCount > 0 ? "var(--warn)" : "var(--text)" },
              { label: "Total W/D Req", value: reqCount !== undefined ? String(reqCountNum) : "…", unit: `(${approvedCount}✓ ${rejectedCount}✗)`, color: "var(--text)" },
            ].map((s) => (
              <div key={s.label} className="rounded-ctl px-3 py-3 text-center" style={{ background: "var(--bg-2)" }}>
                <div className="text-[10px] az-mono mb-1" style={{ color: "var(--muted)" }}>{s.label}</div>
                <div className="font-bold az-mono text-sm" style={{ color: s.color }}>{s.value}</div>
                {s.unit && <div className="text-[10px] az-mono mt-0.5" style={{ color: "var(--muted)" }}>{s.unit}</div>}
              </div>
            ))}
          </div>
        </div>

        {/* Protocol state */}
        <div className="az-card">
          <h3 className="font-semibold mb-4 text-sm">Current Protocol State</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: "Lock Period", value: lockPeriod ? `${Math.floor(Number(lockPeriod as bigint) / 86400)} days` : "—" },
              { label: "Min Stake", value: minStake ? `${parseFloat(formatUnits(minStake as bigint, 18)).toFixed(0)} AZR` : "—" },
              { label: "Withdrawal Fee", value: feeBps !== undefined ? `${(Number(feeBps as bigint) / 100).toFixed(1)}%` : "—" },
              { label: "Status", value: isPaused ? "⏸ Paused" : "▶ Active" },
            ].map((s) => (
              <div key={s.label} className="rounded-ctl px-4 py-3" style={{ background: "var(--bg-2)" }}>
                <div className="text-[11px] az-mono mb-1" style={{ color: "var(--muted)" }}>{s.label}</div>
                <div className="font-semibold az-mono" style={{ color: s.label === "Status" && !isPaused ? "var(--teal)" : "var(--text)" }}>{s.value}</div>
              </div>
            ))}
          </div>
          <div className="mt-4 text-xs az-mono" style={{ color: "var(--muted)" }}>
            Referral rates: L1={l1Rate ? Number(l1Rate as bigint) / 100 : "—"}% · L2={l2Rate ? Number(l2Rate as bigint) / 100 : "—"}% · L3={l3Rate ? Number(l3Rate as bigint) / 100 : "—"}%
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Lock period */}
          <AdminCard title="Lock Period">
            <p className="text-xs mb-3" style={{ color: "var(--muted)" }}>Current: {lockPeriod ? Math.floor(Number(lockPeriod as bigint) / 86400) : "—"} days</p>
            <div className="flex gap-2">
              <input className="az-input flex-1" placeholder="Days (e.g. 14)" value={lockDays} onChange={(e) => setLockDays(e.target.value)} type="number" />
              <button
                className="az-btn-primary px-4"
                disabled={txPending || !lockDays}
                onClick={() => exec(
                  () => writeContractAsync({ address: CONTRACTS[chainId].staking, abi: STAKING_ABI, functionName: "setLockPeriod", args: [BigInt(Math.round(parseFloat(lockDays) * 86400))] }),
                  `Lock period set to ${lockDays} days`,
                  refetchLock,
                )}
              >Set</button>
            </div>
            <div className="flex gap-2 mt-2">
              {[7, 14, 30, 150].map((d) => (
                <button key={d} className="flex-1 py-1.5 rounded-ctl text-xs az-mono border transition-colors hover:border-teal" style={{ borderColor: "var(--line)", color: "var(--text-2)" }} onClick={() => setLockDays(String(d))}>
                  {d}d
                </button>
              ))}
            </div>
          </AdminCard>

          {/* Min stake */}
          <AdminCard title="Min Stake Amount">
            <p className="text-xs mb-3" style={{ color: "var(--muted)" }}>Current: {minStake ? parseFloat(formatUnits(minStake as bigint, 18)).toFixed(0) : "—"} AZR</p>
            <div className="flex gap-2">
              <input className="az-input flex-1" placeholder="Amount in AZR" value={minStakeInput} onChange={(e) => setMinStakeInput(e.target.value)} type="number" />
              <button
                className="az-btn-primary px-4"
                disabled={txPending || !minStakeInput}
                onClick={() => exec(
                  () => writeContractAsync({ address: CONTRACTS[chainId].staking, abi: STAKING_ABI, functionName: "setMinStake", args: [parseUnits(minStakeInput, 18)] }),
                  `Min stake set to ${minStakeInput} AZR`,
                  refetchMin,
                )}
              >Set</button>
            </div>
          </AdminCard>

          {/* Withdrawal fee */}
          <AdminCard title="Withdrawal Fee">
            <p className="text-xs mb-3" style={{ color: "var(--muted)" }}>Current: {feeBps !== undefined ? (Number(feeBps as bigint) / 100).toFixed(1) : "—"}% — enter in basis points (100 bps = 1%)</p>
            <div className="flex gap-2">
              <input className="az-input flex-1" placeholder="Basis points (e.g. 200 = 2%)" value={feeInput} onChange={(e) => setFeeInput(e.target.value)} type="number" />
              <button
                className="az-btn-primary px-4"
                disabled={txPending || !feeInput}
                onClick={() => exec(
                  () => writeContractAsync({ address: CONTRACTS[chainId].staking, abi: STAKING_ABI, functionName: "setWithdrawalFee", args: [BigInt(feeInput)] }),
                  `Withdrawal fee set to ${Number(feeInput) / 100}%`,
                  refetchFee,
                )}
              >Set</button>
            </div>
          </AdminCard>

          {/* Referral rates */}
          <AdminCard title="Referral Rates">
            <p className="text-xs mb-3" style={{ color: "var(--muted)" }}>
              Current: L1={l1Rate ? Number(l1Rate as bigint) / 100 : "—"}% · L2={l2Rate ? Number(l2Rate as bigint) / 100 : "—"}% · L3={l3Rate ? Number(l3Rate as bigint) / 100 : "—"}%
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-3">
              <div>
                <label className="text-[11px] az-mono mb-1 block" style={{ color: "var(--muted)" }}>L1 bps</label>
                <input className="az-input" placeholder="500" value={l1Input} onChange={(e) => setL1Input(e.target.value)} type="number" />
              </div>
              <div>
                <label className="text-[11px] az-mono mb-1 block" style={{ color: "var(--muted)" }}>L2 bps</label>
                <input className="az-input" placeholder="300" value={l2Input} onChange={(e) => setL2Input(e.target.value)} type="number" />
              </div>
              <div>
                <label className="text-[11px] az-mono mb-1 block" style={{ color: "var(--muted)" }}>L3 bps</label>
                <input className="az-input" placeholder="200" value={l3Input} onChange={(e) => setL3Input(e.target.value)} type="number" />
              </div>
            </div>
            <button
              className="az-btn-primary w-full"
              disabled={txPending || !l1Input || !l2Input || !l3Input}
              onClick={() => exec(
                () => writeContractAsync({ address: CONTRACTS[chainId].staking, abi: STAKING_ABI, functionName: "setReferralRates", args: [BigInt(l1Input), BigInt(l2Input), BigInt(l3Input)] }),
                "Referral rates updated",
                refetchRates,
              )}
            >Update Rates</button>
          </AdminCard>

          {/* USDT liquidity deposit */}
          <AdminCard title="Deposit USDT Liquidity">
            <p className="text-xs mb-1" style={{ color: "var(--muted)" }}>
              Pool: <strong style={{ color: "var(--teal)" }}>{poolUsdtBal ? parseFloat(formatUnits(poolUsdtBal as bigint, 18)).toFixed(2) : "—"} USDT</strong>
              &nbsp;·&nbsp;Your wallet: {adminUsdtBal ? parseFloat(formatUnits(adminUsdtBal as bigint, 18)).toFixed(2) : "—"} USDT
            </p>
            <p className="text-[11px] az-mono mb-3" style={{ color: "var(--muted)", opacity: 0.7 }}>
              On mainnet: deposit real USDT here to fund the swap reserve. On testnet, USDT must be sourced separately (faucet or test contract).
            </p>
            <div className="flex gap-2">
              <input className="az-input flex-1" placeholder="USDT amount" value={usdtDepositAmt} onChange={(e) => setUsdtDepositAmt(e.target.value)} type="number" />
              <button
                className="az-btn-primary px-4"
                disabled={txPending || !usdtDepositAmt || parseFloat(usdtDepositAmt || "0") > (adminUsdtBal ? parseFloat(formatUnits(adminUsdtBal as bigint, 18)) : 0)}
                onClick={() => exec(
                  () => writeContractAsync({ address: CONTRACTS[chainId].usdt, abi: ERC20_ABI, functionName: "transfer", args: [CONTRACTS[chainId].staking, parseUnits(usdtDepositAmt, 18)] }),
                  `Deposited ${usdtDepositAmt} USDT into pool`,
                  refetchPoolBal,
                )}
              >Deposit</button>
            </div>
            {adminUsdtBal !== undefined && usdtDepositAmt && parseFloat(usdtDepositAmt) > parseFloat(formatUnits(adminUsdtBal as bigint, 18)) && (
              <p className="text-[11px] az-mono mt-1" style={{ color: "#ef4444" }}>Exceeds your wallet balance</p>
            )}
          </AdminCard>

          {/* Debit account (DB-tracked, affects available balance) */}
          <AdminCard title="Debit Available Balance">
            <p className="text-xs mb-3" style={{ color: "var(--muted)" }}>
              Records a deduction from the user&apos;s account balance (DB only — does not affect staked tokens or wallet). Balance can go negative and is corrected by future credits or claims.
            </p>
            <div className="space-y-3">
              <div>
                <label className="text-[11px] az-mono mb-1 block" style={{ color: "var(--muted)" }}>Wallet Address</label>
                <div className="flex gap-2">
                  <input
                    className="az-input flex-1"
                    placeholder="0x..."
                    value={debitAddr}
                    onChange={(e) => { setDebitAddr(e.target.value); setDebitBalance(null); }}
                  />
                  <button
                    className="px-3 rounded-ctl text-xs font-semibold"
                    style={{ background: "rgba(45,212,191,0.1)", color: "var(--teal)" }}
                    disabled={!isAddress(debitAddr)}
                    onClick={async () => {
                      const res = await fetch(`/api/admin/user-credit?wallet=${debitAddr}`);
                      const d = await res.json();
                      setDebitBalance(d.balance ?? 0);
                    }}
                  >Check</button>
                </div>
                {debitBalance !== null && (
                  <p className="text-[11px] az-mono mt-1" style={{ color: debitBalance < 0 ? "#ef4444" : "var(--teal)" }}>
                    Current balance: <strong>{debitBalance.toFixed(4)} AZR</strong>
                  </p>
                )}
              </div>
              <div>
                <label className="text-[11px] az-mono mb-1 block" style={{ color: "var(--muted)" }}>Amount to Debit (AZR)</label>
                <input className="az-input" placeholder="0.00" value={debitAmt} onChange={(e) => setDebitAmt(e.target.value)} type="number" />
              </div>
              <button
                className="az-btn-primary w-full"
                style={{ background: "rgba(239,68,68,0.15)", borderColor: "#ef4444", color: "#ef4444" }}
                disabled={debitLoading || !debitAmt || !isAddress(debitAddr) || parseFloat(debitAmt || "0") <= 0}
                onClick={async () => {
                  setDebitLoading(true);
                  try {
                    const res = await fetch("/api/admin/user-credit", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ wallet: debitAddr, delta: -Math.abs(Number(debitAmt)) }),
                    });
                    const d = await res.json();
                    if (!res.ok) { toast(d.error ?? "Failed", "error"); }
                    else { toast(`Debited ${debitAmt} AZR · new balance: ${d.balance.toFixed(4)}`); setDebitBalance(d.balance); setDebitAmt(""); }
                  } catch { toast("Network error", "error"); }
                  finally { setDebitLoading(false); }
                }}
              >{debitLoading ? <span className="flex items-center justify-center gap-2"><Spinner size="sm" /> Processing…</span> : "Debit Account"}</button>
            </div>
          </AdminCard>

          {/* Credit account (AZR transfer to wallet) */}
          <AdminCard title="Credit User Wallet">
            <p className="text-xs mb-1" style={{ color: "var(--muted)" }}>
              Sends AZR tokens directly to a user&apos;s wallet from your admin wallet. The user can then stake those tokens.
            </p>
            <p className="text-[11px] az-mono mb-3" style={{ color: "var(--muted)", opacity: 0.7 }}>
              Your AZR balance: <span style={{ color: "var(--teal)" }}>{adminAzrBal ? parseFloat(formatUnits(adminAzrBal as bigint, 18)).toFixed(2) : "—"} AZR</span>
            </p>
            <div className="space-y-3">
              <div>
                <label className="text-[11px] az-mono mb-1 block" style={{ color: "var(--muted)" }}>Recipient Wallet</label>
                <input className="az-input" placeholder="0x..." value={creditAddr} onChange={(e) => setCreditAddr(e.target.value)} />
              </div>
              <div>
                <label className="text-[11px] az-mono mb-1 block" style={{ color: "var(--muted)" }}>Amount (AZR)</label>
                <input className="az-input" placeholder="0.00" value={creditAmt} onChange={(e) => setCreditAmt(e.target.value)} type="number" />
                {isAddress(creditAddr) && creditAmt && adminAzrBal && parseFloat(creditAmt) > parseFloat(formatUnits(adminAzrBal as bigint, 18)) && (
                  <p className="text-[11px] az-mono mt-1" style={{ color: "#ef4444" }}>Exceeds your AZR balance</p>
                )}
              </div>
              <button
                className="az-btn-primary w-full"
                disabled={
                  txPending || !creditAmt || !isAddress(creditAddr) ||
                  (!!adminAzrBal && parseFloat(creditAmt || "0") > parseFloat(formatUnits(adminAzrBal as bigint, 18)))
                }
                onClick={() => exec(
                  () => writeContractAsync({ address: CONTRACTS[chainId].azoraToken, abi: ERC20_ABI, functionName: "transfer", args: [creditAddr as `0x${string}`, parseUnits(creditAmt, 18)] }),
                  `Sent ${creditAmt} AZR to ${creditAddr.slice(0, 8)}…`,
                )}
              >{txPending ? <span className="flex items-center justify-center gap-2"><Spinner size="sm" /> Processing…</span> : "Credit Wallet"}</button>
            </div>
          </AdminCard>

          {/* Withdrawal request controls */}
          <AdminCard title="Withdrawal Requests">
            <p className="text-xs mb-4" style={{ color: "var(--muted)" }}>
              Total: <strong>{reqCount !== undefined ? Number(reqCount as bigint) : "—"}</strong> &nbsp;·&nbsp;
              Pending: <strong style={{ color: pendingCount > 0 ? "var(--warn)" : "var(--text)" }}>{pendingCount}</strong> &nbsp;·&nbsp;
              Approved: <strong style={{ color: "var(--teal)" }}>{approvedCount}</strong> &nbsp;·&nbsp;
              Rejected: <strong style={{ color: "#ef4444" }}>{rejectedCount}</strong>
            </p>
            <div className="flex gap-2 mb-3">
              <input className="az-input flex-1" placeholder="Request ID (number)" value={withdrawId} onChange={(e) => setWithdrawId(e.target.value)} type="number" />
            </div>
            <div className="flex gap-2">
              <button
                className="az-btn-primary flex-1"
                disabled={txPending || !withdrawId}
                onClick={() => exec(
                  () => writeContractAsync({ address: CONTRACTS[chainId].staking, abi: STAKING_ABI, functionName: "approveWithdrawal", args: [BigInt(withdrawId)] }),
                  `Withdrawal #${withdrawId} approved`,
                  () => { refetchAllRequests(); refetchReqCount(); },
                )}
              >{txPending ? <Spinner size="sm" /> : "✓ Approve"}</button>
              <button
                className="az-btn-ghost flex-1"
                disabled={txPending || !withdrawId}
                onClick={() => exec(
                  () => writeContractAsync({ address: CONTRACTS[chainId].staking, abi: STAKING_ABI, functionName: "rejectWithdrawal", args: [BigInt(withdrawId)] }),
                  `Withdrawal #${withdrawId} rejected`,
                  () => { refetchAllRequests(); refetchReqCount(); },
                )}
              >✗ Reject</button>
            </div>
          </AdminCard>

          {/* Seed referral relationship in DB */}
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
                    const res = await fetch("/api/admin/seed-referral", {
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

          {/* Features requiring contract upgrade */}
          <AdminCard title="Planned Features">
            <div className="space-y-3 text-sm">
              <div className="rounded-ctl px-4 py-3" style={{ background: "rgba(243,186,47,0.08)", borderLeft: "2px solid #f3ba2f" }}>
                <div className="font-semibold text-xs mb-1" style={{ color: "#f3ba2f" }}>Wallet Blacklist</div>
                <p className="text-xs" style={{ color: "var(--text-2)" }}>
                  Blocking a wallet from staking on-chain requires a <code>blacklistWallet(address)</code> function in the smart contract. This is not in the current contract — add it in v2 and the admin UI will expose it automatically.
                </p>
              </div>
              <div className="rounded-ctl px-4 py-3" style={{ background: "rgba(243,186,47,0.08)", borderLeft: "2px solid #f3ba2f" }}>
                <div className="font-semibold text-xs mb-1" style={{ color: "#f3ba2f" }}>USDT Receiving Wallet</div>
                <p className="text-xs" style={{ color: "var(--text-2)" }}>
                  Currently, USDT from swaps stays inside the staking contract. To redirect it to an external wallet, the contract needs a <code>setTreasury(address)</code> function and a withdrawal mechanism. Add this in v2.
                </p>
              </div>
            </div>
          </AdminCard>

        </div>

        {/* Virtual withdrawal queue */}
        <AdminCard title="Virtual Withdrawal Queue">
          <p className="text-xs mb-4" style={{ color: "var(--muted)" }}>
            Pending withdrawals from the virtual balance system. Send the real tokens from your treasury wallet, paste the TX hash, and mark as sent. Balance is already deducted on submission — reject to refund.
          </p>
          <button className="az-btn-primary text-xs px-3 py-1.5 mb-4" onClick={fetchVirtualWithdrawals} disabled={vwLoading}>
            {vwLoading ? <Spinner size="sm" /> : "Refresh"}
          </button>
          {vwList.length === 0 ? (
            <p className="text-xs py-4 text-center" style={{ color: "var(--text-2)" }}>No pending virtual withdrawals.</p>
          ) : (
            <div className="space-y-3">
              {vwList.map((w) => (
                <div key={w.id} className="rounded-ctl p-3" style={{ background: "var(--bg-2)", border: "1px solid var(--line)" }}>
                  <div className="flex flex-wrap justify-between gap-2 mb-2 text-xs">
                    <span className="az-mono font-semibold">#{w.id} · {w.user?.username}.azr · {w.amount.toFixed(4)} {w.assetType === 0 ? "AZR" : "USDT"}</span>
                    <span className="az-mono" style={{ color: "var(--muted)" }}>To: {w.toWallet.slice(0,8)}…{w.toWallet.slice(-4)}</span>
                  </div>
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
                </div>
              ))}
            </div>
          )}
        </AdminCard>

        {/* All withdrawal requests table */}
        <AdminCard title="All Withdrawal Requests">
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <input
              className="az-input h-8 text-sm flex-1 min-w-[150px]"
              placeholder="Search username or address…"
              value={wSearch}
              onChange={(e) => setWSearch(e.target.value)}
            />
            <select
              className="rounded-ctl px-3 py-1.5 text-xs az-mono"
              style={{ background: "var(--bg-2)", border: "1px solid var(--line)", color: "var(--text-2)" }}
              value={wStatusFilter}
              onChange={(e) => setWStatusFilter(Number(e.target.value))}
            >
              <option value={-1}>All Status</option>
              <option value={0}>Pending</option>
              <option value={1}>Approved</option>
              <option value={2}>Rejected</option>
            </select>
            <select
              className="rounded-ctl px-3 py-1.5 text-xs az-mono"
              style={{ background: "var(--bg-2)", border: "1px solid var(--line)", color: "var(--text-2)" }}
              value={wAssetFilter}
              onChange={(e) => setWAssetFilter(Number(e.target.value))}
            >
              <option value={-1}>All Assets</option>
              <option value={0}>AZR</option>
              <option value={1}>USDT</option>
            </select>
          </div>
          {allRequests.length === 0 ? (
            <p className="text-sm py-4 text-center" style={{ color: "var(--text-2)" }}>No withdrawal requests yet.</p>
          ) : filteredRequests.length === 0 ? (
            <p className="text-sm py-4 text-center" style={{ color: "var(--text-2)" }}>No requests match the current filters.</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="az-mono text-[11px] uppercase" style={{ color: "var(--muted)" }}>
                      <th className="text-left pb-3 font-normal">#</th>
                      <th className="text-left pb-3 font-normal">Requester</th>
                      <th className="text-left pb-3 font-normal">Asset</th>
                      <th className="text-left pb-3 font-normal">Amount</th>
                      <th className="text-left pb-3 font-normal">Status</th>
                      <th className="text-left pb-3 font-normal">Date</th>
                      <th className="text-right pb-3 font-normal">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y" style={{ borderColor: "var(--line)" }}>
                    {filteredRequests.map(({ req, idx }) => {
                      const ASSET_LABEL = ["AZR", "USDT"];
                      const STATUS_LABEL = ["Pending", "Approved", "Rejected"];
                      const STATUS_COLOR = ["var(--warn)", "var(--teal)", "#ef4444"];
                      const isPending = req.status === 0;
                      return (
                        <tr key={req.id.toString()}>
                          <td className="py-3 az-mono text-xs" style={{ color: "var(--muted)" }}>#{Number(req.id)}</td>
                          <td className="py-3 az-mono text-xs" style={{ color: "var(--text-2)" }}>
                            {requestUsernames[idx] && (
                              <div className="font-semibold text-xs mb-0.5" style={{ color: "var(--text)" }}>{requestUsernames[idx]}</div>
                            )}
                            <div title={req.requester}>{req.requester.slice(0, 8)}…{req.requester.slice(-6)}</div>
                          </td>
                          <td className="py-3">
                            <span className="flex items-center gap-1.5">
                              <TokenIcon symbol={ASSET_LABEL[req.assetType] as "AZR" | "USDT"} size="sm" />
                              <span className="text-xs font-semibold">{ASSET_LABEL[req.assetType] ?? "?"}</span>
                            </span>
                          </td>
                          <td className="py-3 font-semibold az-mono">{parseFloat(formatUnits(req.amount, 18)).toFixed(4)}</td>
                          <td className="py-3">
                            <span className="az-mono text-xs font-semibold" style={{ color: STATUS_COLOR[req.status] ?? "var(--text-2)" }}>
                              {STATUS_LABEL[req.status] ?? "Unknown"}
                            </span>
                          </td>
                          <td className="py-3 text-xs az-mono" style={{ color: "var(--muted)" }}>
                            {new Date(Number(req.createdAt) * 1000).toLocaleDateString()}
                          </td>
                          <td className="py-3">
                            {isPending && (
                              <div className="flex gap-1.5 justify-end">
                                <button
                                  className="az-btn-primary text-xs px-2.5 py-1"
                                  disabled={txPending}
                                  onClick={() => exec(
                                    () => writeContractAsync({ address: CONTRACTS[chainId].staking, abi: STAKING_ABI, functionName: "approveWithdrawal", args: [req.id] }),
                                    `Withdrawal #${Number(req.id)} approved`,
                                    () => { refetchAllRequests(); refetchReqCount(); },
                                  )}
                                >{txPending ? <Spinner size="sm" /> : "✓"}</button>
                                <button
                                  className="az-btn-ghost text-xs px-2.5 py-1"
                                  disabled={txPending}
                                  onClick={() => exec(
                                    () => writeContractAsync({ address: CONTRACTS[chainId].staking, abi: STAKING_ABI, functionName: "rejectWithdrawal", args: [req.id] }),
                                    `Withdrawal #${Number(req.id)} rejected`,
                                    () => { refetchAllRequests(); refetchReqCount(); },
                                  )}
                                >✗</button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <p className="text-[11px] az-mono mt-3" style={{ color: "var(--muted)" }}>
                Showing {filteredRequests.length} of {allRequests.length} requests
              </p>
            </>
          )}
        </AdminCard>

        {/* Pause / unpause */}
        <AdminCard title="Contract Circuit Breaker">
          <p className="text-xs mb-4" style={{ color: "var(--muted)" }}>
            Pausing prevents all stake, swap, claim, and withdrawal operations. Use only in emergencies.
          </p>
          <div className="flex gap-3">
            <button
              className="az-btn-ghost flex-1"
              disabled={txPending || !!isPaused}
              onClick={() => exec(
                () => writeContractAsync({ address: CONTRACTS[chainId].staking, abi: STAKING_ABI, functionName: "pause", args: [] }),
                "Contract paused",
                refetchPaused,
              )}
            >⏸ Pause Contract</button>
            <button
              className="az-btn-primary flex-1"
              disabled={txPending || !isPaused}
              onClick={() => exec(
                () => writeContractAsync({ address: CONTRACTS[chainId].staking, abi: STAKING_ABI, functionName: "unpause", args: [] }),
                "Contract unpaused — all operations resumed",
                refetchPaused,
              )}
            >▶ Unpause Contract</button>
          </div>
        </AdminCard>

      </div>
    </>
  );
}
