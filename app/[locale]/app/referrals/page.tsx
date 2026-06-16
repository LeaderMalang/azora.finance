"use client";

import { AppTopbar } from "@/components/app/AppTopbar";
import { Spinner } from "@/components/ui/Spinner";
import { useTranslations } from "next-intl";
import { useAccount, useReadContract, usePublicClient } from "wagmi";
import { useState, useEffect, useCallback } from "react";
import { formatUnits } from "viem";
import { CONTRACTS, STAKING_ABI, REFERRAL_COMMISSION_EVENT, STAKING_DEPLOY_BLOCK } from "@/lib/contracts";
import { useActiveChain } from "@/lib/hooks";

type DisplayEntry = {
  level: number;
  amountFormatted: string;
  from: string;
  txHash: string | null;
  source: "db" | "chain";
};

type NetworkUser = { username: string; walletAddress: string; joinedAt: string };
type ReferralNetwork = {
  l1: NetworkUser[];
  l2: NetworkUser[];
  l3: NetworkUser[];
  counts: { l1: number; l2: number; l3: number };
};

function NetworkUserList({ title, users }: { title: string; users: NetworkUser[] }) {
  const [expanded, setExpanded] = useState(false);
  if (users.length === 0) return null;
  const visible = expanded ? users : users.slice(0, 5);
  return (
    <div className="mb-3">
      <div className="text-xs az-mono font-semibold mb-2" style={{ color: "var(--muted)" }}>
        {title} ({users.length})
      </div>
      <div className="space-y-1">
        {visible.map((u) => (
          <div
            key={u.username}
            className="flex items-center justify-between px-3 py-2 rounded-ctl"
            style={{ background: "var(--bg-2)" }}
          >
            <span className="az-mono text-xs font-semibold" style={{ color: "var(--teal)" }}>
              {u.username}.azr
            </span>
            <span className="az-mono text-xs" style={{ color: "var(--muted)" }}>
              {new Date(u.joinedAt).toLocaleDateString()}
            </span>
          </div>
        ))}
      </div>
      {users.length > 5 && (
        <button
          className="text-xs az-mono mt-2"
          style={{ color: "var(--teal)" }}
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? "Show less" : `+${users.length - 5} more`}
        </button>
      )}
    </div>
  );
}

