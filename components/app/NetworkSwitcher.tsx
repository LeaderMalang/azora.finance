"use client";

import { useAccount, useSwitchChain } from "wagmi";
import { useAppStore } from "@/lib/store";
import { useActiveChain } from "@/lib/hooks";
import { useEffect } from "react";

export function NetworkSwitcher() {
  const { isConnected, chainId: walletChainId } = useAccount();
  const { setActiveChainId } = useAppStore();
  const { chainId } = useActiveChain();
  const { switchChain, isPending } = useSwitchChain();

  // Keep store in sync when user switches chain directly in their wallet
  useEffect(() => {
    if (walletChainId === 56 || walletChainId === 97) {
      setActiveChainId(walletChainId);
    }
  }, [walletChainId, setActiveChainId]);

  const handleSwitch = (targetId: 56 | 97) => {
    if (isPending || targetId === chainId) return;
    setActiveChainId(targetId);
    if (isConnected) {
      switchChain({ chainId: targetId });
    }
  };

  const NETS = [
    { id: 56 as const, label: "Mainnet", dot: "#22c55e" },
    { id: 97 as const, label: "Testnet", dot: "#eab308" },
  ];

  return (
    <div
      className="flex items-center rounded-ctl p-0.5 gap-0.5"
      style={{ background: "var(--bg-2)", border: "1px solid var(--line)" }}
    >
      {NETS.map((net) => {
        const isActive = chainId === net.id;
        const switchingToThis = isPending && !isActive;
        return (
          <button
            key={net.id}
            onClick={() => handleSwitch(net.id)}
            disabled={isPending}
            title={isConnected ? `Switch wallet to ${net.label}` : `Preview ${net.label}`}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-[6px] text-xs font-medium transition-all disabled:cursor-wait"
            style={{
              background: isActive ? "var(--elevated)" : "transparent",
              color: isActive ? "var(--text)" : "var(--muted)",
            }}
          >
            {switchingToThis ? (
              <svg
                className="w-2 h-2 animate-spin"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
              >
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
              </svg>
            ) : (
              <span
                className="w-2 h-2 rounded-full flex-shrink-0 transition-opacity"
                style={{ background: net.dot, opacity: isActive ? 1 : 0.35 }}
              />
            )}
            {net.label}
          </button>
        );
      })}
    </div>
  );
}
