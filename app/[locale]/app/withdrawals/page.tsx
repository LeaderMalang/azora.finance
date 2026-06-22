"use client";

import { AppTopbar } from "@/components/app/AppTopbar";
import { Skeleton } from "@/components/ui/Skeleton";
import { Spinner } from "@/components/ui/Spinner";
import { TokenIcon } from "@/components/ui/TokenIcon";
import { useTranslations } from "next-intl";
import { useAccount } from "wagmi";
import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/components/ui/Toast";
import { AdminPaginator } from "@/components/ui/AdminPaginator";

type VirtualWithdrawal = {
  id: number;
  amount: number;
  assetType: number;
  toWallet: string;
  status: number;
  sentTxHash: string | null;
  createdAt: string;
};

const CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? 97);
const BSCSCAN_URL = CHAIN_ID === 56
  ? "https://bscscan.com/tx/"
  : "https://testnet.bscscan.com/tx/";

// Valid BSC tx hash: 0x followed by exactly 64 hex characters
const isValidTxHash = (hash: string) => /^0x[0-9a-fA-F]{64}$/.test(hash);

function TxHashLink({ hash }: { hash: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(hash);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  const valid = isValidTxHash(hash);
  const short = `${hash.slice(0, 10)}…${hash.slice(-6)}`;
  const copyBtn = (
    <button onClick={copy} title="Copy TX hash" className="flex-shrink-0" style={{ color: copied ? "var(--teal)" : "var(--muted)" }}>
      {copied
        ? <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg>
        : <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
      }
    </button>
  );
  return (
    <div className="flex items-center gap-1 mt-0.5">
      {valid ? (
        <a href={`${BSCSCAN_URL}${hash}`} target="_blank" rel="noopener noreferrer"
          className="text-[10px] az-mono underline" style={{ color: "var(--teal)" }}
          title="View on BSCScan">
          TX: {short}
        </a>
      ) : (
        <span className="text-[10px] az-mono" style={{ color: "var(--muted)" }} title={hash}>
          TX: {short}
        </span>
      )}
      {copyBtn}
    </div>
  );
}

const ASSET_LABEL = ["AZR", "USDT"];
const STATUS_LABEL = ["Pending", "Sent", "Rejected", "Cancelled"];
const STATUS_COLOR = ["var(--warn)", "var(--teal)", "#ef4444", "var(--muted)"];

export default function WithdrawalsPage() {
  const t = useTranslations("withdrawalsPage");
  const { address: addr } = useAccount();
  const { toast } = useToast();

  const [asset, setAsset] = useState<0 | 1>(0);
  const [amount, setAmount] = useState("");
  const [toWallet, setToWallet] = useState("");
  const [inputErr, setInputErr] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [azrBalance, setAzrBalance] = useState(0);
  const [usdtBalance, setUsdtBalance] = useState(0);
  const [withdrawals, setWithdrawals] = useState<VirtualWithdrawal[]>([]);
  const [statusFilter, setStatusFilter] = useState(-1);
  const [assetFilter, setAssetFilter] = useState(-1);
  const [wdPage, setWdPage] = useState(1);
  const [withdrawalFee, setWithdrawalFee] = useState(0);
  const [cancelling, setCancelling] = useState<number | null>(null); // id being cancelled

  const fetchData = useCallback(async () => {
    if (!addr) return;
    setLoading(true);
    try {
      const [balRes, wdRes, settingsRes] = await Promise.all([
        fetch(`/api/virtual/balance?wallet=${addr}`),
        fetch(`/api/virtual/withdraw?wallet=${addr}`),
        fetch("/api/admin/settings"),
      ]);
      if (balRes.ok) { const d = await balRes.json(); setAzrBalance(d.azrBalance ?? 0); setUsdtBalance(d.usdtBalance ?? 0); }
      if (wdRes.ok) { const d = await wdRes.json(); setWithdrawals(d.withdrawals ?? []); }
      if (settingsRes.ok) { const d = await settingsRes.json(); setWithdrawalFee(d.withdrawalFeePct ?? 0); }
    } finally { setLoading(false); }
  }, [addr]);

  useEffect(() => { fetchData(); setWdPage(1); }, [fetchData]);

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
      setWdPage(1);
      fetchData();
    } catch { toast("Network error", "error"); }
    finally { setSubmitting(false); }
  };

  const doCancel = async (withdrawalId: number, assetType: number, amount: number) => {
    if (!addr) return;
    if (!confirm(`Cancel this withdrawal of ${amount.toFixed(4)} ${ASSET_LABEL[assetType]}? The amount will be refunded to your balance.`)) return;
    setCancelling(withdrawalId);
    try {
      const res = await fetch("/api/virtual/withdraw", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet: addr, withdrawalId }),
      });
      const d = await res.json();
      if (!res.ok) { toast(d.error ?? "Cancel failed", "error"); return; }
      toast(`Withdrawal cancelled · ${d.refunded.toFixed(4)} ${ASSET_LABEL[assetType]} refunded to your balance`);
      fetchData();
    } catch { toast("Network error", "error"); }
    finally { setCancelling(null); }
  };

  const filtered = withdrawals
    .filter((w) => {
      if (statusFilter !== -1 && w.status !== statusFilter) return false;
      if (assetFilter !== -1 && w.assetType !== assetFilter) return false;
      return true;
    })
    .sort((a, b) => b.id - a.id);

  const WD_PAGE_SIZE = 10;
  const wdTotalPages = Math.max(1, Math.ceil(filtered.length / WD_PAGE_SIZE));
  const visibleWithdrawals = filtered.slice((wdPage - 1) * WD_PAGE_SIZE, wdPage * WD_PAGE_SIZE);

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

            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs az-mono" style={{ color: "var(--muted)" }}>{t("amount")}</label>
                <span className="text-xs az-mono flex items-center gap-2" style={{ color: "var(--muted)" }}>
                  Balance: {loading && !!addr ? <Skeleton className="inline-block w-16 h-3" /> : `${bal.toFixed(4)} ${assetLabel}`}
                  {bal > 0 && (
                    <button className="text-[11px] px-1.5 py-0.5 rounded" style={{ background: "rgba(45,212,191,0.1)", color: "var(--teal)" }}
                      onClick={() => setAmount(bal.toFixed(4))}>MAX</button>
                  )}
                </span>
              </div>
              <input className="az-input" type="number" placeholder="0.00" value={amount} onChange={(e) => { setAmount(e.target.value); setInputErr(""); }} disabled={submitting} />
              {withdrawalFee > 0 && bal > 0 && (
                <p className="text-[11px] az-mono mt-1" style={{ color: "var(--muted)" }}>
                  Max you receive after {withdrawalFee}% fee: {(bal * (1 - withdrawalFee / 100)).toFixed(4)} {assetLabel}
                </p>
              )}
            </div>

            <div className="mb-5">
              <label className="text-xs az-mono mb-2 block" style={{ color: "var(--muted)" }}>Destination Wallet (BEP-20 / BSC)</label>
              <input className="az-input" placeholder="0x..." value={toWallet} onChange={(e) => { setToWallet(e.target.value); setInputErr(""); }} disabled={submitting} />
            </div>

            {/* Fee breakdown */}
            {withdrawalFee > 0 && amount && parseFloat(amount) > 0 && (
              <div className="mb-4 text-xs space-y-1">
                <div className="flex justify-between" style={{ color: "var(--text-2)" }}>
                  <span>Fee ({withdrawalFee}%)</span>
                  <span className="az-mono">−{(parseFloat(amount) * withdrawalFee / 100).toFixed(4)} {assetLabel}</span>
                </div>
                <div className="flex justify-between font-semibold">
                  <span>You receive</span>
                  <span className="az-mono text-teal">{(parseFloat(amount) * (1 - withdrawalFee / 100)).toFixed(4)} {assetLabel}</span>
                </div>
              </div>
            )}

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
              Withdrawals are sent to the set destination wallet
            </p>
          </div>

          {/* Right column — balance summary + how it works */}
          <div className="space-y-4">

            {/* Available Balance */}
            {addr && (
              <div className="az-card-glow relative overflow-hidden">
                <div className="absolute inset-0 opacity-10" style={{ background: "radial-gradient(ellipse at top right, var(--teal), transparent 70%)" }} />
                <div className="relative z-10">
                  <div className="text-xs az-mono mb-4" style={{ color: "var(--muted)" }}>AVAILABLE BALANCE</div>
                  <div className="space-y-3 mb-4">
                    {[
                      { symbol: "AZR" as const, label: "AZR", value: azrBalance },
                      { symbol: "USDT" as const, label: "USDT", value: usdtBalance },
                    ].map((b) => (
                      <div key={b.symbol} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <TokenIcon symbol={b.symbol} size="sm" />
                          <span className="text-sm font-semibold az-mono">{b.label}</span>
                        </div>
                        <span className="font-bold az-mono text-lg" style={{ color: "var(--teal)" }}>
                          {b.value.toLocaleString("en-US", { minimumFractionDigits: 4, maximumFractionDigits: 4 })}
                        </span>
                      </div>
                    ))}
                  </div>
                  {/* Withdrawal stats */}
                  {withdrawals.length > 0 && (
                    <div className="grid grid-cols-3 gap-2 pt-3" style={{ borderTop: "1px solid var(--line)" }}>
                      {[
                        { label: "Pending", count: withdrawals.filter(w => w.status === 0).length, color: "var(--warn)" },
                        { label: "Sent",    count: withdrawals.filter(w => w.status === 1).length, color: "var(--teal)" },
                        { label: "Total",   count: withdrawals.length, color: "var(--text-2)" },
                      ].map(s => (
                        <div key={s.label} className="text-center">
                          <div className="font-bold az-mono text-lg" style={{ color: s.color }}>{s.count}</div>
                          <div className="text-[10px] az-mono" style={{ color: "var(--muted)" }}>{s.label}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* How withdrawals work */}
            <div className="az-card">
              <div className="text-xs az-mono mb-4 uppercase tracking-wider" style={{ color: "var(--muted)" }}>How Withdrawals Work</div>
              <div className="space-y-4">
                {[
                  {
                    step: "1",
                    title: "Submit Request",
                    desc: "Choose asset & amount, enter your BSC wallet address, and submit.",
                  },
                  {
                    step: "2",
                    title: "Admin Reviews",
                    desc: "Your request enters the queue and is reviewed manually. Usually processed within 24 hours.",
                  },
                  {
                    step: "3",
                    title: "Tokens Sent",
                    desc: "Admin sends real tokens from the treasury directly to your wallet address.",
                  },
                ].map(s => (
                  <div key={s.step} className="flex gap-3">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold az-mono mt-0.5"
                      style={{ background: "rgba(45,212,191,0.12)", color: "var(--teal)", border: "1px solid rgba(45,212,191,0.25)" }}>
                      {s.step}
                    </div>
                    <div>
                      <div className="text-sm font-semibold mb-0.5">{s.title}</div>
                      <div className="text-xs" style={{ color: "var(--text-2)" }}>{s.desc}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Fee + minimum info */}
              {(withdrawalFee > 0) && (
                <div className="mt-4 pt-3 space-y-1.5" style={{ borderTop: "1px solid var(--line)" }}>
                  <div className="flex justify-between text-xs">
                    <span style={{ color: "var(--muted)" }}>Withdrawal fee</span>
                    <span className="az-mono font-semibold" style={{ color: "var(--teal)" }}>{withdrawalFee}%</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span style={{ color: "var(--muted)" }}>Network</span>
                    <span className="az-mono font-semibold">BNB Chain (BEP-20)</span>
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>

        <div className="az-card">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h3 className="font-semibold">{t("queue")}</h3>
            <div className="flex flex-wrap items-center gap-2">
              <select className="rounded-ctl px-3 py-1.5 text-xs az-mono" style={selectStyle} value={statusFilter} onChange={(e) => { setStatusFilter(Number(e.target.value)); setWdPage(1); }}>
                <option value={-1}>All Status</option>
                <option value={0}>Pending</option>
                <option value={1}>Sent</option>
                <option value={2}>Rejected</option>
                <option value={3}>Cancelled</option>
              </select>
              <select className="rounded-ctl px-3 py-1.5 text-xs az-mono" style={selectStyle} value={assetFilter} onChange={(e) => { setAssetFilter(Number(e.target.value)); setWdPage(1); }}>
                <option value={-1}>All Assets</option>
                <option value={0}>AZR</option>
                <option value={1}>USDT</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="space-y-3 py-4">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-8 w-full" />)}</div>
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
                    <th className="text-left pb-3 font-normal">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: "var(--line)" }}>
                  {visibleWithdrawals.map((req) => (
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
                          <TxHashLink hash={req.sentTxHash} />
                        )}
                      </td>
                      <td className="py-3 text-xs az-mono" style={{ color: "var(--muted)" }}>
                        {new Date(req.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3">
                        {req.status === 0 ? (
                          <button
                            className="text-xs px-3 py-1.5 rounded-ctl font-semibold"
                            style={{ color: "#ef4444", border: "1px solid #ef4444", background: "rgba(239,68,68,0.1)" }}
                            disabled={cancelling === req.id}
                            onClick={() => doCancel(req.id, req.assetType, req.amount)}
                          >
                            {cancelling === req.id ? <Spinner size="sm" /> : "Cancel"}
                          </button>
                        ) : (
                          <span className="text-xs az-mono" style={{ color: "var(--muted)" }}>—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <AdminPaginator page={wdPage} totalPages={wdTotalPages} total={filtered.length} pageSize={WD_PAGE_SIZE}
            onFirst={() => setWdPage(1)} onPrev={() => setWdPage(p => p - 1)} onNext={() => setWdPage(p => p + 1)} onLast={() => setWdPage(wdTotalPages)} />
        </div>
      </div>
    </>
  );
}
