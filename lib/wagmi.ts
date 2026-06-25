"use client";

import { defaultWagmiConfig } from "@web3modal/wagmi/react/config";
import { cookieStorage, createStorage } from "wagmi";
import { http, fallback } from "viem";
import { bsc } from "viem/chains";

export const targetChain = bsc;

export const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID!;

const metadata = {
  name: "Azora",
  description: "Stake AZR. Earn 0.7% every day.",
  url: "https://azora.finance",
  icons: ["https://azora.finance/icon.png"],
};

export const wagmiConfig = defaultWagmiConfig({
  chains: [bsc],
  projectId,
  metadata,
  ssr: true,
  storage: createStorage({ storage: cookieStorage }),
  transports: {
    [bsc.id]: fallback([
      http("https://bsc-dataseed1.binance.org"),
      http("https://bsc-dataseed2.binance.org"),
      http("https://bsc-dataseed3.binance.org"),
      http("https://bsc-dataseed1.defibit.io"),
    ]),
  },
});
