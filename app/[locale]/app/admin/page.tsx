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
  const [creditAmt, setCreditAmt] = useState("");
  const [creditAddr, setCreditAddr] = useState("");
  const [withdrawId, setWithdrawId] = useState("");
  const [seedWallet, setSeedWallet] = useState("");
  const [seedReferrer, setSeedReferrer] = useState("");
  const [seedLoading, setSeedLoading] = useState(false);

  // Live staked balance for debit target
  const { data: targetStaked } = useReadContract({
    address: CONTRACTS[chainId].staking,
    abi: STAKING_ABI,
    functionName: "getTotalStaked",
    args: isAddress(debitAddr) ? [debitAddr as `0x${string}`] : undefined,
    query: { enabled: isAddress(debitAddr) },
  });
  const targetStakedAmt = targetStaked ? parseFloat(formatUnits(targetStaked as bigint, 18)) : 0;

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
    });

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

          {/* Debit account */}
          <AdminCard title="Debit User Account">
            <p className="text-xs mb-1" style={{ color: "var(--muted)" }}>
              Deducts AZR from a user&apos;s staked balance. The contract removes from the user&apos;s oldest active stake first, then continues to the next until the full amount is covered.
            </p>
            <p className="text-[11px] az-mono mb-3" style={{ color: "var(--muted)", opacity: 0.7 }}>
              If the user has 3 positions (500, 300, 200 AZR) and you debit 600 AZR, position #1 is fully removed and 100 AZR is taken from position #2.
            </p>
            <div className="space-y-3">
              <div>
                <label className="text-[11px] az-mono mb-1 block" style={{ color: "var(--muted)" }}>Wallet Address</label>
                <input className="az-input" placeholder="0x..." value={debitAddr} onChange={(e) => setDebitAddr(e.target.value)} />
                {isAddress(debitAddr) && (
                  <p className="text-[11px] az-mono mt-1" style={{ color: "var(--muted)" }}>
                    Total staked: <span style={{ color: "var(--teal)" }}>{targetStakedAmt.toFixed(4)} AZR</span>
                  </p>
                )}
              </div>
              <div>
                <label className="text-[11px] az-mono mb-1 block" style={{ color: "var(--muted)" }}>Amount (AZR)</label>
                <input className="az-input" placeholder="0.00" value={debitAmt} onChange={(e) => setDebitAmt(e.target.value)} type="number" />
                {isAddress(debitAddr) && debitAmt && parseFloat(debitAmt) > targetStakedAmt && (
                  <p className="text-[11px] az-mono mt-1" style={{ color: "#ef4444" }}>Exceeds staked balance</p>
                )}
              </div>
              <button
                className="az-btn-primary w-full"
                style={{ background: "rgba(239,68,68,0.15)", borderColor: "#ef4444", color: "#ef4444" }}
                disabled={txPending || !debitAmt || !isAddress(debitAddr) || parseFloat(debitAmt || "0") > targetStakedAmt || targetStakedAmt === 0}
                onClick={() => exec(
                  () => writeContractAsync({ address: CONTRACTS[chainId].staking, abi: STAKING_ABI, functionName: "debitAccount", args: [debitAddr as `0x${string}`, parseUnits(debitAmt, 18)] }),
                  `Debited ${debitAmt} AZR from ${debitAddr.slice(0, 8)}…`,
                )}
              >{txPending ? <span className="flex items-center justify-center gap-2"><Spinner size="sm" /> Processing…</span> : "Debit Account"}</button>
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
          <AdminCard title="Seed Referral Link (DB)">
            <p className="text-xs mb-3" style={{ color: "var(--muted)" }}>
              Manually link a referred user to their referrer in the database. Use this when a user registered without the referral link but you know they belong to a referrer&apos;s network. Both users must have visited the app at least once.
            </p>
            <div className="space-y-3">
              <div>
                <label className="text-[11px] az-mono mb-1 block" style={{ color: "var(--muted)" }}>Referred User Wallet Address</label>
                <input className="az-input" placeholder="0x..." value={seedWallet} onChange={(e) => setSeedWallet(e.target.value)} />
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
                      body: JSON.stringify({ walletAddress: seedWallet, referrerUsername: seedReferrer }),
                    });
                    const data = await res.json();
                    if (!res.ok) { toast(data.error ?? "Failed", "error"); }
                    else { toast(`Linked ${data.updated?.username} → ${seedReferrer}`); setSeedWallet(""); setSeedReferrer(""); }
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
