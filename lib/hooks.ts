"use client";

import { useAccount } from "wagmi";
import { useAppStore } from "./store";

export function useActiveChain(): { chainId: 56 | 97 } {
  const { chainId: walletChainId } = useAccount();
  const { activeChainId } = useAppStore();
  const resolved =
    walletChainId === 56 || walletChainId === 97 ? walletChainId : activeChainId;
  return { chainId: resolved as 56 | 97 };
}
