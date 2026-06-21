"use client";

import { AppTopbar } from "@/components/app/AppTopbar";
import { Skeleton } from "@/components/ui/Skeleton";
import { Spinner } from "@/components/ui/Spinner";
import { TokenIcon } from "@/components/ui/TokenIcon";
import { useTranslations } from "next-intl";
import { useAccount } from "wagmi";
import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/components/ui/Toast";

type VirtualWithdrawal = {
  id: number;
  amount: number;
  assetType: number;
  toWallet: string;
  status: number;
  sentTxHash: string | null;
  createdAt: string;
};

const ASSET_LABEL = ["AZR", "USDT"];
const STATUS_LABEL = ["Pending", "Sent", "Rejected"];
const STATUS_COLOR = ["var(--warn)", "var(--teal)", "#ef4444"];

export default function WithdrawalsPage() {
  const t = useTranslations("withdrawalsPage");
  const { address: addr } = useAccount();
  const { toast } = useToast();

  const [asset, setAsset]           = useState<0 | 1>(0);
  const [amount, setAmount]         = useState("");
  const [toWallet, setToWallet]     = useState("");
  const [inputErr, setInputErr]     = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading]       = useState(false);
  const [azrBalance, setAzrBalance] = useState(0);
  const [usdtBalance, setUsdtBalance] = useState(0);
  const [withdrawals, setWithdrawals] = useState<VirtualWithdrawal[]>([]);
  const [statusFilter, setStatusFilter] = useState(-1);
  const [assetFilter, setAssetFilter]   = useState(-1);

  const fetchData = useCallback(async () => {
    if (!addr) return;
    setLoading(true);
    try {
      const [balRes, wdRes] = await Promise.all([
        fetch(`/api/virtual/balance?wallet=${addr}`),
        fetch(`/api/virtual/withdraw?wallet=${addr}`),
      ]);
      if (balRes.ok) { const d = await balRes.json(); setAzrBalance(d.azrBalance ?? 0); setUsdtBalance(d.usdtBalance ?? 0); }
      if (wdRes.ok)  { const d = await wdRes.json();  setWithdrawals(d.withdrawals ?? []); }
    } finally { setLoading(false); }
  }, [addr]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const bal = asset === 0 ? azrBalance : usdtBalance;
  const assetLabel = ASSET_LABEL[asset];

  const doRequest = async () => {
    if (!addr || !amount || parseFloat(amount) <= 0) return;
    if (!toWallet.startsWith("0x") || toWallet.length !== 42) { setInputErr("Enter a valid BEP-20 wallet address (0x...)"); return; }
    if (parseFloat(amount) > bal) { setInputErr(`Insufficient balance (max ${bal.toFixed(4)} ${assetLabel})`); return; }
    setSubmitting(true);
    try {
      const res = await fetch("/api/virtual/withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet: addr, amount: parseFloat(amount), assetType: asset, toWallet }),
      });
      const d = await res.json();
      if (!res.ok) { toast(d.error ?? "Failed", "error"); return; }
      toast(`Withdrawal of ${amount} ${assetLabel} requested · pending admin approval`);
      setAmount("");
      setToWallet("");
      fetchData();
    } catch { toast("Network error", "error"); }
    finally { setSubmitting(false); }
  };

  const filtered = withdrawals
    .filter((w) => {
      if (statusFilter !== -1 && w.status !== statusFilter) return false;
      if (assetFilter  !== -1 && w.assetType !== assetFilter) return false;
      return true;
    })
    .sort((a, b) => b.id - a.id);

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
                    onClick={() => { setAsset(o.val as 0 | 1); setAmount(""); setInputErr(""); }}
                    disabled={submitting}
                    className="flex-1 py-2.5 rounded-ctl border text-sm font-semibold transition-all flex items-center justify-center gap-2"
                    style={{
                      borderColor: asset === o.val ? "var(--teal)" : "var(--line)",
                      background:  asset === o.val ? "rgba(45,212,191,0.08)" : "var(--bg-2)",
                      color:       asset === o.val ? "var(--teal)" : "var(--text-2)",
                    }}
                  >
                    <TokenIcon symbol={o.label as "AZR" | "USDT"} size="sm" />
                    {o.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs az-mono" style={{ color: "var(--muted)" }}>{t("amount")}</label>
                <span className="text-xs az-mono" style={{ color: "var(--muted)" }}>
                  Balance: {loading && !!addr ? <Skeleton className="inline-block w-16 h-3" /> : `${bal.toFixed(4)} ${assetLabel}`}
                </span>
              </div>
              <input className="az-input" type="number" placeholder="0.00" value={amount} onChange={(e) => { setAmount(e.target.value); setInputErr(""); }} disabled={submitting} />
            </div>

            <div className="mb-5">
              <label className="text-xs az-mono mb-2 block" style={{ color: "var(--muted)" }}>Destination Wallet (BEP-20 / BSC)</label>
              <input className="az-input" placeholder="0x..." value={toWallet} onChange={(e) => { setToWallet(e.target.value); setInputErr(""); }} disabled={submitting} />
            </div>

            {inputErr && <p className="text-xs mb-3" style={{ color: "#ff6b6b" }}>{inputErr}</p>}
            {submitting && (
              <div className="flex items-center gap-2 text-xs py-2 px-3 rounded-ctl mb-3" style={{ background: "rgba(45,212,191,0.08)", color: "var(--teal)" }}>
                <Spinner size="sm" /> Submitting request…
              </div>
            )}
            <button className="az-btn-primary w-full" onClick={doRequest} disabled={submitting || !amount || !toWallet}>
              {submitting ? <span className="flex items-center justify-center gap-2"><Spinner size="sm" /> Processing…</span> : t("submit")}
            </button>
            <p className="text-[11px] az-mono mt-3" style={{ color: "var(--muted)" }}>
              Withdrawals are reviewed and sent manually by admin · no fee deducted from your request amount.
            </p>
          </div>
        </div>

        <div className="az-card">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h3 className="font-semibold">{t("queue")}</h3>
            <div className="flex flex-wrap items-center gap-2">
              <select className="rounded-ctl px-3 py-1.5 text-xs az-mono" style={selectStyle} value={statusFilter} onChange={(e) => setStatusFilter(Number(e.target.value))}>
                <option value={-1}>All Status</option>
                <option value={0}>Pending</option>
                <option value={1}>Sent</option>
                <option value={2}>Rejected</option>
              </select>
              <select className="rounded-ctl px-3 py-1.5 text-xs az-mono" style={selectStyle} value={assetFilter} onChange={(e) => setAssetFilter(Number(e.target.value))}>
                <option value={-1}>All Assets</option>
                <option value={0}>AZR</option>
                <option value={1}>USDT</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="space-y-3 py-4">{[0,1,2].map((i) => <Skeleton key={i} className="h-8 w-full" />)}</div>
          ) : filtered.length === 0 ? (
            <div className="py-10 text-center" style={{ color: "var(--text-2)" }}>
              {withdrawals.length === 0 ? t("noRequests") : "No requests match the current filters."}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="az-mono text-[11px] uppercase" style={{ color: "var(--muted)" }}>
                    <th className="text-left pb-3 font-normal">#</th>
                    <th className="text-left pb-3 font-normal">Asset</th>
                    <th className="text-left pb-3 font-normal">Amount</th>
                    <th className="text-left pb-3 font-normal">To Wallet</th>
                    <th className="text-left pb-3 font-normal">Status</th>
                    <th className="text-left pb-3 font-normal">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: "var(--line)" }}>
                  {filtered.map((req) => (
                    <tr key={req.id}>
                      <td className="py-3 az-mono text-xs" style={{ color: "var(--muted)" }}>#{req.id}</td>
                      <td className="py-3">
                        <span className="flex items-center gap-1.5">
                          <TokenIcon symbol={ASSET_LABEL[req.assetType] as "AZR" | "USDT"} size="sm" />
                          <span className="text-xs font-semibold">{ASSET_LABEL[req.assetType]}</span>
                        </span>
                      </td>
                      <td className="py-3 font-semibold az-mono">{req.amount.toFixed(4)}</td>
                      <td className="py-3 az-mono text-xs" style={{ color: "var(--muted)" }}>
                        {req.toWallet.slice(0, 8)}…{req.toWallet.slice(-4)}
                      </td>
                      <td className="py-3">
                        <span className="az-mono text-xs font-semibold" style={{ color: STATUS_COLOR[req.status] ?? "var(--text-2)" }}>
                          {STATUS_LABEL[req.status] ?? "Unknown"}
                        </span>
                        {req.status === 1 && req.sentTxHash && (
                          <div className="text-[10px] az-mono mt-0.5" style={{ color: "var(--muted)" }}>
                            TX: {req.sentTxHash.slice(0, 10)}…
                          </div>
                        )}
                      </td>
                      <td className="py-3 text-xs az-mono" style={{ color: "var(--muted)" }}>
                        {new Date(req.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {withdrawals.length > 0 && (
            <p className="text-[11px] az-mono mt-3" style={{ color: "var(--muted)" }}>
              Showing {filtered.length} of {withdrawals.length} requests
            </p>
          )}
        </div>
      </div>
    </>
  );
}
