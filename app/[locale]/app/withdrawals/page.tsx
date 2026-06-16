"use client";

import { AppTopbar } from "@/components/app/AppTopbar";
import { Skeleton } from "@/components/ui/Skeleton";
import { Spinner } from "@/components/ui/Spinner";
import { TokenIcon } from "@/components/ui/TokenIcon";
import { useTranslations } from "next-intl";
import { useAccount, useReadContract, useReadContracts, useWriteContract, usePublicClient } from "wagmi";
import { CONTRACTS, ERC20_ABI, STAKING_ABI } from "@/lib/contracts";
import { useActiveChain } from "@/lib/hooks";
import { formatUnits, parseUnits } from "viem";
import { useState } from "react";
import { useToast } from "@/components/ui/Toast";

type WRequest = {
  id: bigint;
  requester: `0x${string}`;
  amount: bigint;
  assetType: number;
  status: number;
  createdAt: bigint;
};

const ASSET_LABEL = ["AZR", "USDT"];
const STATUS_LABEL = ["Pending", "Approved", "Rejected"];
const STATUS_COLOR = ["var(--warn)", "var(--teal)", "#ef4444"];

export default function WithdrawalsPage() {
  const t = useTranslations("withdrawalsPage");
  const { address: addr } = useAccount();
  const { toast } = useToast();
  const { chainId } = useActiveChain();

  const [asset, setAsset] = useState<0 | 1>(0);
  const [amount, setAmount] = useState("");
  const [inputErr, setInputErr] = useState("");
  const [txPending, setTxPending] = useState(false);
  const [statusFilter, setStatusFilter] = useState(-1);
  const [assetFilter, setAssetFilter] = useState(-1);

  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient({ chainId: chainId as 56 | 97 });

  const { data: feeBps } = useReadContract({ address: CONTRACTS[chainId].staking, abi: STAKING_ABI, functionName: "withdrawalFeeBps", query: { enabled: true } });
  const { data: azrBal, isLoading: balLoading } = useReadContract({ address: CONTRACTS[chainId].azoraToken, abi: ERC20_ABI, functionName: "balanceOf", args: addr ? [addr] : undefined, query: { enabled: !!addr } });
  const { data: usdtBal } = useReadContract({ address: CONTRACTS[chainId].usdt, abi: ERC20_ABI, functionName: "balanceOf", args: addr ? [addr] : undefined, query: { enabled: !!addr } });
  const { data: reqCount, isLoading: reqLoading, refetch: refetchReqCount } = useReadContract({ address: CONTRACTS[chainId].staking, abi: STAKING_ABI, functionName: "withdrawalRequestCount", query: { enabled: true } });

  const reqCountNum = reqCount ? Number(reqCount as bigint) : 0;
  const { data: allRequestsRaw, refetch: refetchRequests } = useReadContracts({
    contracts: Array.from({ length: reqCountNum }, (_, i) => ({
      address: CONTRACTS[chainId].staking as `0x${string}`,
      abi: STAKING_ABI,
      functionName: "withdrawalRequests" as const,
      args: [BigInt(i + 1)] as [bigint],
    })),
    query: { enabled: reqCountNum > 0 },
  });

  const myRequests: WRequest[] = (allRequestsRaw ?? [])
    .map((r) => {
      const res = r.result as readonly [bigint, `0x${string}`, bigint, number, number, bigint] | undefined;
      if (!res) return undefined;
      return { id: res[0], requester: res[1], amount: res[2], assetType: res[3], status: res[4], createdAt: res[5] } as WRequest;
    })
    .filter((r): r is WRequest => !!r && r.requester?.toLowerCase() === addr?.toLowerCase());

  const filteredRequests = myRequests.filter((r) => {
    if (statusFilter !== -1 && r.status !== statusFilter) return false;
    if (assetFilter !== -1 && r.assetType !== assetFilter) return false;
    return true;
  });

  const fee = feeBps ? Number(feeBps as bigint) / 10000 : 0.02;
  const feeAmt = amount ? parseFloat(amount) * fee : 0;
  const youGet = amount ? parseFloat(amount) - feeAmt : 0;
  const bal = asset === 0 ? (azrBal ? parseFloat(formatUnits(azrBal as bigint, 18)) : 0) : (usdtBal ? parseFloat(formatUnits(usdtBal as bigint, 18)) : 0);
  const assetLabel = asset === 0 ? "AZR" : "USDT";

  const doRequest = async () => {
    if (!addr || !amount || parseFloat(amount) <= 0) return;
    if (parseFloat(amount) > bal) { setInputErr(`Insufficient balance (max ${bal.toFixed(2)} ${assetLabel})`); return; }
    setTxPending(true);
    const parsed = parseUnits(amount, 18);
    const tokenAddr = asset === 0 ? CONTRACTS[chainId].azoraToken : CONTRACTS[chainId].usdt;
    try {
      const approveHash = await writeContractAsync({ address: tokenAddr, abi: ERC20_ABI, functionName: "approve", args: [CONTRACTS[chainId].staking, parsed] });
      await publicClient!.waitForTransactionReceipt({ hash: approveHash });
      await writeContractAsync({ address: CONTRACTS[chainId].staking, abi: STAKING_ABI, functionName: "requestWithdrawal", args: [parsed, asset] });
      toast(`Withdrawal of ${amount} ${assetLabel} requested`);
      setAmount("");
      setTimeout(() => { refetchReqCount(); refetchRequests(); }, 3000);
    } catch (e) {
      toast(e instanceof Error ? e.message.slice(0, 100) : "Transaction failed", "error");
    } finally {
      setTxPending(false);
    }
  };

  const selectStyle = { background: "var(--bg-2)", border: "1px solid var(--line)", color: "var(--text-2)" };

  return (
    <>
      <AppTopbar title={t("title")} sub="Request & track payout queue" />
      <div className="p-4 md:p-8 max-w-app">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="az-card">
            <h3 className="font-semibold mb-5">{t("request")}</h3>
            <div className="mb-4">
              <label className="text-xs az-mono mb-2 block" style={{ color: "var(--muted)" }}>{t("asset")}</label>
              <div className="flex gap-2">
                {[{ label: "AZR", val: 0 }, { label: "USDT", val: 1 }].map((o) => (
                  <button
                    key={o.val}
                    onClick={() => { setAsset(o.val as 0 | 1); setAmount(""); }}
                    disabled={txPending}
                    className="flex-1 py-2.5 rounded-ctl border text-sm font-semibold transition-all flex items-center justify-center gap-2"
                    style={{
                      borderColor: asset === o.val ? "var(--teal)" : "var(--line)",
                      background: asset === o.val ? "rgba(45,212,191,0.08)" : "var(--bg-2)",
                      color: asset === o.val ? "var(--teal)" : "var(--text-2)",
                    }}
                  >
                    <TokenIcon symbol={o.label as "AZR" | "USDT"} size="sm" />
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="mb-5">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs az-mono" style={{ color: "var(--muted)" }}>{t("amount")}</label>
                <span className="text-xs az-mono flex items-center gap-1.5" style={{ color: "var(--muted)" }}>
                  Bal: {balLoading && !!addr ? <Skeleton className="inline-block w-16 h-3" /> : `${bal.toFixed(2)} ${assetLabel}`}
                </span>
              </div>
              <input className="az-input" type="number" placeholder="0.00" value={amount} onChange={(e) => { setAmount(e.target.value); setInputErr(""); }} disabled={txPending} />
            </div>
            <div className="space-y-2 mb-5 text-sm">
              <div className="flex justify-between">
                <span style={{ color: "var(--text-2)" }}>{t("fee")} ({(fee * 100).toFixed(1)}%)</span>
                <span className="az-mono">{feeAmt.toFixed(4)} {assetLabel}</span>
              </div>
              <div className="flex justify-between font-semibold">
                <span>{t("youGet")}</span>
                <span className="az-mono text-teal">{youGet.toFixed(4)} {assetLabel}</span>
              </div>
            </div>
            {inputErr && <p className="text-xs mb-3" style={{ color: "#ff6b6b" }}>{inputErr}</p>}
            {txPending && (
              <div className="flex items-center gap-2 text-xs py-2 px-3 rounded-ctl mb-3" style={{ background: "rgba(45,212,191,0.08)", color: "var(--teal)" }}>
                <Spinner size="sm" /> Waiting for blockchain confirmation…
              </div>
            )}
            <button className="az-btn-primary w-full" onClick={doRequest} disabled={txPending || !amount}>
              {txPending ? <span className="flex items-center justify-center gap-2"><Spinner size="sm" /> Processing…</span> : t("submit")}
            </button>
          </div>
        </div>

        <div className="az-card">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h3 className="font-semibold">{t("queue")}</h3>
            <div className="flex flex-wrap items-center gap-2">
              <select className="rounded-ctl px-3 py-1.5 text-xs az-mono" style={selectStyle} value={statusFilter} onChange={(e) => setStatusFilter(Number(e.target.value))}>
                <option value={-1}>All Status</option>
                <option value={0}>Pending</option>
                <option value={1}>Approved</option>
                <option value={2}>Rejected</option>
              </select>
              <select className="rounded-ctl px-3 py-1.5 text-xs az-mono" style={selectStyle} value={assetFilter} onChange={(e) => setAssetFilter(Number(e.target.value))}>
                <option value={-1}>All Assets</option>
                <option value={0}>AZR</option>
                <option value={1}>USDT</option>
              </select>
            </div>
          </div>
          {reqLoading ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="az-mono text-[11px] uppercase" style={{ color: "var(--muted)" }}>
                    <th className="text-left pb-3 font-normal">#</th>
                    <th className="text-left pb-3 font-normal">Asset</th>
                    <th className="text-left pb-3 font-normal">Amount</th>
                    <th className="text-left pb-3 font-normal">Status</th>
                    <th className="text-left pb-3 font-normal">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {[0, 1, 2].map((i) => (
                    <tr key={i}>
                      {[0, 1, 2, 3, 4].map((j) => (
                        <td key={j} className="py-3 pr-4"><Skeleton className="h-3 w-full" /></td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="py-10 text-center" style={{ color: "var(--text-2)" }}>
              {myRequests.length === 0 ? t("noRequests") : "No requests match the current filters."}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="az-mono text-[11px] uppercase" style={{ color: "var(--muted)" }}>
                    <th className="text-left pb-3 font-normal">#</th>
                    <th className="text-left pb-3 font-normal">Asset</th>
                    <th className="text-left pb-3 font-normal">Amount</th>
                    <th className="text-left pb-3 font-normal">Status</th>
                    <th className="text-left pb-3 font-normal">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: "var(--line)" }}>
                  {filteredRequests.map((req) => (
                    <tr key={req.id.toString()}>
                      <td className="py-3 az-mono text-xs" style={{ color: "var(--muted)" }}>#{Number(req.id)}</td>
                      <td className="py-3">
                        <span className="flex items-center gap-1.5">
                          <TokenIcon symbol={ASSET_LABEL[req.assetType] as "AZR" | "USDT"} size="sm" />
                          <span className="text-xs font-semibold">{ASSET_LABEL[req.assetType] ?? "?"}</span>
                        </span>
                      </td>
                      <td className="py-3 font-semibold az-mono">
                        {parseFloat(formatUnits(req.amount, 18)).toFixed(4)}
                      </td>
                      <td className="py-3">
                        <span className="az-mono text-xs font-semibold" style={{ color: STATUS_COLOR[req.status] ?? "var(--text-2)" }}>
                          {STATUS_LABEL[req.status] ?? "Unknown"}
                        </span>
                      </td>
                      <td className="py-3 text-xs az-mono" style={{ color: "var(--muted)" }}>
                        {new Date(Number(req.createdAt) * 1000).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {myRequests.length > 0 && (
            <p className="text-[11px] az-mono mt-3" style={{ color: "var(--muted)" }}>
              Showing {filteredRequests.length} of {myRequests.length} requests
            </p>
          )}
        </div>
      </div>
    </>
  );
}
