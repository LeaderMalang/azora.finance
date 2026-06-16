"use client";

import { AppTopbar } from "@/components/app/AppTopbar";
import { useTranslations } from "next-intl";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, usePublicClient } from "wagmi";
import { CONTRACTS, ERC20_ABI, STAKING_ABI, REWARDS_CLAIMED_EVENT, STAKING_DEPLOY_BLOCK } from "@/lib/contracts";
import { useActiveChain } from "@/lib/hooks";
import { formatUnits, parseUnits } from "viem";
import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/components/ui/Toast";

type StakePosition = {
  id: bigint;
  amount: bigint;
  startTime: bigint;
  lastClaimTime: bigint;
  unlockTime: bigint;
  active: boolean;
};

export default function StakePage() {
  const t = useTranslations("staking");
  const { address: addr } = useAccount();
  const { toast } = useToast();
  const { chainId } = useActiveChain();

  const [amount, setAmount] = useState("");
  const [claimHistory, setClaimHistory] = useState<{ date: string; amount: string }[]>([]);

  const { writeContractAsync, data: txHash } = useWriteContract();
  const { isLoading: confirming } = useWaitForTransactionReceipt({ hash: txHash });
  const publicClient = usePublicClient({ chainId: chainId as 56 | 97 });

  const { data: azrBal } = useReadContract({ address: CONTRACTS[chainId].azoraToken, abi: ERC20_ABI, functionName: "balanceOf", args: addr ? [addr] : undefined, query: { enabled: !!addr } });
  const { data: minStake } = useReadContract({ address: CONTRACTS[chainId].staking, abi: STAKING_ABI, functionName: "minStakeAmount", query: { enabled: true } });
  const { data: lockPeriod } = useReadContract({ address: CONTRACTS[chainId].staking, abi: STAKING_ABI, functionName: "lockPeriod", query: { enabled: true } });
  const { data: rawPositions, refetch: refetchPositions } = useReadContract({
    address: CONTRACTS[chainId].staking,
    abi: STAKING_ABI,
    functionName: "getUserStakes",
    args: addr ? [addr] : undefined,
    query: { enabled: !!addr },
  });

  // Auto-fetch the referrer registered at sign-up — no manual input needed
  const { data: selfUserInfo } = useReadContract({
    address: CONTRACTS[chainId].staking,
    abi: STAKING_ABI,
    functionName: "usersByAddress",
    args: addr ? [addr] : undefined,
    query: { enabled: !!addr },
  });
  const selfUsername = (selfUserInfo?.[1] as string) ?? "";

  const { data: referredByData } = useReadContract({
    address: CONTRACTS[chainId].staking,
    abi: STAKING_ABI,
    functionName: "referredBy",
    args: selfUsername ? [selfUsername] : undefined,
    query: { enabled: !!selfUsername },
  });
  const autoReferrer = (referredByData as string) ?? "";

  const azrBalance = azrBal ? parseFloat(formatUnits(azrBal as bigint, 18)) : 0;
  const minStakeAmt = minStake ? parseFloat(formatUnits(minStake as bigint, 18)) : 50;
  const lockDays = lockPeriod ? Math.floor(Number(lockPeriod as bigint) / 86400) : 150;

  const positions: StakePosition[] = (rawPositions as StakePosition[] | undefined) ?? [];
  const activePositions = positions.filter((p) => p.active);
  const estDaily = amount ? (parseFloat(amount) * 0.007).toFixed(2) : "0.00";

  // Fetch claim history from events — use deploy block to avoid RPC range-limit errors
  const fetchClaimHistory = useCallback(async () => {
    if (!addr || !publicClient) return;
    try {
      const logs = await publicClient.getLogs({
        address: CONTRACTS[chainId].staking,
        event: REWARDS_CLAIMED_EVENT,
        args: { user: addr },
        fromBlock: STAKING_DEPLOY_BLOCK,
        toBlock: "latest",
      });
      const history = await Promise.all(
        logs.map(async (log) => {
          const block = await publicClient.getBlock({ blockNumber: log.blockNumber! });
          return {
            date: new Date(Number(block.timestamp) * 1000).toLocaleString(),
            amount: parseFloat(formatUnits((log.args as { amount: bigint }).amount, 18)).toFixed(4),
          };
        })
      );
      setClaimHistory(history.reverse());
    } catch {
      // silently ignore
    }
  }, [addr, publicClient, chainId]);

  useEffect(() => { fetchClaimHistory(); }, [fetchClaimHistory]);

  const doStake = async () => {
    if (!addr || !amount) return;
    if (parseFloat(amount) > azrBalance) {
      toast("Insufficient AZR balance", "error");
      return;
    }
    const parsed = parseUnits(amount, 18);
    try {
      const approveHash = await writeContractAsync({ address: CONTRACTS[chainId].azoraToken, abi: ERC20_ABI, functionName: "approve", args: [CONTRACTS[chainId].staking, parsed] });
      await publicClient!.waitForTransactionReceipt({ hash: approveHash });
      await writeContractAsync({ address: CONTRACTS[chainId].staking, abi: STAKING_ABI, functionName: "stake", args: [parsed, autoReferrer] });
      toast(`Staked ${amount} AZR · locked ${lockDays} days`);
      setAmount("");
      setTimeout(() => refetchPositions(), 3000);
    } catch (e) {
      toast(e instanceof Error ? e.message.slice(0, 100) : "Transaction failed", "error");
    }
  };

  const doClaim = async (stakeId: bigint) => {
    if (!addr) return;
    try {
      const hash = await writeContractAsync({ address: CONTRACTS[chainId].staking, abi: STAKING_ABI, functionName: "claimRewards", args: [stakeId] });
      toast("Rewards claimed to balance");
      await publicClient!.waitForTransactionReceipt({ hash });
      refetchPositions();
      fetchClaimHistory();
    } catch (e) {
      toast(e instanceof Error ? e.message.slice(0, 100) : "Claim failed", "error");
    }
  };

  const doClaimAll = async () => {
    if (!addr) return;
    try {
      const hash = await writeContractAsync({ address: CONTRACTS[chainId].staking, abi: STAKING_ABI, functionName: "claimAllRewards", args: [] });
      toast("All rewards claimed");
      await publicClient!.waitForTransactionReceipt({ hash });
      refetchPositions();
      fetchClaimHistory();
    } catch (e) {
      toast(e instanceof Error ? e.message.slice(0, 100) : "Claim failed", "error");
    }
  };

  const doUnstake = async (stakeId: bigint, unlockTime: bigint) => {
    if (!addr) return;
    if (Date.now() / 1000 < Number(unlockTime)) {
      toast("Lock period has not expired yet", "error");
      return;
    }
    try {
      await writeContractAsync({ address: CONTRACTS[chainId].staking, abi: STAKING_ABI, functionName: "unstake", args: [stakeId] });
      toast("Unstaked · principal + rewards returned");
      setTimeout(() => refetchPositions(), 3000);
    } catch (e) {
      toast(e instanceof Error ? e.message.slice(0, 100) : "Unstake failed", "error");
    }
  };

  return (
    <>
      <AppTopbar title={t("title")} sub={`Lock AZR for ${lockDays} days · 0.7% daily`} />
      <div className="p-4 md:p-8 max-w-app">

        {/* New stake form */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="az-card">
            <h3 className="font-semibold mb-5">New Stake</h3>
            <div className="mb-5">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs az-mono" style={{ color: "var(--muted)" }}>Amount (AZR)</label>
                <span className="text-xs az-mono" style={{ color: "var(--muted)" }}>Balance: {azrBalance.toFixed(2)}</span>
              </div>
              <div className="flex gap-2">
                <input className="az-input flex-1" type="number" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} />
                <button className="px-3 rounded-ctl text-xs font-semibold" style={{ background: "rgba(45,212,191,0.1)", color: "var(--teal)" }} onClick={() => setAmount(azrBalance.toFixed(2))}>MAX</button>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 mb-5 p-3 rounded-ctl" style={{ background: "var(--bg-2)" }}>
              {[
                { k: t("minStake"), v: `${minStakeAmt} AZR` },
                { k: t("lockPeriod"), v: `${lockDays}d` },
                { k: t("daily"), v: "0.7%" },
              ].map((s) => (
                <div key={s.k} className="text-center">
                  <div className="text-[11px] az-mono" style={{ color: "var(--muted)" }}>{s.k}</div>
                  <div className="text-sm font-semibold az-mono mt-1">{s.v}</div>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between mb-5 text-sm">
              <span style={{ color: "var(--text-2)" }}>{t("estDaily")}</span>
              <span className="font-bold az-mono text-teal">+{estDaily} AZR</span>
            </div>
            <button className="az-btn-primary w-full" onClick={doStake} disabled={confirming || !amount || parseFloat(amount || "0") > azrBalance}>
              {confirming ? t("staking") : t("stakeBtn")}
            </button>
          </div>

          {/* Summary card */}
          <div className="az-card-glow">
            <h3 className="font-semibold mb-4">Your Positions</h3>
            {activePositions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-sm" style={{ color: "var(--text-2)" }}>
                <p>No active positions.</p>
                <p className="text-xs mt-1" style={{ color: "var(--muted)" }}>Stake AZR to start earning 0.7% daily.</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3 mb-5">
                  <div className="rounded-ctl px-3 py-2.5" style={{ background: "var(--bg-2)" }}>
                    <div className="text-[11px] az-mono mb-1" style={{ color: "var(--muted)" }}>Active positions</div>
                    <div className="font-bold az-mono" style={{ color: "var(--teal)" }}>{activePositions.length}</div>
                  </div>
                  <div className="rounded-ctl px-3 py-2.5" style={{ background: "var(--bg-2)" }}>
                    <div className="text-[11px] az-mono mb-1" style={{ color: "var(--muted)" }}>Total staked</div>
                    <div className="font-bold az-mono">
                      {parseFloat(formatUnits(activePositions.reduce((s, p) => s + p.amount, BigInt(0)), 18)).toFixed(2)} AZR
                    </div>
                  </div>
                </div>
                {activePositions.length > 1 && (
                  <button className="az-btn-primary w-full mb-4 text-sm" onClick={doClaimAll} disabled={confirming}>
                    Claim All Rewards
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Active positions table */}
        {activePositions.length > 0 && (
          <div className="az-card mb-6">
            <h3 className="font-semibold mb-4">Active Positions</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="az-mono text-[11px] uppercase" style={{ color: "var(--muted)" }}>
                    <th className="text-left pb-3 font-normal">#</th>
                    <th className="text-left pb-3 font-normal">Staked</th>
                    <th className="text-left pb-3 font-normal">Unlocks</th>
                    <th className="text-left pb-3 font-normal">Progress</th>
                    <th className="text-right pb-3 font-normal">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: "var(--line)" }}>
                  {activePositions.map((pos) => {
                    const now = Date.now() / 1000;
                    const start = Number(pos.startTime);
                    const unlock = Number(pos.unlockTime);
                    const progress = Math.min(100, Math.round(((now - start) / (unlock - start)) * 100));
                    const unlocked = now >= unlock;
                    return (
                      <tr key={pos.id.toString()}>
                        <td className="py-3 az-mono text-xs" style={{ color: "var(--muted)" }}>#{Number(pos.id)}</td>
                        <td className="py-3 font-semibold az-mono">
                          {parseFloat(formatUnits(pos.amount, 18)).toFixed(2)} AZR
                        </td>
                        <td className="py-3 az-mono text-xs" style={{ color: unlocked ? "var(--teal)" : "var(--text-2)" }}>
                          {unlocked ? "Unlocked ✓" : new Date(unlock * 1000).toLocaleDateString()}
                        </td>
                        <td className="py-3 w-28">
                          <div className="prog-bar">
                            <div className="prog-fill" style={{ width: `${progress}%` }} />
                          </div>
                          <div className="text-[11px] mt-1 az-mono" style={{ color: "var(--muted)" }}>{progress}%</div>
                        </td>
                        <td className="py-3">
                          <div className="flex gap-2 justify-end">
                            <button
                              className="az-btn-primary text-xs px-3 py-1.5"
                              onClick={() => doClaim(pos.id)}
                              disabled={confirming}
                            >
                              Claim
                            </button>
                            <button
                              className="az-btn-ghost text-xs px-3 py-1.5"
                              onClick={() => doUnstake(pos.id, pos.unlockTime)}
                              disabled={confirming || !unlocked}
                            >
                              Unstake
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Claim history */}
        {addr && (
          <div className="az-card">
            <h3 className="font-semibold mb-4">Claim History</h3>
            {claimHistory.length === 0 ? (
              <div className="py-8 text-center text-sm" style={{ color: "var(--text-2)" }}>
                No claim history yet. Claim your rewards to see them here.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="az-mono text-[11px] uppercase" style={{ color: "var(--muted)" }}>
                      <th className="text-left pb-3 font-normal">#</th>
                      <th className="text-left pb-3 font-normal">Date</th>
                      <th className="text-right pb-3 font-normal">Amount (AZR)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y" style={{ borderColor: "var(--line)" }}>
                    {claimHistory.map((c, i) => (
                      <tr key={i}>
                        <td className="py-2.5 az-mono text-xs" style={{ color: "var(--muted)" }}>{claimHistory.length - i}</td>
                        <td className="py-2.5 text-xs" style={{ color: "var(--text-2)" }}>{c.date}</td>
                        <td className="py-2.5 az-mono text-right font-semibold" style={{ color: "var(--teal)" }}>+{c.amount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
