// Contract addresses and ABIs for Fieble Protocol

export const CONTRACT_ADDRESSES = {
  mockUSDC: (process.env.NEXT_PUBLIC_MOCK_USDC_ADDRESS ?? "0x7A13F0709937a85037028DBff016Fd2A73122F70") as `0x${string}`,
  clobEngine: (process.env.NEXT_PUBLIC_CLOB_ENGINE_ADDRESS ?? "0x9Ef5459216E8Bf1f12618cb3FA795C71a4cC6BCE") as `0x${string}`,
  ammFallback: (process.env.NEXT_PUBLIC_AMM_FALLBACK_ADDRESS ?? "0xE1D063B8Ef992dB7CDDEb77E9a6592844E75aBc3") as `0x${string}`,
  feeRewardController: (process.env.NEXT_PUBLIC_FEE_REWARD_CONTROLLER_ADDRESS ?? "0xAE5CD607f92bED8482422c10B7e85245eFc7f79E") as `0x${string}`,
  miningReward: (process.env.NEXT_PUBLIC_MINING_REWARD_ADDRESS ?? "0x131692bF40Fb489494A9b3D5982816DD5C67B589") as `0x${string}`,
} as const;

export const ERC20_ABI = [
  {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "allowance",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "mint",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [],
  },
] as const;

export const TENOR_BUCKETS = [
  { id: 0, name: "1 Minggu", durationDays: 7, label: "Short" },
  { id: 1, name: "1 Bulan", durationDays: 30, label: "Medium" },
  { id: 2, name: "3 Bulan", durationDays: 90, label: "Long" },
  { id: 3, name: "1 Tahun", durationDays: 365, label: "Extended" },
] as const;

