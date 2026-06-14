"use client";

import { AppTopbar } from "@/components/app/AppTopbar";
import { useTranslations } from "next-intl";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { CONTRACTS, ERC20_ABI, STAKING_ABI } from "@/lib/contracts";
import { useActiveChain } from "@/lib/hooks";
import { formatUnits, parseUnits } from "viem";
import { useState } from "react";
import { useToast } from "@/components/ui/Toast";

export default function SwapPage() {
  const t = useTranslations("swap");
  const { address: addr } = useAccount();
  const { toast } = useToast();
  const { chainId } = useActiveChain();

  const [dir, setDir] = useState<"buy" | "sell">("buy"); // buy = USDT→AZR
  const [amount, setAmount] = useState("");
  const { writeContractAsync, data: txHash } = useWriteContract();
  const { isLoading: confirming } = useWaitForTransactionReceipt({ hash: txHash });

  const { data: usdtBal, refetch: refetchUsdt } = useReadContract({ address: CONTRACTS[chainId].usdt, abi: ERC20_ABI, functionName: "balanceOf", args: addr ? [addr] : undefined, query: { enabled: !!addr } });
  const { data: azrBal, refetch: refetchAzr } = useReadContract({ address: CONTRACTS[chainId].azoraToken, abi: ERC20_ABI, functionName: "balanceOf", args: addr ? [addr] : undefined, query: { enabled: !!addr } });

  const fromBal = dir === "buy" ? (usdtBal ? parseFloat(formatUnits(usdtBal as bigint, 18)) : 0) : (azrBal ? parseFloat(formatUnits(azrBal as bigint, 18)) : 0);
  const fromLabel = dir === "buy" ? "USDT" : "AZR";
  const toLabel = dir === "buy" ? "AZR" : "USDT";

  const doSwap = async () => {
    if (!addr || !amount || parseFloat(amount) <= 0) return;
    const parsed = parseUnits(amount, 18);
    try {
      // First approve
      const approveAddr = dir === "buy" ? CONTRACTS[chainId].usdt : CONTRACTS[chainId].azoraToken;
      await writeContractAsync({ address: approveAddr, abi: ERC20_ABI, functionName: "approve", args: [CONTRACTS[chainId].staking, parsed] });
      // Then swap
      const fn = dir === "buy" ? "swapUSDTForToken" : "swapTokenForUSDT";
      await writeContractAsync({ address: CONTRACTS[chainId].staking, abi: STAKING_ABI, functionName: fn, args: [parsed] });
      toast(`Swapped ${amount} ${fromLabel} → ${toLabel}`);
      setAmount("");
      refetchUsdt();
      refetchAzr();
    } catch (e) {
      toast(e instanceof Error ? e.message.slice(0, 100) : "Transaction failed", "error");
    }
  };

  const TokenIcon = ({ symbol }: { symbol: string }) => {
    if (symbol === "USDT") return (
      <span className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-xs" style={{ background: "#26A17B", color: "white" }}>₮</span>
    );
    return (
      <span className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "linear-gradient(135deg, var(--teal), var(--teal-deep))" }}>
        <svg className="w-4 h-4" viewBox="0 0 32 32" fill="none">
          <path d="M16 4 L27 22 H5 Z" stroke="white" strokeWidth="2" strokeLinejoin="round" />
          <path d="M16 11 L21 20 H11 Z" fill="white" />
        </svg>
      </span>
    );
  };

  return (
    <>
      <AppTopbar title={t("title")} sub="Exchange USDT ↔ AZR · 1:1 reserve rate" />
      <div className="p-8 max-w-app">
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
                  <span className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-xl" style={{ background: "#26A17B", color: "white" }}>₮</span>
                  <span className="text-xs az-mono font-semibold">USDT</span>
                  <span className="text-[11px]" style={{ color: "var(--muted)" }}>Tether</span>
                </div>
                <div className="flex-1 flex flex-col items-center gap-1">
                  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="var(--teal)" strokeWidth="2"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
                  <span className="text-[11px] az-mono font-semibold" style={{ color: "var(--teal)" }}>1:1</span>
                </div>
                <div className="flex flex-col items-center gap-1.5">
                  <span className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: "linear-gradient(135deg, var(--teal), var(--teal-deep))" }}>
                    <svg className="w-6 h-6" viewBox="0 0 32 32" fill="none"><path d="M16 4 L27 22 H5 Z" stroke="white" strokeWidth="2" strokeLinejoin="round" /><path d="M16 11 L21 20 H11 Z" fill="white" /></svg>
                  </span>
                  <span className="text-xs az-mono font-semibold">AZR</span>
                  <span className="text-[11px]" style={{ color: "var(--muted)" }}>Azora</span>
                </div>
              </div>

              <div className="space-y-3 mb-6">
                {[
                  { icon: "✓", text: "No slippage — fixed 1:1 reserve rate" },
                  { icon: "✓", text: "Instant settlement on BNB Smart Chain" },
                  { icon: "✓", text: "Swap AZR to stake and earn 0.7% daily" },
                ].map((item) => (
                  <div key={item.text} className="flex items-start gap-2.5 text-sm" style={{ color: "var(--text-2)" }}>
                    <span className="font-bold mt-px" style={{ color: "var(--teal)" }}>{item.icon}</span>
                    {item.text}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Exchange Rate", value: "1 USDT = 1 AZR" },
                  { label: "Network", value: "BNB Chain" },
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
                  <TokenIcon symbol={fromLabel} />
                  <span className="text-xs az-mono font-semibold">{fromLabel}</span>
                </div>
                <span className="text-xs az-mono" style={{ color: "var(--muted)" }}>
                  {t("balance")}: {fromBal.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex gap-2">
                <input
                  className="az-input flex-1"
                  type="number"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
                <button
                  className="px-3 py-2 rounded-ctl text-xs font-semibold az-mono"
                  style={{ background: "rgba(45,212,191,0.1)", color: "var(--teal)" }}
                  onClick={() => setAmount(fromBal.toFixed(2))}
                >
                  {t("max")}
                </button>
              </div>
            </div>

            <div className="flex justify-center my-4">
              <button
                onClick={() => setDir(dir === "buy" ? "sell" : "buy")}
                className="w-10 h-10 rounded-full border flex items-center justify-center transition-all duration-200 hover:rotate-180 hover:border-teal"
                style={{ borderColor: "var(--line)", background: "var(--surface-2)" }}
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M8 15l4 4 4-4M8 9l4-4 4 4" /></svg>
              </button>
            </div>

            <div className="mb-6">
              <div className="flex items-center gap-2 mb-2">
                <TokenIcon symbol={toLabel} />
                <span className="text-xs az-mono font-semibold">{toLabel}</span>
              </div>
              <div
                className="w-full rounded-ctl border px-4 py-3.5 az-mono text-lg"
                style={{ background: "var(--bg-2)", borderColor: "var(--line)", color: "var(--text-2)" }}
              >
                {amount && parseFloat(amount) > 0 ? parseFloat(amount).toFixed(2) : "0.00"}
              </div>
            </div>

            <p className="text-xs mb-5 text-center" style={{ color: "var(--muted)" }}>{t("rateNote")}</p>

            <button className="az-btn-primary w-full" onClick={doSwap} disabled={confirming || !amount}>
              {confirming ? t("swapping") : t("swapBtn")}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
