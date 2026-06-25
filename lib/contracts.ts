export const CONTRACTS = {
  97: {
    azoraToken: "0x702e0C75304372A2d277979Ca8D6889eb379a2e5" as `0x${string}`,
    staking: "0x92b7C477F218998Ef1Fe0a4AB6137eCA49d6DDB5" as `0x${string}`,
    usdt: "0x337610d27c682E347C9cD60BD4b3b107C9d34dDd" as `0x${string}`,
  },
  56: {
    azoraToken: "0x09A03Ee682E6C425aBccD5c5439DFD7e037ED269" as `0x${string}`,
    staking: "0xebA7e4F8d4a5404d3570782d85B012b2C4cd4CE9" as `0x${string}`,
    usdt: "0x55d398326f99059fF775485246999027B3197955" as `0x${string}`,
  },
} as const;

export const STAKING_ABI = [
  // ── Registration ──────────────────────────────────────────────────────────
  { name: "registerUser", type: "function", stateMutability: "nonpayable", inputs: [{ name: "username", type: "string" }, { name: "referralUsername", type: "string" }], outputs: [] },
  { name: "isUsernameTaken", type: "function", stateMutability: "view", inputs: [{ name: "username", type: "string" }], outputs: [{ name: "", type: "bool" }] },
  { name: "addressByUsername", type: "function", stateMutability: "view", inputs: [{ name: "", type: "string" }], outputs: [{ name: "", type: "address" }] },
  { name: "referredBy", type: "function", stateMutability: "view", inputs: [{ name: "username", type: "string" }], outputs: [{ name: "", type: "string" }] },

  // ── User info (registration only — no stake fields) ───────────────────────
  {
    name: "usersByAddress",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "", type: "address" }],
    outputs: [
      { name: "walletAddress", type: "address" },
      { name: "username", type: "string" },
      { name: "isRegistered", type: "bool" },
    ],
  },

  // ── Staking ───────────────────────────────────────────────────────────────
  { name: "stake", type: "function", stateMutability: "nonpayable", inputs: [{ name: "amount", type: "uint256" }, { name: "referralUsername", type: "string" }], outputs: [] },
  { name: "unstake", type: "function", stateMutability: "nonpayable", inputs: [{ name: "stakeId", type: "uint256" }], outputs: [] },
  { name: "claimRewards", type: "function", stateMutability: "nonpayable", inputs: [{ name: "stakeId", type: "uint256" }], outputs: [] },
  { name: "claimAllRewards", type: "function", stateMutability: "nonpayable", inputs: [], outputs: [] },

  // ── Stake view helpers ────────────────────────────────────────────────────
  {
    name: "getUserStakes",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "wallet", type: "address" }],
    outputs: [{
      name: "",
      type: "tuple[]",
      components: [
        { name: "id", type: "uint256" },
        { name: "amount", type: "uint256" },
        { name: "startTime", type: "uint256" },
        { name: "lastClaimTime", type: "uint256" },
        { name: "unlockTime", type: "uint256" },
        { name: "active", type: "bool" },
      ],
    }],
  },
  { name: "getUserStakeCount", type: "function", stateMutability: "view", inputs: [{ name: "wallet", type: "address" }], outputs: [{ name: "", type: "uint256" }] },
  { name: "getTotalStaked", type: "function", stateMutability: "view", inputs: [{ name: "wallet", type: "address" }], outputs: [{ name: "", type: "uint256" }] },
  { name: "getPendingRewards", type: "function", stateMutability: "view", inputs: [{ name: "wallet", type: "address" }], outputs: [{ name: "", type: "uint256" }] },
  { name: "getPendingRewardsForStake", type: "function", stateMutability: "view", inputs: [{ name: "wallet", type: "address" }, { name: "stakeId", type: "uint256" }], outputs: [{ name: "", type: "uint256" }] },
  { name: "hasActiveStake", type: "function", stateMutability: "view", inputs: [{ name: "wallet", type: "address" }], outputs: [{ name: "", type: "bool" }] },

  // ── Swap ──────────────────────────────────────────────────────────────────
  { name: "swapUSDTForToken", type: "function", stateMutability: "nonpayable", inputs: [{ name: "amount", type: "uint256" }], outputs: [] },
  { name: "swapTokenForUSDT", type: "function", stateMutability: "nonpayable", inputs: [{ name: "amount", type: "uint256" }], outputs: [] },

  // ── Withdrawal ────────────────────────────────────────────────────────────
  { name: "requestWithdrawal", type: "function", stateMutability: "nonpayable", inputs: [{ name: "amount", type: "uint256" }, { name: "assetType", type: "uint8" }], outputs: [] },
  { name: "withdrawalRequests", type: "function", stateMutability: "view", inputs: [{ name: "requestId", type: "uint256" }], outputs: [{ name: "id", type: "uint256" }, { name: "requester", type: "address" }, { name: "amount", type: "uint256" }, { name: "assetType", type: "uint8" }, { name: "status", type: "uint8" }, { name: "createdAt", type: "uint256" }] },
  { name: "withdrawalRequestCount", type: "function", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint256" }] },

  // ── Protocol params ───────────────────────────────────────────────────────
  { name: "rewardRatePerSecond", type: "function", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint256" }] },
  { name: "lockPeriod", type: "function", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint256" }] },
  { name: "minStakeAmount", type: "function", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint256" }] },
  { name: "withdrawalFeeBps", type: "function", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint256" }] },
  { name: "referralRateL1", type: "function", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint256" }] },
  { name: "referralRateL2", type: "function", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint256" }] },
  { name: "referralRateL3", type: "function", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint256" }] },

  // ── Admin ─────────────────────────────────────────────────────────────────
  { name: "owner", type: "function", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "address" }] },
  { name: "paused", type: "function", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "bool" }] },
  { name: "setLockPeriod", type: "function", stateMutability: "nonpayable", inputs: [{ name: "newPeriod", type: "uint256" }], outputs: [] },
  { name: "setRewardRate", type: "function", stateMutability: "nonpayable", inputs: [{ name: "dailyRateBps", type: "uint256" }], outputs: [] },
  { name: "setMinStake", type: "function", stateMutability: "nonpayable", inputs: [{ name: "newMin", type: "uint256" }], outputs: [] },
  { name: "setWithdrawalFee", type: "function", stateMutability: "nonpayable", inputs: [{ name: "bps", type: "uint256" }], outputs: [] },
  { name: "setReferralRates", type: "function", stateMutability: "nonpayable", inputs: [{ name: "l1", type: "uint256" }, { name: "l2", type: "uint256" }, { name: "l3", type: "uint256" }], outputs: [] },
  { name: "debitAccount", type: "function", stateMutability: "nonpayable", inputs: [{ name: "user", type: "address" }, { name: "amount", type: "uint256" }], outputs: [] },
  { name: "approveWithdrawal", type: "function", stateMutability: "nonpayable", inputs: [{ name: "requestId", type: "uint256" }], outputs: [] },
  { name: "rejectWithdrawal", type: "function", stateMutability: "nonpayable", inputs: [{ name: "requestId", type: "uint256" }], outputs: [] },
  { name: "pause", type: "function", stateMutability: "nonpayable", inputs: [], outputs: [] },
  { name: "unpause", type: "function", stateMutability: "nonpayable", inputs: [], outputs: [] },
] as const;

export const ERC20_ABI = [
  { name: "balanceOf", type: "function", stateMutability: "view", inputs: [{ name: "account", type: "address" }], outputs: [{ name: "", type: "uint256" }] },
  { name: "approve", type: "function", stateMutability: "nonpayable", inputs: [{ name: "spender", type: "address" }, { name: "amount", type: "uint256" }], outputs: [{ name: "", type: "bool" }] },
  { name: "allowance", type: "function", stateMutability: "view", inputs: [{ name: "owner", type: "address" }, { name: "spender", type: "address" }], outputs: [{ name: "", type: "uint256" }] },
  { name: "decimals", type: "function", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint8" }] },
  { name: "transfer", type: "function", stateMutability: "nonpayable", inputs: [{ name: "to", type: "address" }, { name: "amount", type: "uint256" }], outputs: [{ name: "", type: "bool" }] },
] as const;

// Earliest block to scan for events — prevents RPC range-limit errors on BSC
export const STAKING_DEPLOY_BLOCK = BigInt(47_000_000);

export const REFERRAL_COMMISSION_EVENT = {
  name: "ReferralCommission",
  type: "event",
  inputs: [
    { name: "recipient", type: "address", indexed: true },
    { name: "from",      type: "address", indexed: true },
    { name: "level",     type: "uint8",   indexed: false },
    { name: "amount",    type: "uint256", indexed: false },
  ],
} as const;

export const REWARDS_CLAIMED_EVENT = {
  name: "RewardsClaimed",
  type: "event",
  inputs: [
    { name: "user", type: "address", indexed: true },
    { name: "stakeId", type: "uint256", indexed: false },
    { name: "amount", type: "uint256", indexed: false },
  ],
} as const;
