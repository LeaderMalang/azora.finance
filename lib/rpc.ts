import { createPublicClient, http } from "viem";
import { bsc, bscTestnet } from "viem/chains";

const chainId = Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? "97");

const RPC_URLS: Record<number, string> = {
  56:  process.env.BSC_RPC_URL ?? "https://bsc-dataseed.binance.org/",
  97:  process.env.BSC_RPC_URL ?? "https://data-seed-prebsc-1-s1.binance.org:8545/",
};

export function getServerPublicClient() {
  const chain = chainId === 56 ? bsc : bscTestnet;
  return createPublicClient({
    chain,
    transport: http(RPC_URLS[chainId]),
  });
}

export const ADMIN_TREASURY_WALLET =
  (process.env.ADMIN_TREASURY_WALLET ?? "").toLowerCase();

export const USDT_ADDRESS: Record<number, string> = {
  56: "0x55d398326f99059fF775485246999027B3197955",
  97: "0x337610d27c682E347C9cD60BD4b3b107C9d34dDd",
};

export const SWAP_RATE = parseFloat(process.env.SWAP_RATE ?? "1"); // USDT per AZR
