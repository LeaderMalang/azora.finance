"use client";

import { AppTopbar } from "@/components/app/AppTopbar";
import { useTranslations } from "next-intl";
import { useAccount, useReadContract } from "wagmi";
import { CONTRACTS, STAKING_ABI } from "@/lib/contracts";
import { useActiveChain } from "@/lib/hooks";
import { formatUnits } from "viem";
import { useEffect, useState } from "react";

function KpiCard({ label, value, unit, sub, glow }: { label: string; value: string; unit?: string; sub?: string; glow?: boolean }) {
  return (
    <div className={glow ? "az-card-glow" : "az-card"}>
      <div className="text-xs az-mono mb-3" style={{ color: "var(--muted)" }}>{label}</div>
      <div className="font-display font-bold text-3xl mb-1" style={{ color: glow ? "var(--teal)" : "var(--text)" }}>
        {value} {unit && <span className="text-xl font-normal" style={{ color: "var(--muted)" }}>{unit}</span>}
      </div>
      {sub && <div className="text-xs" style={{ color: "var(--muted)" }}>{sub}</div>}
    </div>
  );
}

const RATE_PER_SEC = 0.007 / 86400;

export default function DashboardPage() {
  const t = useTranslations("dashboard");
  const { address: addr } = useAccount();
  const { chainId } = useActiveChain();

  const { data: userInfo } = useReadContract({
    address: CONTRACTS[chainId].staking,
    abi: STAKING_ABI,
    functionName: "getUserInfo",
    args: addr ? [addr] : undefined,
    query: { enabled: !!addr },
  });

  useReadContract({
    address: CONTRACTS[chainId].staking,
    abi: STAKING_ABI,
    functionName: "getPendingRewards",
    args: addr ? [addr] : undefined,
    query: { enabled: !!addr },
  });

  const [pendingDisplay, setPendingDisplay] = useState<string>("0.0000");

  useEffect(() => {
    if (!userInfo || !userInfo[3]) return;
    const stakedBig = BigInt(userInfo[3] as bigint);
    const lastClaim = Number(userInfo[5] as bigint) * 1000;
    const id = setInterval(() => {
      const elapsed = (Date.now() - lastClaim) / 1000;
      const pending = parseFloat(formatUnits(stakedBig, 18)) * RATE_PER_SEC * elapsed;
      setPendingDisplay(pending.toFixed(4));
    }, 1000);
    return () => clearInterval(id);
  }, [userInfo]);

  const staked = userInfo ? parseFloat(formatUnits(userInfo[3] as bigint, 18)) : 0;
  const hasStake = userInfo ? (userInfo[7] as boolean) : false;
  const unlockTime = userInfo ? new Date(Number(userInfo[6] as bigint) * 1000).toLocaleDateString() : "—";
  const lockProgress = userInfo && hasStake ? Math.min(100, Math.round(((Date.now() / 1000 - Number(userInfo[4] as bigint)) / (Number(userInfo[6] as bigint) - Number(userInfo[4] as bigint))) * 100)) : 0;

  return (
    <>
      <AppTopbar title={t("title")} sub="Your positions, earnings & rewards" />
      <div className="p-8 max-w-app">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
          <KpiCard label={t("totalStaked")} value={staked.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} unit="AZR" sub={hasStake ? "1 active position" : "No active stake"} glow />
          <KpiCard label={t("claimable")} value={pendingDisplay} unit="AZR" sub="accruing 0.7% / day" />
          <KpiCard label={t("portfolio")} value={(staked + parseFloat(pendingDisplay)).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} unit="AZR" />
          <KpiCard label={t("referralEarnings")} value="—" unit="AZR" />
        </div>

        {hasStake && (
          <div className="az-card mb-6">
            <h3 className="font-semibold mb-4">{t("activeStakes")}</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="az-mono text-[11px] uppercase" style={{ color: "var(--muted)" }}>
                    <th className="text-left pb-3 font-normal">Amount</th>
                    <th className="text-left pb-3 font-normal">Pending</th>
                    <th className="text-left pb-3 font-normal">Unlocks</th>
                    <th className="text-left pb-3 font-normal">Progress</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="py-3 font-semibold az-mono">{staked.toFixed(2)} AZR</td>
                    <td className="py-3 az-mono" style={{ color: "var(--teal)" }}>{pendingDisplay}</td>
                    <td className="py-3 az-mono" style={{ color: "var(--text-2)" }}>{unlockTime}</td>
                    <td className="py-3 w-32">
                      <div className="prog-bar">
                        <div className="prog-fill" style={{ width: `${lockProgress}%` }} />
                      </div>
                      <div className="text-[11px] mt-1 az-mono" style={{ color: "var(--muted)" }}>{lockProgress}%</div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {!hasStake && (
          <div className="az-card flex flex-col items-center py-12 text-center">
            <p className="mb-4" style={{ color: "var(--text-2)" }}>{t("noStakes")}</p>
            <a href="../stake" className="az-btn-primary">{t("goStake")}</a>
          </div>
        )}
      </div>
    </>
  );
}
