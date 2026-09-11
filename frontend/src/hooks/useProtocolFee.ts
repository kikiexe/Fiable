"use client";

import { useReadContract } from "wagmi";
import { CONTRACT_ADDRESSES, FEE_REWARD_CONTROLLER_ABI } from "@/lib/contracts";

export function useProtocolFee(tenorId: number) {
  const { data: feeBps, isLoading, error, refetch } = useReadContract({
    address: CONTRACT_ADDRESSES.feeRewardController,
    abi: FEE_REWARD_CONTROLLER_ABI,
    functionName: "getProtocolFeeBps",
    args: [tenorId],
  });

  const feePercent = feeBps !== undefined ? Number(feeBps) / 100 : 0.15;
  return {
    feeBps: feeBps !== undefined ? BigInt(feeBps) : undefined,
    feePercent,
    isLoading,
    error,
    refetch,
  };
}