export const CLOB_ENGINE_ABI = [
  {
    type: "function",
    name: "placeOrder",
    stateMutability: "nonpayable",
    inputs: [
      { name: "side", type: "uint8" },
      { name: "tenor", type: "uint8" },
      { name: "rate", type: "uint256" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "orderId", type: "uint256" }],
  },
  {
    type: "function",
    name: "executeMarketOrder",
    stateMutability: "nonpayable",
    inputs: [
      { name: "side", type: "uint8" },
      { name: "tenor", type: "uint8" },
      { name: "amount", type: "uint256" },
      { name: "maxSlippageRate", type: "uint256" },
    ],
    outputs: [{ name: "positionId", type: "uint256" }],
  },
  {
    type: "function",
    name: "getOrderCount",
    stateMutability: "view",
    inputs: [
      { name: "tenor", type: "uint8" },
      { name: "side", type: "uint8" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "getTotalOrderCount",
    stateMutability: "view",
    inputs: [
      { name: "tenor", type: "uint8" },
      { name: "side", type: "uint8" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "settlePosition",
    stateMutability: "nonpayable",
    inputs: [{ name: "positionId", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "getPosition",
    stateMutability: "view",
    inputs: [{ name: "positionId", type: "uint256" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "id", type: "uint256" },
          { name: "lendOrderId", type: "uint256" },
          { name: "borrowOrderId", type: "uint256" },
          { name: "lender", type: "address" },
          { name: "borrower", type: "address" },
          { name: "tenor", type: "uint8" },
          { name: "rate", type: "uint256" },
          { name: "amount", type: "uint256" },
          { name: "startTime", type: "uint256" },
          { name: "maturityTime", type: "uint256" },
          { name: "settled", type: "bool" },
        ],
      },
    ],
  },
  {
    type: "function",
    name: "getOrder",
    stateMutability: "view",
    inputs: [{ name: "orderId", type: "uint256" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "id", type: "uint256" },
          { name: "maker", type: "address" },
          { name: "side", type: "uint8" },
          { name: "tenor", type: "uint8" },
          { name: "rate", type: "uint256" },
          { name: "amount", type: "uint256" },
          { name: "filledAmount", type: "uint256" },
          { name: "createdAt", type: "uint256" },
          { name: "status", type: "uint8" },
        ],
      },
    ],
  },
] as const;

export const MINING_REWARD_ABI = [
  {
    type: "function",
    name: "totalWeightedVolume",
    stateMutability: "view",
    inputs: [{ name: "participant", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "previewWeightedVolume",
    stateMutability: "view",
    inputs: [{ name: "positionId", type: "uint256" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "claimWeightedVolume",
    stateMutability: "nonpayable",
    inputs: [
      { name: "positionId", type: "uint256" },
      { name: "asLender", type: "bool" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "getMatchRecord",
    stateMutability: "view",
    inputs: [{ name: "positionId", type: "uint256" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "positionId", type: "uint256" },
          { name: "lender", type: "address" },
          { name: "borrower", type: "address" },
          { name: "tenor", type: "uint8" },
          { name: "matchedAmount", type: "uint256" },
          { name: "executionRate", type: "uint256" },
          { name: "twapRateAtMatch", type: "uint256" },
          { name: "startTime", type: "uint256" },
          { name: "claimedLender", type: "bool" },
          { name: "claimedBorrower", type: "bool" },
        ],
      },
    ],
  },
] as const;

export const AMM_FALLBACK_ABI = [
  {
    type: "function",
    name: "getQuoteRate",
    stateMutability: "view",
    inputs: [
      { name: "tenor", type: "uint8" },
      { name: "side", type: "uint8" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "getPoolInfo",
    stateMutability: "view",
    inputs: [{ name: "tenor", type: "uint8" }],
    outputs: [
      { name: "totalLiquidity", type: "uint256" },
      { name: "borrowedLiquidity", type: "uint256" },
      { name: "totalShares", type: "uint256" },
      { name: "utilizationBps", type: "uint256" },
      { name: "currentRateBps", type: "uint256" },
    ],
  },
  {
    type: "function",
    name: "getTWAP",
    stateMutability: "view",
    inputs: [{ name: "tenor", type: "uint8" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

export const FEE_REWARD_CONTROLLER_ABI = [
  {
    type: "function",
    name: "getProtocolFeeBps",
    stateMutability: "view",
    inputs: [{ name: "tenor", type: "uint8" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "getControllerStatus",
    stateMutability: "view",
    inputs: [],
    outputs: [
      { name: "currentFeeBps", type: "uint256" },
      { name: "lastUpkeepTime", type: "uint256" },
      { name: "lastRecordedPrice", type: "uint256" },
      { name: "emergencyActive", type: "bool" },
    ],
  },
] as const;

// ============================================================
//                  CONVERSION UTILITIES
// ============================================================

/// Konversi nominal USDC manusia ke unit onchain (6 desimal)
export function parseUSDC(amount: string | number): bigint {
  const val = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(val) || val <= 0) return BigInt(0);
  return BigInt(Math.round(val * 1e6));
}

/// Format unit onchain 6 desimal ke teks nominal USDC
export function formatUSDC(raw: bigint | number): string {
  const val = typeof raw === "bigint" ? Number(raw) / 1e6 : raw / 1e6;
  return val.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/// Konversi persen suku bunga manusia (contoh: 6.50%) ke basis points (650)
export function rateToBps(ratePercent: string | number): bigint {
  const val = typeof ratePercent === "string" ? parseFloat(ratePercent) : ratePercent;
  if (isNaN(val) || val <= 0) return BigInt(0);
  return BigInt(Math.round(val * 100));
}

/// Konversi basis points (contoh: 650) ke persen teks (6.50%)
export function bpsToRate(bps: bigint | number): string {
  const val = typeof bps === "bigint" ? Number(bps) / 100 : bps / 100;
  return val.toFixed(2);
}

/// Menghitung durasi tenor dalam detik
export function tenorToDurationSeconds(tenor: number): bigint {
  switch (tenor) {
    case 0:
      return BigInt(7 * 86400); // 1 Minggu
    case 1:
      return BigInt(30 * 86400); // 1 Bulan
    case 2:
      return BigInt(90 * 86400); // 3 Bulan
    case 3:
      return BigInt(365 * 86400); // 1 Tahun
    default:
      return BigInt(7 * 86400);
  }
}
