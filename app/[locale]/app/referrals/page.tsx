"use client";

import { AppTopbar } from "@/components/app/AppTopbar";
import { useTranslations } from "next-intl";
import { useAccount, useReadContract } from "wagmi";
import { useState } from "react";
import { CONTRACTS, STAKING_ABI } from "@/lib/contracts";
import { useActiveChain } from "@/lib/hooks";

export default function ReferralsPage() {
  const t = useTranslations("referralsPage");
  const { address: addr } = useAccount();
  const { chainId } = useActiveChain();
  const [copied, setCopied] = useState(false);

  const { data: userInfo } = useReadContract({
    address: CONTRACTS[chainId].staking,
    abi: STAKING_ABI,
    functionName: "usersByAddress",
    args: addr ? [addr] : undefined,
    query: { enabled: !!addr },
  });
  const username = (userInfo?.[1] as string) ?? "";

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://azora.finance";
  const refLink = username ? `${appUrl}?ref=${username}` : `${appUrl}?ref=${addr?.slice(0, 8) ?? ""}`;

  const copy = () => {
    navigator.clipboard.writeText(refLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <AppTopbar title={t("title")} sub="3-level commissions paid in AZR" />
      <div className="p-8 max-w-app">
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

        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label: t("l1Earnings"), pct: "5%" },
            { label: t("l2Earnings"), pct: "3%" },
            { label: t("l3Earnings"), pct: "2%" },
          ].map((c, i) => (
            <div key={i} className="az-card text-center">
              <div className="font-display font-bold text-3xl mb-1 text-teal">{c.pct}</div>
              <div className="text-xs az-mono" style={{ color: "var(--muted)" }}>{c.label}</div>
              <div className="font-bold text-xl az-mono mt-2">0.00 <span className="text-sm font-normal" style={{ color: "var(--muted)" }}>AZR</span></div>
            </div>
          ))}
        </div>

        <div className="az-card">
          <h3 className="font-semibold mb-4">{t("history")}</h3>
          <div className="flex flex-col items-center py-10" style={{ color: "var(--text-2)" }}>
            <p className="mb-2">{t("noEarnings")}</p>
            <p className="text-sm" style={{ color: "var(--muted)" }}>{t("shareLink")}</p>
          </div>
        </div>
      </div>
    </>
  );
}
