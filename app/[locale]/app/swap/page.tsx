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

  const { data: usdtBal } = useReadContract({ address: CONTRACTS[chainId].usdt, abi: ERC20_ABI, functionName: "balanceOf", args: addr ? [addr] : undefined, query: { enabled: !!addr } });
  const { data: azrBal } = useReadContract({ address: CONTRACTS[chainId].azoraToken, abi: ERC20_ABI, functionName: "balanceOf", args: addr ? [addr] : undefined, query: { enabled: !!addr } });

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
    } catch (e) {
      toast(e instanceof Error ? e.message.slice(0, 100) : "Transaction failed", "error");
    }
  };

  return (
    <>
      <AppTopbar title={t("title")} sub="Exchange USDT ↔ AZR · 1:1 reserve rate" />
      <div className="p-8 max-w-app">
        <div className="max-w-md">
          <div className="az-card">
            <div className="mb-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs az-mono" style={{ color: "var(--muted)" }}>From · {fromLabel}</span>
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
                className="w-10 h-10 rounded-full border flex items-center justify-center transition-colors hover:border-teal"
                style={{ borderColor: "var(--line)", background: "var(--surface-2)" }}
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M8 15l4 4 4-4M8 9l4-4 4 4" /></svg>
              </button>
            </div>

            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs az-mono" style={{ color: "var(--muted)" }}>To · {toLabel}</span>
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
