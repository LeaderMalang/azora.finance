"use client";

import { AppTopbar } from "@/components/app/AppTopbar";
import { Skeleton } from "@/components/ui/Skeleton";
import { TokenIcon } from "@/components/ui/TokenIcon";
import { useTranslations } from "next-intl";
import { useAccount, useReadContract } from "wagmi";
import { CONTRACTS, STAKING_ABI, ERC20_ABI } from "@/lib/contracts";
import { useActiveChain } from "@/lib/hooks";
import { formatUnits } from "viem";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

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

function fmtBal(n: number): string {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(2) + " B";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + " M";
  if (n >= 100_000) return (n / 1_000).toFixed(1) + " K";
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function WalletCard({ azr, usdt, loading }: { azr: number; usdt: number; loading: boolean }) {
  return (
    <div className="az-card">
      <div className="text-xs az-mono mb-3" style={{ color: "var(--muted)" }}>Available Balance</div>
      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-full" />
        </div>
      ) : (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <TokenIcon symbol="AZR" size="sm" />
              <span className="az-mono text-xs font-semibold">AZR</span>
            </span>
            <span className="font-bold az-mono text-sm" style={{ color: "var(--teal)" }}>
              {fmtBal(azr)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <TokenIcon symbol="USDT" size="sm" />
              <span className="az-mono text-xs font-semibold">USDT</span>
            </span>
            <span className="font-bold az-mono text-sm">
              {fmtBal(usdt)}
            </span>
          </div>
        </div>
      )}
      <div className="text-xs mt-3" style={{ color: "var(--muted)" }}>Ready to stake · swap · withdraw</div>
    </div>
  );
}

function SkeletonKpiCard() {
  return (
    <div className="az-card space-y-3">
      <Skeleton className="h-3 w-20" />
      <Skeleton className="h-8 w-32" />
      <Skeleton className="h-3 w-24" />
    </div>
  );
}

const RATE_PER_SEC = 0.007 / 86400;

