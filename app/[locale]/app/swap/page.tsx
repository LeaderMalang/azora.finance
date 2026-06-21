"use client";

import { AppTopbar } from "@/components/app/AppTopbar";
import { useTranslations } from "next-intl";
import { useAccount } from "wagmi";
import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/components/ui/Toast";
import { Spinner } from "@/components/ui/Spinner";
import { TokenIcon } from "@/components/ui/TokenIcon";

export default function SwapPage() {
  const t = useTranslations("swap");
  const { address: addr } = useAccount();
  const { toast } = useToast();

  const [dir, setDir]     = useState<"buy" | "sell">("buy");
  const [amount, setAmount] = useState("");
  const [pending, setPending] = useState(false);
  const [usdtBal, setUsdtBal] = useState(0);
  const [azrBal,  setAzrBal]  = useState(0);

  const fetchBalance = useCallback(async () => {
    if (!addr) return;
    const res = await fetch(`/api/virtual/balance?wallet=${addr}`);
    if (res.ok) { const d = await res.json(); setUsdtBal(d.usdtBalance ?? 0); setAzrBal(d.azrBalance ?? 0); }
  }, [addr]);

  useEffect(() => { fetchBalance(); }, [fetchBalance]);

  const fromBal   = dir === "buy" ? usdtBal : azrBal;
  const fromLabel = dir === "buy" ? "USDT" : "AZR";
  const toLabel   = dir === "buy" ? "AZR"  : "USDT";

  const doSwap = async () => {
    if (!addr || !amount || parseFloat(amount) <= 0) return;
    const amt = parseFloat(amount);
    if (amt > fromBal) { toast(`Insufficient ${fromLabel} balance`, "error"); return; }
    setPending(true);
    try {
      const res = await fetch("/api/virtual/swap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet: addr, amount: amt, direction: dir }),
      });
      const d = await res.json();
      if (!res.ok) { toast(d.error ?? "Swap failed", "error"); return; }
      toast(`Swapped ${amt} ${fromLabel} → ${amt} ${toLabel}`);
      setAmount("");
      fetchBalance();
    } catch { toast("Network error", "error"); }
    finally { setPending(false); }
  };

  return (
    <>
      <AppTopbar title={t("title")} sub="Exchange USDT ↔ AZR · instant · no gas" />
      <div className="p-4 md:p-8 max-w-app">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">

          {/* Promo panel */}
          <div className="az-card-glow relative overflow-hidden">
            <div className="absolute inset-0 opacity-10" style={{ background: "radial-gradient(ellipse at top left, var(--teal), transparent 70%)" }} />
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "rgba(45,212,191,0.15)" }}>
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="var(--teal)" strokeWidth="1.8"><path d="M12 5v14M8 15l4 4 4-4M8 9l4-4 4 4" /></svg>
                </div>
                <div>
                  <div className="font-semibold text-sm">Instant Exchange</div>
                  <div className="text-xs" style={{ color: "var(--muted)" }}>Powered by Azora Reserve</div>
                </div>
              </div>

              <div className="flex items-center gap-4 mb-6">
                <div className="flex flex-col items-center gap-1.5">
                  <TokenIcon symbol="USDT" size="lg" />
                  <span className="text-xs az-mono font-semibold">USDT</span>
                  <span className="text-[11px]" style={{ color: "var(--muted)" }}>Tether</span>
                </div>
                <div className="flex-1 flex flex-col items-center gap-1">
                  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="var(--teal)" strokeWidth="2"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
                  <span className="text-[11px] az-mono font-semibold" style={{ color: "var(--teal)" }}>1:1</span>
                </div>
                <div className="flex flex-col items-center gap-1.5">
                  <TokenIcon symbol="AZR" size="lg" />
                  <span className="text-xs az-mono font-semibold">AZR</span>
                  <span className="text-[11px]" style={{ color: "var(--muted)" }}>Azora</span>
                </div>
              </div>

              <div className="space-y-3 mb-6">
                {[
                  { text: "No slippage — fixed 1:1 reserve rate" },
                  { text: "Instant settlement — no gas fees, no waiting" },
                  { text: "Swap AZR to stake and earn 0.7% daily" },
                ].map((item) => (
                  <div key={item.text} className="flex items-start gap-2.5 text-sm" style={{ color: "var(--text-2)" }}>
                    <span className="font-bold mt-px" style={{ color: "var(--teal)" }}>✓</span>
                    {item.text}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Exchange Rate", value: "1 USDT = 1 AZR" },
                  { label: "Settlement", value: "Instant" },
                ].map((s) => (
                  <div key={s.label} className="rounded-ctl px-3 py-2.5" style={{ background: "rgba(45,212,191,0.06)", border: "1px solid rgba(45,212,191,0.15)" }}>
                    <div className="text-[11px] az-mono mb-1" style={{ color: "var(--muted)" }}>{s.label}</div>
                    <div className="text-sm font-semibold az-mono" style={{ color: "var(--teal)" }}>{s.value}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Swap form */}
          <div className="az-card">
            <div className="mb-5">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <TokenIcon symbol={fromLabel as "USDT" | "AZR"} size="sm" />
                  <span className="text-xs az-mono font-semibold">{fromLabel}</span>
                </div>
                <span className="text-xs az-mono" style={{ color: "var(--muted)" }}>
                  {t("balance")}: {fromBal.toFixed(4)}
                </span>
              </div>
              <div className="flex gap-2">
                <input
                  className="az-input flex-1"
                  type="number"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  disabled={pending}
                />
                <button
                  className="px-3 py-2 rounded-ctl text-xs font-semibold az-mono"
                  style={{ background: "rgba(45,212,191,0.1)", color: "var(--teal)" }}
                  onClick={() => setAmount(fromBal.toFixed(4))}
                  disabled={pending}
                >
                  {t("max")}
                </button>
              </div>
            </div>

            <div className="flex justify-center my-4">
              <button
                onClick={() => { setDir(dir === "buy" ? "sell" : "buy"); setAmount(""); }}
                className="w-10 h-10 rounded-full border flex items-center justify-center transition-all duration-200 hover:border-teal"
                style={{ borderColor: "var(--line)", background: "var(--surface-2)" }}
                disabled={pending}
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M8 15l4 4 4-4M8 9l4-4 4 4" /></svg>
              </button>
            </div>

            <div className="mb-6">
              <div className="flex items-center gap-2 mb-2">
                <TokenIcon symbol={toLabel as "USDT" | "AZR"} size="sm" />
                <span className="text-xs az-mono font-semibold">{toLabel}</span>
              </div>
              <div
                className="w-full rounded-ctl border px-4 py-3.5 az-mono text-lg"
                style={{ background: "var(--bg-2)", borderColor: "var(--line)", color: "var(--text-2)" }}
              >
                {amount && parseFloat(amount) > 0 ? parseFloat(amount).toFixed(4) : "0.0000"}
              </div>
            </div>

            <p className="text-xs mb-5 text-center" style={{ color: "var(--muted)" }}>{t("rateNote")}</p>

            {pending && (
              <div className="flex items-center gap-2 text-xs py-2 px-3 rounded-ctl mb-3" style={{ background: "rgba(45,212,191,0.08)", color: "var(--teal)" }}>
                <Spinner size="sm" /> Processing swap…
              </div>
            )}

            <button className="az-btn-primary w-full" onClick={doSwap} disabled={pending || !amount || !addr}>
              {pending ? <span className="flex items-center justify-center gap-2"><Spinner size="sm" /> Processing…</span> : t("swapBtn")}
            </button>

            {!addr && (
              <p className="text-xs mt-3 text-center" style={{ color: "var(--muted)" }}>Connect your wallet to swap.</p>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
