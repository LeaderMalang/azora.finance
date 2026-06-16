"use client";

import { AppTopbar } from "@/components/app/AppTopbar";
import { useTranslations } from "next-intl";
import { useAccount, useReadContract, usePublicClient } from "wagmi";
import { useState, useEffect, useCallback } from "react";
import { formatUnits } from "viem";
import { CONTRACTS, STAKING_ABI, REFERRAL_COMMISSION_EVENT, STAKING_DEPLOY_BLOCK } from "@/lib/contracts";
import { useActiveChain } from "@/lib/hooks";

type CommEntry = { level: number; amount: bigint; from: `0x${string}` };

export default function ReferralsPage() {
  const t = useTranslations("referralsPage");
  const { address: addr } = useAccount();
  const { chainId } = useActiveChain();
  const [copied, setCopied] = useState(false);
  const [commissions, setCommissions] = useState<CommEntry[]>([]);
  const publicClient = usePublicClient({ chainId: chainId as 56 | 97 });

  const { data: userInfo } = useReadContract({
    address: CONTRACTS[chainId].staking,
    abi: STAKING_ABI,
    functionName: "usersByAddress",
    args: addr ? [addr] : undefined,
    query: { enabled: !!addr },
  });
  const username = (userInfo?.[1] as string) ?? "";

  const { data: l1Rate } = useReadContract({ address: CONTRACTS[chainId].staking, abi: STAKING_ABI, functionName: "referralRateL1", query: { enabled: true } });
  const { data: l2Rate } = useReadContract({ address: CONTRACTS[chainId].staking, abi: STAKING_ABI, functionName: "referralRateL2", query: { enabled: true } });
  const { data: l3Rate } = useReadContract({ address: CONTRACTS[chainId].staking, abi: STAKING_ABI, functionName: "referralRateL3", query: { enabled: true } });
  const fmtRate = (r: unknown) => r !== undefined ? `${(Number(r as bigint) / 100).toFixed(1)}%` : "—";

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://azora.finance";
  const refLink = username ? `${appUrl}?ref=${username}` : `${appUrl}?ref=${addr?.slice(0, 8) ?? ""}`;

  const fetchCommissions = useCallback(async () => {
    if (!addr || !publicClient) return;
    try {
      const logs = await publicClient.getLogs({
        address: CONTRACTS[chainId].staking,
        event: REFERRAL_COMMISSION_EVENT,
        args: { recipient: addr },
        fromBlock: STAKING_DEPLOY_BLOCK,
        toBlock: "latest",
      });
      setCommissions(
        logs.map((l) => ({
          level: (l.args as { level: number }).level,
          amount: (l.args as { amount: bigint }).amount,
          from: (l.args as { from: `0x${string}` }).from,
        })).reverse()
      );
    } catch { /* silently ignore RPC errors */ }
  }, [addr, publicClient, chainId]);

  useEffect(() => { fetchCommissions(); }, [fetchCommissions]);

  const totalForLevel = (lvl: number) =>
    commissions.filter((c) => c.level === lvl).reduce((s, c) => s + c.amount, BigInt(0));

  const copy = () => {
    navigator.clipboard.writeText(refLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <AppTopbar title={t("title")} sub="3-level commissions paid in AZR" />
      <div className="p-4 md:p-8 max-w-app">
        <div className="az-card mb-6">
          <h3 className="font-semibold mb-4">{t("yourLink")}</h3>
          <div className="flex gap-2">
            <div
              className="flex-1 rounded-ctl border px-4 py-3 az-mono text-sm truncate"
              style={{ background: "var(--bg-2)", borderColor: "var(--line)", color: "var(--text-2)" }}
            >
              {refLink}
            </div>
            <button className="az-btn-primary px-5" onClick={copy}>
              {copied ? t("copied") : t("copy")}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          {[
            { label: t("l1Earnings"), pct: fmtRate(l1Rate), lvl: 1 },
            { label: t("l2Earnings"), pct: fmtRate(l2Rate), lvl: 2 },
            { label: t("l3Earnings"), pct: fmtRate(l3Rate), lvl: 3 },
          ].map((c) => (
            <div key={c.lvl} className="az-card text-center">
              <div className="font-display font-bold text-3xl mb-1 text-teal">{c.pct}</div>
              <div className="text-xs az-mono" style={{ color: "var(--muted)" }}>{c.label}</div>
              <div className="font-bold text-xl az-mono mt-2">
                {parseFloat(formatUnits(totalForLevel(c.lvl), 18)).toFixed(4)}{" "}
                <span className="text-sm font-normal" style={{ color: "var(--muted)" }}>AZR</span>
              </div>
            </div>
          ))}
        </div>

        <div className="az-card">
          <h3 className="font-semibold mb-4">{t("history")}</h3>
          {commissions.length === 0 ? (
            <div className="flex flex-col items-center py-10" style={{ color: "var(--text-2)" }}>
              <p className="mb-2">{t("noEarnings")}</p>
              <p className="text-sm" style={{ color: "var(--muted)" }}>{t("shareLink")}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="az-mono text-[11px] uppercase" style={{ color: "var(--muted)" }}>
                    <th className="text-left pb-3 font-normal">Level</th>
                    <th className="text-left pb-3 font-normal">From</th>
                    <th className="text-right pb-3 font-normal">Amount (AZR)</th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: "var(--line)" }}>
                  {commissions.map((c, i) => (
                    <tr key={i}>
                      <td className="py-3">
                        <span
                          className="az-mono text-xs font-semibold px-2 py-0.5 rounded"
                          style={{ background: "rgba(45,212,191,0.10)", color: "var(--teal)" }}
                        >
                          L{c.level}
                        </span>
                      </td>
                      <td className="py-3 az-mono text-xs" style={{ color: "var(--text-2)" }}>
                        {c.from.slice(0, 6)}…{c.from.slice(-4)}
                      </td>
                      <td className="py-3 az-mono text-right font-semibold" style={{ color: "var(--teal)" }}>
                        +{parseFloat(formatUnits(c.amount, 18)).toFixed(4)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
