// Contract addresses and ABIs for Fieble Protocol

export const CONTRACT_ADDRESSES = {
  mockUSDC: "0x0000000000000000000000000000000000000000",
  clobEngine: "0x0000000000000000000000000000000000000000",
  ammFallback: "0x0000000000000000000000000000000000000000",
} as const;

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