export default function DashboardPage() {
  const t = useTranslations("dashboard");
  const { address: addr } = useAccount();
  const { chainId } = useActiveChain();
  const { locale } = useParams<{ locale: string }>();

  type StakePosition = { id: bigint; amount: bigint; startTime: bigint; lastClaimTime: bigint; unlockTime: bigint; active: boolean };

  const { data: rawPositions, isLoading: posLoading } = useReadContract({
    address: CONTRACTS[chainId].staking,
    abi: STAKING_ABI,
    functionName: "getUserStakes",
    args: addr ? [addr] : undefined,
    query: { enabled: !!addr },
  });

  const { data: azrWalBal, isLoading: azrLoading } = useReadContract({
    address: CONTRACTS[chainId].azoraToken,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: addr ? [addr] : undefined,
    query: { enabled: !!addr },
  });

  const { data: usdtWalBal, isLoading: usdtLoading } = useReadContract({
    address: CONTRACTS[chainId].usdt,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: addr ? [addr] : undefined,
    query: { enabled: !!addr },
  });

  const [pendingDisplay, setPendingDisplay] = useState<string>("0.0000");
  const [refTotal, setRefTotal] = useState<number | null>(null);

  const positions: StakePosition[] = (rawPositions as StakePosition[] | undefined) ?? [];
  const activePositions = positions.filter((p) => p.active);
  const staked = activePositions.reduce((s, p) => s + parseFloat(formatUnits(p.amount, 18)), 0);
  const hasStake = activePositions.length > 0;

  const azrWallet = azrWalBal ? parseFloat(formatUnits(azrWalBal as bigint, 18)) : 0;
  const usdtWallet = usdtWalBal ? parseFloat(formatUnits(usdtWalBal as bigint, 18)) : 0;
  const walletLoading = (azrLoading || usdtLoading) && !!addr;

  useEffect(() => {
    if (!addr) return;
    fetch(`/api/referrals?wallet=${addr}`)
      .then((r) => r.json())
      .then((d) => {
        const t = d.totals;
        if (t) setRefTotal((t.l1 ?? 0) + (t.l2 ?? 0) + (t.l3 ?? 0));
      })
      .catch(() => {});
  }, [addr]);

  useEffect(() => {
    if (!hasStake) return;
    const id = setInterval(() => {
      const total = activePositions.reduce((sum, pos) => {
        const elapsed = (Date.now() / 1000) - Number(pos.lastClaimTime);
        return sum + parseFloat(formatUnits(pos.amount, 18)) * RATE_PER_SEC * elapsed;
      }, 0);
      setPendingDisplay(total.toFixed(4));
    }, 1000);
    return () => clearInterval(id);
  }, [rawPositions]);

  const loading = posLoading && !!addr;

  return (
    <>
      <AppTopbar title={t("title")} sub="Your positions, earnings & rewards" />
      <div className="p-4 md:p-8 max-w-app">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5 mb-8">
          {loading ? (
            <>
              <SkeletonKpiCard />
              <SkeletonKpiCard />
              <SkeletonKpiCard />
              <SkeletonKpiCard />
              <SkeletonKpiCard />
            </>
          ) : (
            <>
              <KpiCard label={t("totalStaked")} value={staked.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} unit="AZR" sub={hasStake ? `${activePositions.length} active position${activePositions.length !== 1 ? "s" : ""}` : "No active stake"} glow />
              <KpiCard label={t("claimable")} value={pendingDisplay} unit="AZR" sub="accruing 0.7% / day" />
              <KpiCard label={t("portfolio")} value={(staked + parseFloat(pendingDisplay)).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} unit="AZR" />
              <KpiCard label={t("referralEarnings")} value={refTotal !== null ? refTotal.toFixed(4) : "—"} unit="AZR" sub="See Referrals page" />
              <WalletCard azr={azrWallet} usdt={usdtWallet} loading={walletLoading} />
            </>
          )}
        </div>

        {loading ? (
          <div className="az-card mb-6">
            <Skeleton className="h-5 w-32 mb-5" />
            <div className="space-y-4">
              {[0, 1].map((i) => (
                <div key={i} className="grid grid-cols-4 gap-4">
                  <Skeleton className="h-4" />
                  <Skeleton className="h-4" />
                  <Skeleton className="h-4" />
                  <Skeleton className="h-4" />
                </div>
              ))}
            </div>
          </div>
        ) : hasStake ? (
          <div className="az-card mb-6">
            <h3 className="font-semibold mb-4">{t("activeStakes")} ({activePositions.length})</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="az-mono text-[11px] uppercase" style={{ color: "var(--muted)" }}>
                    <th className="text-left pb-3 font-normal">#</th>
                    <th className="text-left pb-3 font-normal">Amount</th>
                    <th className="text-left pb-3 font-normal">Unlocks</th>
                    <th className="text-left pb-3 font-normal">Progress</th>
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
                        <td className="py-3 font-semibold az-mono">{parseFloat(formatUnits(pos.amount, 18)).toFixed(2)} AZR</td>
                        <td className="py-3 az-mono text-xs" style={{ color: unlocked ? "var(--teal)" : "var(--text-2)" }}>
                          {unlocked ? "Unlocked ✓" : new Date(unlock * 1000).toLocaleDateString()}
                        </td>
                        <td className="py-3 w-32">
                          <div className="prog-bar"><div className="prog-fill" style={{ width: `${progress}%` }} /></div>
                          <div className="text-[11px] mt-1 az-mono" style={{ color: "var(--muted)" }}>{progress}%</div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="az-card flex flex-col items-center py-12 text-center">
            <p className="mb-4" style={{ color: "var(--text-2)" }}>{t("noStakes")}</p>
            <Link href={`/${locale}/app/stake`} className="az-btn-primary">{t("goStake")}</Link>
          </div>
        )}

        {/* Partner logos strip */}
        <div className="az-card mt-2">
          <p className="text-xs az-mono mb-5 text-center uppercase tracking-widest" style={{ color: "var(--muted)" }}>Trusted Ecosystem Partners</p>
          <div className="flex flex-wrap items-center justify-center gap-8">
            {[
              {
                name: "BNB Chain",
                logo: (
                  <svg viewBox="0 0 32 32" className="w-7 h-7" fill="none">
                    <circle cx="16" cy="16" r="16" fill="#F0B90B" />
                    <path d="M12 16l4-4 4 4-4 4-4-4zm-4 0l4 4V16l-4-4v4zm12-4v4l4-4-4-4v4zm-4 8l-4-4 4 4 4-4-4 4z" fill="white" opacity="0.9" />
                  </svg>
                ),
              },
              {
                name: "Tether",
                logo: (
                  <span className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-sm" style={{ background: "#26A17B", color: "white" }}>₮</span>
                ),
              },
              {
                name: "MetaMask",
                logo: (
                  <svg viewBox="0 0 32 32" className="w-7 h-7" fill="none">
                    <path d="M28 4L17.5 11.8l1.9-4.5L28 4z" fill="#E17726" />
                    <path d="M4 4l10.4 7.9-1.8-4.6L4 4z" fill="#E27625" />
                    <path d="M24 22.4l-2.8 4.3 6 1.7 1.7-5.8-4.9-.2z" fill="#E27625" />
                    <path d="M3.1 22.6l1.7 5.8 6-1.7-2.8-4.3-4.9.2z" fill="#E27625" />
                    <circle cx="16" cy="16" r="5" fill="#E27625" opacity="0.3" />
                  </svg>
                ),
              },
              {
                name: "Trust Wallet",
                logo: (
                  <svg viewBox="0 0 32 32" className="w-7 h-7" fill="none">
                    <circle cx="16" cy="16" r="16" fill="#3375BB" />
                    <path d="M16 7l8 3.5v6c0 4.4-3.4 8.3-8 9.5-4.6-1.2-8-5.1-8-9.5v-6L16 7z" fill="white" opacity="0.9" />
                  </svg>
                ),
              },
              {
                name: "WalletConnect",
                logo: (
                  <svg viewBox="0 0 32 32" className="w-7 h-7" fill="none">
                    <circle cx="16" cy="16" r="16" fill="#3B99FC" />
                    <path d="M9.6 13.2c3.5-3.5 9.3-3.5 12.8 0l.4.4-1.5 1.5-.4-.4c-2.5-2.5-6.4-2.5-8.9 0l-.5.4-1.5-1.5.6-.4zm6.4 3.4l2.1 2.1-2.1 2.1-2.1-2.1 2.1-2.1z" fill="white" />
                  </svg>
                ),
              },
            ].map((p) => (
              <div key={p.name} className="flex flex-col items-center gap-2">
                {p.logo}
                <span className="text-[11px] az-mono" style={{ color: "var(--muted)" }}>{p.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
