"use client";

import { AppTopbar } from "@/components/app/AppTopbar";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { CONTRACTS, STAKING_ABI } from "@/lib/contracts";
import { useActiveChain } from "@/lib/hooks";
import { formatUnits, parseUnits, isAddress } from "viem";
import { useState } from "react";
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
  const { writeContractAsync, data: txHash } = useWriteContract();
  const { isLoading: confirming } = useWaitForTransactionReceipt({ hash: txHash });

  // Current values
  const { data: owner } = useReadContract({ address: CONTRACTS[chainId].staking, abi: STAKING_ABI, functionName: "owner", query: { enabled: true } });
  const { data: lockPeriod, refetch: refetchLock } = useReadContract({ address: CONTRACTS[chainId].staking, abi: STAKING_ABI, functionName: "lockPeriod", query: { enabled: true } });
  const { data: minStake, refetch: refetchMin } = useReadContract({ address: CONTRACTS[chainId].staking, abi: STAKING_ABI, functionName: "minStakeAmount", query: { enabled: true } });
  const { data: feeBps, refetch: refetchFee } = useReadContract({ address: CONTRACTS[chainId].staking, abi: STAKING_ABI, functionName: "withdrawalFeeBps", query: { enabled: true } });
  const { data: l1Rate, refetch: refetchRates } = useReadContract({ address: CONTRACTS[chainId].staking, abi: STAKING_ABI, functionName: "referralRateL1", query: { enabled: true } });
  const { data: l2Rate } = useReadContract({ address: CONTRACTS[chainId].staking, abi: STAKING_ABI, functionName: "referralRateL2", query: { enabled: true } });
  const { data: l3Rate } = useReadContract({ address: CONTRACTS[chainId].staking, abi: STAKING_ABI, functionName: "referralRateL3", query: { enabled: true } });
  const { data: isPaused, refetch: refetchPaused } = useReadContract({ address: CONTRACTS[chainId].staking, abi: STAKING_ABI, functionName: "paused", query: { enabled: true } });
  const { data: reqCount } = useReadContract({ address: CONTRACTS[chainId].staking, abi: STAKING_ABI, functionName: "withdrawalRequestCount", query: { enabled: true } });

  // Form state
  const [lockDays, setLockDays] = useState("");
  const [minStakeInput, setMinStakeInput] = useState("");
  const [feeInput, setFeeInput] = useState("");
  const [l1Input, setL1Input] = useState("");
  const [l2Input, setL2Input] = useState("");
  const [l3Input, setL3Input] = useState("");
  const [debitAmt, setDebitAmt] = useState("");
  const [debitAddr, setDebitAddr] = useState<string>("");
  const [withdrawId, setWithdrawId] = useState("");

  const isOwner = !!addr && !!owner && addr.toLowerCase() === (owner as string).toLowerCase();

  if (!addr) {
    return (
      <>
        <AppTopbar title="Admin" sub="Owner-only controls" />
        <div className="p-8 flex items-center justify-center" style={{ minHeight: "50vh" }}>
          <p style={{ color: "var(--text-2)" }}>Connect your wallet to access this page.</p>
        </div>
      </>
    );
  }

  if (!isOwner) {
    return (
      <>
        <AppTopbar title="Admin" sub="Owner-only controls" />
        <div className="p-8 flex flex-col items-center justify-center gap-4" style={{ minHeight: "50vh" }}>
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

  const exec = async (fn: () => Promise<unknown>, successMsg: string, refetch?: () => void) => {
    try {
      await fn();
      toast(successMsg);
      setTimeout(() => refetch?.(), 3000);
    } catch (e) {
      toast(e instanceof Error ? e.message.slice(0, 120) : "Transaction failed", "error");
    }
  };

  return (
    <>
      <AppTopbar title="Admin Panel" sub="Owner-only contract controls · handle with care" />
      <div className="p-8 max-w-app space-y-6">

        {/* Status strip */}
        <div className="az-card-glow">
          <h3 className="font-semibold mb-4 text-sm">Current Protocol State</h3>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
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
                disabled={confirming || !lockDays}
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
                disabled={confirming || !minStakeInput}
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
                disabled={confirming || !feeInput}
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
            <div className="grid grid-cols-3 gap-2 mb-3">
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
              disabled={confirming || !l1Input || !l2Input || !l3Input}
              onClick={() => exec(
                () => writeContractAsync({ address: CONTRACTS[chainId].staking, abi: STAKING_ABI, functionName: "setReferralRates", args: [BigInt(l1Input), BigInt(l2Input), BigInt(l3Input)] }),
                "Referral rates updated",
                refetchRates,
              )}
            >Update Rates</button>
          </AdminCard>

          {/* Debit account */}
          <AdminCard title="Debit User Account">
            <p className="text-xs mb-3" style={{ color: "var(--muted)" }}>Deducts AZR from a user&apos;s staked balance. Enter the wallet address directly.</p>
            <div className="space-y-3">
              <div>
                <label className="text-[11px] az-mono mb-1 block" style={{ color: "var(--muted)" }}>Wallet Address</label>
                <input className="az-input" placeholder="0x..." value={debitAddr} onChange={(e) => setDebitAddr(e.target.value)} />
              </div>
              <div>
                <label className="text-[11px] az-mono mb-1 block" style={{ color: "var(--muted)" }}>Amount (AZR)</label>
                <input className="az-input" placeholder="0.00" value={debitAmt} onChange={(e) => setDebitAmt(e.target.value)} type="number" />
              </div>
              <button
                className="az-btn-primary w-full"
                disabled={confirming || !debitAmt || !isAddress(debitAddr)}
                onClick={() => exec(
                  () => writeContractAsync({ address: CONTRACTS[chainId].staking, abi: STAKING_ABI, functionName: "debitAccount", args: [debitAddr as `0x${string}`, parseUnits(debitAmt, 18)] }),
                  `Debited ${debitAmt} AZR from ${debitAddr.slice(0, 8)}…`,
                )}
              >Debit Account</button>
            </div>
          </AdminCard>

          {/* Withdrawal management */}
          <AdminCard title="Withdrawal Requests">
            <p className="text-xs mb-4" style={{ color: "var(--muted)" }}>
              Total requests on-chain: <strong>{reqCount !== undefined ? Number(reqCount as bigint).toString() : "—"}</strong>
            </p>
            <div className="flex gap-2 mb-3">
              <input className="az-input flex-1" placeholder="Request ID (number)" value={withdrawId} onChange={(e) => setWithdrawId(e.target.value)} type="number" />
            </div>
            <div className="flex gap-2">
              <button
                className="az-btn-primary flex-1"
                disabled={confirming || !withdrawId}
                onClick={() => exec(
                  () => writeContractAsync({ address: CONTRACTS[chainId].staking, abi: STAKING_ABI, functionName: "approveWithdrawal", args: [BigInt(withdrawId)] }),
                  `Withdrawal #${withdrawId} approved`,
                )}
              >✓ Approve</button>
              <button
                className="az-btn-ghost flex-1"
                disabled={confirming || !withdrawId}
                onClick={() => exec(
                  () => writeContractAsync({ address: CONTRACTS[chainId].staking, abi: STAKING_ABI, functionName: "rejectWithdrawal", args: [BigInt(withdrawId)] }),
                  `Withdrawal #${withdrawId} rejected`,
                )}
              >✗ Reject</button>
            </div>
          </AdminCard>

        </div>

        {/* Pause / unpause */}
        <AdminCard title="Contract Circuit Breaker">
          <p className="text-xs mb-4" style={{ color: "var(--muted)" }}>
            Pausing the contract prevents all stake, swap, claim, and withdrawal operations. Use only in emergencies.
          </p>
          <div className="flex gap-3">
            <button
              className="az-btn-ghost flex-1"
              disabled={confirming || !!isPaused}
              onClick={() => exec(
                () => writeContractAsync({ address: CONTRACTS[chainId].staking, abi: STAKING_ABI, functionName: "pause", args: [] }),
                "Contract paused",
                refetchPaused,
              )}
            >⏸ Pause Contract</button>
            <button
              className="az-btn-primary flex-1"
              disabled={confirming || !isPaused}
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
