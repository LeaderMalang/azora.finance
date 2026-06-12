export const CONTRACTS = {
  97: {
    azoraToken: "0x45490483797889A8Be1946CE0013DA0b9F1ADae6" as `0x${string}`,
    staking: "0x8BcC54F3587ea804fE3054B3eB75D77cf23C240d" as `0x${string}`,
    usdt: "0x337610D27C682E347c9Cd60bD4B3B107c9D34dDF" as `0x${string}`,
  },
  56: {
    azoraToken: "0x34c7A9Dc9643223CB9f0dA4Ce9dd6f9f011EE206" as `0x${string}`,
    staking: "0xebA7e4F8d4a5404d3570782d85B012b2C4cd4CE9" as `0x${string}`,
    usdt: "0x55d398326f99059fF775485246999027B3197955" as `0x${string}`,
  },
} as const;

export const STAKING_ABI = [
  { name: "registerUser", type: "function", stateMutability: "nonpayable", inputs: [{ name: "username", type: "string" }, { name: "referralUsername", type: "string" }], outputs: [] },
  { name: "stake", type: "function", stateMutability: "nonpayable", inputs: [{ name: "amount", type: "uint256" }, { name: "referralUsername", type: "string" }], outputs: [] },
  { name: "unstake", type: "function", stateMutability: "nonpayable", inputs: [], outputs: [] },
  { name: "claimRewards", type: "function", stateMutability: "nonpayable", inputs: [], outputs: [] },
  { name: "swapUSDTForToken", type: "function", stateMutability: "nonpayable", inputs: [{ name: "amount", type: "uint256" }], outputs: [] },
  { name: "swapTokenForUSDT", type: "function", stateMutability: "nonpayable", inputs: [{ name: "amount", type: "uint256" }], outputs: [] },
  { name: "requestWithdrawal", type: "function", stateMutability: "nonpayable", inputs: [{ name: "amount", type: "uint256" }, { name: "assetType", type: "uint8" }], outputs: [] },
  { name: "getUserInfo", type: "function", stateMutability: "view", inputs: [{ name: "wallet", type: "address" }], outputs: [{ name: "walletAddress", type: "address" }, { name: "username", type: "string" }, { name: "isRegistered", type: "bool" }, { name: "stakedAmount", type: "uint256" }, { name: "stakeStartTime", type: "uint256" }, { name: "lastClaimTime", type: "uint256" }, { name: "unlockTime", type: "uint256" }, { name: "hasActiveStake", type: "bool" }] },
  { name: "getPendingRewards", type: "function", stateMutability: "view", inputs: [{ name: "wallet", type: "address" }], outputs: [{ name: "", type: "uint256" }] },
  { name: "rewardRatePerSecond", type: "function", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint256" }] },
  { name: "lockPeriod", type: "function", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint256" }] },
  { name: "minStakeAmount", type: "function", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint256" }] },
  { name: "withdrawalFeeBps", type: "function", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint256" }] },
  { name: "referralRateL1", type: "function", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint256" }] },
  { name: "referralRateL2", type: "function", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint256" }] },
  { name: "referralRateL3", type: "function", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint256" }] },
  { name: "getWithdrawalRequest", type: "function", stateMutability: "view", inputs: [{ name: "id", type: "uint256" }], outputs: [{ name: "id", type: "uint256" }, { name: "requester", type: "address" }, { name: "amount", type: "uint256" }, { name: "assetType", type: "uint8" }, { name: "status", type: "uint8" }, { name: "createdAt", type: "uint256" }] },
  { name: "withdrawalRequestCount", type: "function", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint256" }] },
  { name: "isUsernameTaken", type: "function", stateMutability: "view", inputs: [{ name: "username", type: "string" }], outputs: [{ name: "", type: "bool" }] },
] as const;

export const ERC20_ABI = [
  { name: "balanceOf", type: "function", stateMutability: "view", inputs: [{ name: "account", type: "address" }], outputs: [{ name: "", type: "uint256" }] },
  { name: "approve", type: "function", stateMutability: "nonpayable", inputs: [{ name: "spender", type: "address" }, { name: "amount", type: "uint256" }], outputs: [{ name: "", type: "bool" }] },
  { name: "allowance", type: "function", stateMutability: "view", inputs: [{ name: "owner", type: "address" }, { name: "spender", type: "address" }], outputs: [{ name: "", type: "uint256" }] },
  { name: "decimals", type: "function", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint8" }] },
] as const;
