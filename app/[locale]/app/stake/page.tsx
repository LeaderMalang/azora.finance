"use client";

import { AppTopbar } from "@/components/app/AppTopbar";
import { useTranslations } from "next-intl";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { CONTRACTS, ERC20_ABI, STAKING_ABI } from "@/lib/contracts";
import { useActiveChain } from "@/lib/hooks";
import { formatUnits, parseUnits } from "viem";
import { useState, useEffect } from "react";
import { useToast } from "@/components/ui/Toast";

export default function StakePage() {
  const t = useTranslations("staking");
  const { address: addr } = useAccount();
  const { toast } = useToast();
  const { chainId } = useActiveChain();

  const [amount, setAmount] = useState("");
  const [referral, setReferral] = useState("");
  const [pendingDisplay, setPendingDisplay] = useState("0.0000");

  const { writeContractAsync, data: txHash } = useWriteContract();
  const { isLoading: confirming } = useWaitForTransactionReceipt({ hash: txHash });

  const { data: azrBal } = useReadContract({ address: CONTRACTS[chainId].azoraToken, abi: ERC20_ABI, functionName: "balanceOf", args: addr ? [addr] : undefined, query: { enabled: !!addr } });
  const { data: minStake } = useReadContract({ address: CONTRACTS[chainId].staking, abi: STAKING_ABI, functionName: "minStakeAmount", query: { enabled: true } });
  const { data: lockPeriod } = useReadContract({ address: CONTRACTS[chainId].staking, abi: STAKING_ABI, functionName: "lockPeriod", query: { enabled: true } });
  const { data: userInfo } = useReadContract({ address: CONTRACTS[chainId].staking, abi: STAKING_ABI, functionName: "getUserInfo", args: addr ? [addr] : undefined, query: { enabled: !!addr } });

  const azrBalance = azrBal ? parseFloat(formatUnits(azrBal as bigint, 18)) : 0;
  const minStakeAmt = minStake ? parseFloat(formatUnits(minStake as bigint, 18)) : 50;
  const lockDays = lockPeriod ? Math.floor(Number(lockPeriod as bigint) / 86400) : 150;
  const hasStake = userInfo ? (userInfo[7] as boolean) : false;
  const staked = userInfo ? parseFloat(formatUnits(userInfo[3] as bigint, 18)) : 0;
  const lastClaim = userInfo ? Number(userInfo[5] as bigint) * 1000 : Date.now();
  const unlockTime = userInfo ? new Date(Number(userInfo[6] as bigint) * 1000).toLocaleDateString() : "—";

  useEffect(() => {
    if (!hasStake || !staked) return;
    const RATE = 0.007 / 86400;
    const id = setInterval(() => {
      const elapsed = (Date.now() - lastClaim) / 1000;
      setPendingDisplay((staked * RATE * elapsed).toFixed(4));
    }, 1000);
    return () => clearInterval(id);
  }, [hasStake, staked, lastClaim]);

  const estDaily = amount ? (parseFloat(amount) * 0.007).toFixed(2) : "0.00";

  const doStake = async () => {
    if (!addr || !amount) return;
    const parsed = parseUnits(amount, 18);
    try {
      await writeContractAsync({ address: CONTRACTS[chainId].azoraToken, abi: ERC20_ABI, functionName: "approve", args: [CONTRACTS[chainId].staking, parsed] });
      await writeContractAsync({ address: CONTRACTS[chainId].staking, abi: STAKING_ABI, functionName: "stake", args: [parsed, referral.replace(/\.azr$/, "")] });
      toast(`Staked ${amount} AZR · locked ${lockDays} days`);
      setAmount("");
    } catch (e) {
      toast(e instanceof Error ? e.message.slice(0, 100) : "Transaction failed", "error");
    }
  };

  const doClaim = async () => {
    if (!addr) return;
    try {
      await writeContractAsync({ address: CONTRACTS[chainId].staking, abi: STAKING_ABI, functionName: "claimRewards", args: [] });
      toast("Rewards claimed to balance");
    } catch (e) {
      toast(e instanceof Error ? e.message.slice(0, 100) : "Claim failed", "error");
    }
  };

  const doUnstake = async () => {
    if (!addr) return;
    try {
      await writeContractAsync({ address: CONTRACTS[chainId].staking, abi: STAKING_ABI, functionName: "unstake", args: [] });
      toast("Unstaked · principal + rewards returned");
    } catch (e) {
      toast(e instanceof Error ? e.message.slice(0, 100) : "Unstake failed", "error");
    }
  };

  return (
    <>
      <AppTopbar title={t("title")} sub={`Lock AZR for ${lockDays} days · 0.7% daily`} />
      <div className="p-8 max-w-app">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="az-card">
            <h3 className="font-semibold mb-5">New Stake</h3>
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs az-mono" style={{ color: "var(--muted)" }}>Amount (AZR)</label>
                <span className="text-xs az-mono" style={{ color: "var(--muted)" }}>Balance: {azrBalance.toFixed(2)}</span>
              </div>
              <div className="flex gap-2">
                <input className="az-input flex-1" type="number" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} />
                <button className="px-3 rounded-ctl text-xs font-semibold" style={{ background: "rgba(45,212,191,0.1)", color: "var(--teal)" }} onClick={() => setAmount(azrBalance.toFixed(2))}>MAX</button>
              </div>
            </div>
            <div className="mb-4">
              <label className="text-xs az-mono mb-2 block" style={{ color: "var(--muted)" }}>Referral (optional)</label>
              <input className="az-input" placeholder="friend.azr" value={referral} onChange={(e) => setReferral(e.target.value)} />
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
            <button className="az-btn-primary w-full" onClick={doStake} disabled={confirming || !amount || hasStake}>
              {confirming ? t("staking") : t("stakeBtn")}
            </button>
            {hasStake && <p className="text-xs text-center mt-2" style={{ color: "var(--muted)" }}>You already have an active stake.</p>}
          </div>

          {hasStake && (
            <div className="az-card-glow">
              <h3 className="font-semibold mb-5">Active Position</h3>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-sm" style={{ color: "var(--text-2)" }}>Staked</span>
                  <span className="font-bold az-mono">{staked.toFixed(2)} AZR</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm" style={{ color: "var(--text-2)" }}>{t("pending")}</span>
                  <span className="font-bold az-mono text-teal">{pendingDisplay} AZR</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm" style={{ color: "var(--text-2)" }}>{t("lockedUntil")}</span>
                  <span className="az-mono text-sm">{unlockTime}</span>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button className="az-btn-primary flex-1" onClick={doClaim} disabled={confirming}>{t("claim")}</button>
                <button
                  className="az-btn-ghost flex-1"
                  onClick={doUnstake}
                  disabled={confirming || (userInfo ? Date.now() / 1000 < Number(userInfo[6] as bigint) : true)}
                >
                  {t("unstake")}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