export default function ReferralsPage() {
  const t = useTranslations("referralsPage");
  const { address: addr } = useAccount();
  const { chainId } = useActiveChain();
  const [copied, setCopied] = useState(false);
  const [entries, setEntries] = useState<DisplayEntry[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [lvlFilter, setLvlFilter] = useState(-1);
  const [network, setNetwork] = useState<ReferralNetwork | null>(null);
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

  const fetchFromDB = useCallback(async () => {
    if (!addr) return;
    try {
      const res = await fetch(`/api/referrals?wallet=${addr}`);
      if (!res.ok) return;
      const { earnings } = await res.json();
      setEntries(
        (earnings as { level: number; amount: string; fromUser: string; txHash: string | null }[]).map((e) => ({
          level: e.level,
          amountFormatted: parseFloat(e.amount).toFixed(4),
          from: e.fromUser,
          txHash: e.txHash ?? null,
          source: "db" as const,
        }))
      );
    } catch { /* silently ignore */ }
  }, [addr]);

  const syncFromChain = useCallback(async () => {
    if (!addr || !publicClient) return;
    setSyncing(true);
    try {
      const logs = await publicClient.getLogs({
        address: CONTRACTS[chainId].staking,
        event: REFERRAL_COMMISSION_EVENT,
        args: { recipient: addr },
        fromBlock: STAKING_DEPLOY_BLOCK,
        toBlock: "latest",
      });
      setEntries((prev) => {
        const knownHashes = new Set(prev.map((e) => e.txHash).filter(Boolean));
        const newEntries: DisplayEntry[] = [];
        for (const log of logs) {
          const hash = log.transactionHash ?? null;
          if (hash && knownHashes.has(hash)) continue;
          const entry: DisplayEntry = {
            level: (log.args as { level: number }).level,
            amountFormatted: parseFloat(
              formatUnits((log.args as { amount: bigint }).amount, 18)
            ).toFixed(4),
            from: (log.args as { from: `0x${string}` }).from,
            txHash: hash,
            source: "chain",
          };
          newEntries.push(entry);
          if (hash) {
            fetch("/api/referrals", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                wallet: addr,
                fromUser: entry.from,
                level: entry.level,
                amount: entry.amountFormatted,
                txHash: hash,
              }),
            }).catch(() => {});
          }
        }
        return newEntries.length > 0 ? [...newEntries, ...prev] : prev;
      });
    } catch { /* silently ignore RPC errors */ }
    finally { setSyncing(false); }
  }, [addr, publicClient, chainId]);

  useEffect(() => {
    fetchFromDB().then(() => syncFromChain());
  }, [fetchFromDB, syncFromChain]);

  useEffect(() => {
    if (!addr) return;
    fetch(`/api/referrals/network?wallet=${addr}`)
      .then((r) => r.json())
      .then(setNetwork)
      .catch(() => {});
  }, [addr]);

  const totalForLevel = (lvl: number) =>
    entries.filter((e) => e.level === lvl).reduce((s, e) => s + parseFloat(e.amountFormatted), 0);

  const filteredCommissions = lvlFilter === -1 ? entries : entries.filter((e) => e.level === lvlFilter);

  const copy = () => {
    navigator.clipboard.writeText(refLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const networkTotal = network ? network.counts.l1 + network.counts.l2 + network.counts.l3 : 0;

  return (
    <>
      <AppTopbar title={t("title")} sub="3-level commissions paid in AZR" />
      <div className="p-4 md:p-8 max-w-app">

        {/* Referral link */}
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

        {/* Level earnings summary */}
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
                {totalForLevel(c.lvl).toFixed(4)}{" "}
                <span className="text-sm font-normal" style={{ color: "var(--muted)" }}>AZR</span>
              </div>
            </div>
          ))}
        </div>

        {/* Referral Network card */}
        <div className="az-card mb-6">
          <h3 className="font-semibold mb-4">Your Referral Network</h3>
          <div
            className="rounded-ctl px-4 py-3 mb-4 text-sm"
            style={{ background: "rgba(45,212,191,0.06)", borderLeft: "2px solid var(--teal)" }}
          >
            When network members stake, you earn:
            <span className="az-mono font-semibold ml-1" style={{ color: "var(--teal)" }}>
              L1 {fmtRate(l1Rate)} · L2 {fmtRate(l2Rate)} · L3 {fmtRate(l3Rate)}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-3 mb-4">
            {[
              { label: "L1 Direct", count: network?.counts.l1 ?? 0 },
              { label: "L2 Friends", count: network?.counts.l2 ?? 0 },
              { label: "L3 Extended", count: network?.counts.l3 ?? 0 },
            ].map((tier) => (
              <div key={tier.label} className="rounded-ctl px-3 py-3 text-center" style={{ background: "var(--bg-2)" }}>
                <div className="font-display font-bold text-2xl" style={{ color: "var(--teal)" }}>{tier.count}</div>
                <div className="text-xs az-mono mt-1" style={{ color: "var(--muted)" }}>{tier.label}</div>
              </div>
            ))}
          </div>

          {!network || networkTotal === 0 ? (
            <p className="text-sm text-center py-3" style={{ color: "var(--text-2)" }}>
              No one has joined yet. Share your link to build your network.
            </p>
          ) : (
            <>
              <NetworkUserList title="Level 1" users={network.l1} />
              <NetworkUserList title="Level 2" users={network.l2} />
              <NetworkUserList title="Level 3" users={network.l3} />
            </>
          )}

          {network && networkTotal > 0 && entries.length === 0 && !syncing && (
            <div
              className="mt-3 rounded-ctl px-4 py-3 text-sm"
              style={{ background: "rgba(243,186,47,0.08)", borderLeft: "2px solid #f3ba2f", color: "#f3ba2f" }}
            >
              {networkTotal} {networkTotal === 1 ? "person has" : "people have"} joined your network —
              commissions appear here when they stake.
            </div>
          )}
        </div>

        {/* Commission History */}
        <div className="az-card">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h3 className="font-semibold">{t("history")}</h3>
            <div className="flex items-center gap-2">
              {syncing && (
                <span className="flex items-center gap-1 text-xs az-mono" style={{ color: "var(--muted)" }}>
                  <Spinner size="sm" /> syncing…
                </span>
              )}
              <select
                className="rounded-ctl px-3 py-1.5 text-xs az-mono"
                style={{ background: "var(--bg-2)", border: "1px solid var(--line)", color: "var(--text-2)" }}
                value={lvlFilter}
                onChange={(e) => setLvlFilter(Number(e.target.value))}
              >
                <option value={-1}>All Levels</option>
                <option value={1}>L1 (6%)</option>
                <option value={2}>L2 (4%)</option>
                <option value={3}>L3 (3%)</option>
              </select>
              <button
                className="az-btn-ghost text-xs px-3 py-1.5"
                onClick={() => fetchFromDB().then(() => syncFromChain())}
              >
                ↻ Refresh
              </button>
            </div>
          </div>

          {entries.length === 0 ? (
            <div className="flex flex-col items-center py-10 text-center" style={{ color: "var(--text-2)" }}>
              <p className="mb-2">{t("noEarnings")}</p>
              <p className="text-sm" style={{ color: "var(--muted)" }}>
                Commissions appear here when users registered through your referral link stake AZR.
              </p>
            </div>
          ) : filteredCommissions.length === 0 ? (
            <div className="py-8 text-center text-sm" style={{ color: "var(--text-2)" }}>
              No commissions for this level filter.
            </div>
          ) : (
            <>
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
                    {filteredCommissions.map((e, i) => (
                      <tr key={e.txHash ?? i}>
                        <td className="py-3">
                          <span
                            className="az-mono text-xs font-semibold px-2 py-0.5 rounded"
                            style={{ background: "rgba(45,212,191,0.10)", color: "var(--teal)" }}
                          >
                            L{e.level}
                          </span>
                        </td>
                        <td className="py-3 az-mono text-xs" style={{ color: "var(--text-2)" }}>
                          {e.from.slice(0, 6)}…{e.from.slice(-4)}
                        </td>
                        <td className="py-3 az-mono text-right font-semibold" style={{ color: "var(--teal)" }}>
                          +{e.amountFormatted}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-[11px] az-mono mt-3" style={{ color: "var(--muted)" }}>
                Showing {filteredCommissions.length} of {entries.length} commissions
              </p>
            </>
          )}
        </div>

      </div>
    </>
  );
}
