"use client";

import { AppTopbar } from "@/components/app/AppTopbar";
import { Spinner } from "@/components/ui/Spinner";
import { TokenIcon } from "@/components/ui/TokenIcon";
import { useAccount } from "wagmi";
import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/components/ui/Toast";
import { AdminPaginator } from "@/components/ui/AdminPaginator";
import QRCode from "react-qr-code";

type Deposit = {
  id: number;
  txHash: string;
  amount: number;
  status: number;
  createdAt: string;
  confirmedAt: string | null;
};

type Balance = { usdtBalance: number; azrBalance: number };

export default function DepositPage() {
  const { address: addr } = useAccount();
  const { toast } = useToast();

  const [txHash, setTxHash] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [depPage, setDepPage] = useState(1);
  const [balance, setBalance] = useState<Balance>({ usdtBalance: 0, azrBalance: 0 });
  const [treasuryWallet, setTreasuryWallet] = useState("");

  // Fetch treasury wallet at runtime — not a build-time env var so it works on cPanel
  useEffect(() => {
    fetch("/api/config")
      .then((r) => r.json())
      .then((d) => { if (d.treasuryWallet) setTreasuryWallet(d.treasuryWallet); })
      .catch(() => {});
  }, []);

  const fetchData = useCallback(async () => {
    if (!addr) return;
    const [depRes, balRes] = await Promise.all([
      fetch(`/api/deposit?wallet=${addr}`),
      fetch(`/api/virtual/balance?wallet=${addr}`),
    ]);
    if (depRes.ok) { const d = await depRes.json(); setDeposits(d.deposits ?? []); }
    if (balRes.ok) { const b = await balRes.json(); setBalance(b); }
  }, [addr]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleDeposit = async () => {
    if (!addr || !txHash.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/deposit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ txHash: txHash.trim(), wallet: addr }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast(data.error ?? "Verification failed", "error");
      } else {
        toast(`Deposit verified — ${data.credited.toFixed(4)} USDT credited to your account`);
        setTxHash("");
        fetchData();
      }
    } catch {
      toast("Network error", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <AppTopbar title="Deposit" sub="Fund your account · no gas fees after deposit" />
      <div className="p-4 md:p-8 max-w-app space-y-6">

        {/* Balance summary */}
        {addr && (
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: "USDT", value: balance.usdtBalance.toFixed(4), symbol: "USDT" as const },
              { label: "AZR", value: balance.azrBalance.toFixed(4), symbol: "AZR" as const },
            ].map((b) => (
              <div key={b.symbol} className="az-card text-center">
                <div className="text-[11px] az-mono mb-2" style={{ color: "var(--muted)" }}>{b.label}</div>
                <div className="flex items-center justify-center gap-2 mb-1">
                  <TokenIcon symbol={b.symbol} size="sm" />
                  <span className="font-bold az-mono text-xl" style={{ color: "var(--teal)" }}>{b.value}</span>
                </div>
                <div className="text-[11px] az-mono" style={{ color: "var(--muted)" }}>{b.symbol}</div>
              </div>
            ))}
          </div>
        )}

        {/* Step 1 — send USDT */}
        <div className="az-card">
          <h3 className="font-semibold mb-4">Step 1 — Send USDT to  Staking wallet</h3>
          <p className="text-xs mb-4" style={{ color: "var(--text-2)" }}>
            Send USDT (BEP-20) from your external wallet to the address below. Once confirmed on BSC, submit your transaction hash in Step 2.
          </p>
          {treasuryWallet ? (
            <div>
              <label className="text-[11px] az-mono mb-2 block" style={{ color: "var(--muted)" }}> Staking wallet Address (BNB Chain / BEP-20)</label>
              <div className="flex gap-2 items-center">
                <div
                  className="flex-1 rounded-ctl px-3 py-2.5 text-sm az-mono break-all"
                  style={{ background: "var(--bg-2)", border: "1px solid var(--line)", color: "var(--teal)" }}
                >
                  {treasuryWallet}
                </div>
                <button
                  className="px-3 py-2.5 rounded-ctl text-xs font-semibold flex-shrink-0"
                  style={{ background: "rgba(45,212,191,0.1)", color: "var(--teal)" }}
                  onClick={() => copy(treasuryWallet)}
                >
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>
              <div className="mt-3 rounded-ctl px-3 py-2 text-[11px] az-mono" style={{ background: "rgba(243,186,47,0.08)", color: "#f3ba2f", border: "1px solid rgba(243,186,47,0.2)" }}>
                ⚠ Only send USDT (BEP-20/BSC). Sending BNB or tokens on other chains will result in permanent loss.
              </div>
              <div className="flex flex-col items-center gap-2 mt-5">
                <div className="p-3 rounded-ctl" style={{ background: "#ffffff" }}>
                  <QRCode value={treasuryWallet} size={156} />
                </div>
                <p className="text-[11px] az-mono" style={{ color: "var(--muted)" }}>Scan with your wallet or exchange app</p>
              </div>
            </div>
          ) : (
            <div className="text-xs py-4 text-center" style={{ color: "var(--text-2)" }}>
               Staking wallet address not configured yet. Contact admin.
            </div>
          )}
        </div>

        {/* Step 2 — submit TX hash */}
        <div className="az-card">
          <h3 className="font-semibold mb-4">Step 2 — Submit Your Transaction Hash</h3>
          <p className="text-xs mb-3" style={{ color: "var(--text-2)" }}>
            After your USDT transfer is confirmed on BSC (usually 15–30 seconds), paste the transaction hash below. The system will verify it on-chain automatically and credit your USDT balance.
          </p>
          <div className="mb-4 rounded-ctl px-3 py-2 text-[11px] az-mono" style={{ background: "rgba(45,212,191,0.06)", color: "var(--teal)", border: "1px solid rgba(45,212,191,0.15)" }}>
            Sending from Binance, OKX or another exchange? Select BSC (BEP-20) network and paste the TX hash after it confirms.
          </div>
          {!addr ? (
            <p className="text-sm py-4 text-center" style={{ color: "var(--text-2)" }}>Connect your wallet to submit a deposit.</p>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="text-[11px] az-mono mb-1 block" style={{ color: "var(--muted)" }}>Transaction Hash (0x...)</label>
                <input
                  className="az-input"
                  placeholder="0x..."
                  value={txHash}
                  onChange={(e) => setTxHash(e.target.value)}
                  disabled={submitting}
                />
              </div>
              <button
                className="az-btn-primary w-full"
                onClick={handleDeposit}
                disabled={submitting || !txHash.trim() || !treasuryWallet}
              >
                {submitting
                  ? <span className="flex items-center justify-center gap-2"><Spinner size="sm" /> Verifying on-chain…</span>
                  : "Verify & Credit Balance"}
              </button>
            </div>
          )}
        </div>

        {/* Deposit history */}
        {addr && (
          <div className="az-card">
            <h3 className="font-semibold mb-4">Deposit History</h3>
            {deposits.length === 0 ? (
              <p className="text-sm text-center py-6" style={{ color: "var(--text-2)" }}>No deposits yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="az-mono text-[11px] uppercase" style={{ color: "var(--muted)" }}>
                      <th className="text-left pb-3 font-normal">Date</th>
                      <th className="text-right pb-3 font-normal">Amount</th>
                      <th className="text-left pb-3 font-normal pl-4">TX Hash</th>
                      <th className="text-left pb-3 font-normal">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y" style={{ borderColor: "var(--line)" }}>
                    {deposits.slice((depPage-1)*10, depPage*10).map((d) => (
                      <tr key={d.id}>
                        <td className="py-3 text-xs" style={{ color: "var(--text-2)" }}>
                          {new Date(d.createdAt).toLocaleDateString()}
                        </td>
                        <td className="py-3 az-mono text-right font-semibold" style={{ color: "var(--teal)" }}>
                          +{d.amount.toFixed(4)} USDT
                        </td>
                        <td className="py-3 az-mono text-xs pl-4" style={{ color: "var(--muted)" }}>
                          {d.txHash.slice(0, 10)}…{d.txHash.slice(-6)}
                        </td>
                        <td className="py-3">
                          <span className="az-mono text-xs font-semibold" style={{ color: d.status === 1 ? "var(--teal)" : "#ef4444" }}>
                            {d.status === 1 ? "Confirmed" : "Rejected"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <AdminPaginator page={depPage} totalPages={Math.max(1, Math.ceil(deposits.length/10))} total={deposits.length} pageSize={10}
              onFirst={() => setDepPage(1)} onPrev={() => setDepPage(p => p-1)} onNext={() => setDepPage(p => p+1)} onLast={() => setDepPage(Math.max(1, Math.ceil(deposits.length/10)))} />
          </div>
        )}
      </div>
    </>
  );
}
