"use client";

import { defaultWagmiConfig } from "@web3modal/wagmi/react/config";
import { cookieStorage, createStorage } from "wagmi";
import { http, fallback } from "viem";
import { bsc, bscTestnet } from "viem/chains";

const chainId = Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? 97);
export const targetChain = chainId === 56 ? bsc : bscTestnet;

export const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID!;

const metadata = {
  name: "Azora",
  description: "Stake AZR. Earn 0.7% every day.",
  url: "https://azora.finance",
  icons: ["https://azora.finance/icon.png"],
};

export const wagmiConfig = defaultWagmiConfig({
  chains: [bsc, bscTestnet],
  projectId,
  metadata,
  ssr: true,
  storage: createStorage({ storage: cookieStorage }),
  transports: {
    [bsc.id]: fallback([
      http("https://bsc.publicnode.com"),
      http("https://bsc-dataseed.bnbchain.org"),
      http("https://bsc-dataseed1.defibit.io"),
    ]),
    [bscTestnet.id]: fallback([
      http("https://bsc-testnet.publicnode.com"),
      http("https://data-seed-prebsc-1-s1.bnbchain.org:8545"),
      http("https://data-seed-prebsc-2-s1.bnbchain.org:8545"),
    ]),
  },
});
