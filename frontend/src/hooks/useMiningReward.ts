"use client";

import { useQuery } from "@tanstack/react-query";
import { useReadContract } from "wagmi";
import { CONTRACT_ADDRESSES, MINING_REWARD_ABI } from "@/lib/contracts";

export interface IndexedMatchRecord {
  id: string;
  positionId: string;
  lender: string;
  borrower: string;
  matchedAmount: string;
  executionRate: string;
  twapRateAtMatch: string;
  timestamp: string;
}

export interface IndexedMiningReward {
  id: string;
  positionId: string;
  participant: string;
  weightedVolume: string;
  timestamp: string;
}

export interface MiningRewardData {
  onchainWeightedVolume: bigint;
  totalWeightedVolume: bigint;
  matchCount: number;
  matchRecords: IndexedMatchRecord[];
  rewardAccruals: IndexedMiningReward[];
}

const ENVIO_ENDPOINT =
  process.env.NEXT_PUBLIC_ENVIO_ENDPOINT ?? "http://localhost:8080/v1/graphql";

const MINING_REWARDS_QUERY = `
  query MiningRewardsByAddress($address: String!, $addressLower: String!) {
    MatchRecord(
      where: {
        _or: [
          { lender: { _eq: $address } },
          { lender: { _eq: $addressLower } },
          { borrower: { _eq: $address } },
          { borrower: { _eq: $addressLower } }
        ]
      }
    ) {
      id
      positionId
      lender
      borrower
      matchedAmount
      executionRate
      twapRateAtMatch
      timestamp
    }
    MiningReward(
      where: {
        _or: [
          { participant: { _eq: $address } },
          { participant: { _eq: $addressLower } }
        ]
      }
    ) {
      id
      positionId
      participant
      weightedVolume
      timestamp
    }
  }
`;

export function useMiningReward(address?: `0x${string}`) {
  // 1. Live onchain read for authoritative total weighted volume
  const {
    data: onchainVolume,
    isLoading: isOnchainLoading,
    refetch: refetchOnchain,
  } = useReadContract({
    address: CONTRACT_ADDRESSES.miningReward,
    abi: MINING_REWARD_ABI,
    functionName: "totalWeightedVolume",
    args: address ? [address] : undefined,
  });

  // 2. Envio indexed records query
  const queryResult = useQuery<{
    matchRecords: IndexedMatchRecord[];
    rewardAccruals: IndexedMiningReward[];
  }>({
    queryKey: ["miningRewardData", address],
    queryFn: async () => {
      if (!address) {
        return { matchRecords: [], rewardAccruals: [] };
      }

      try {
        const res = await fetch(ENVIO_ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: MINING_REWARDS_QUERY,
            variables: {
              address,
              addressLower: address.toLowerCase(),
            },
          }),
        });

        if (!res.ok) {
          throw new Error(`GraphQL query failed with status: ${res.status}`);
        }

        const json = await res.json();
        const data = json.data as {
          MatchRecord?: IndexedMatchRecord[];
          MiningReward?: IndexedMiningReward[];
        } | undefined;

        return {
          matchRecords: data?.MatchRecord ?? [],
          rewardAccruals: data?.MiningReward ?? [],
        };
      } catch (err) {
        console.warn("Could not fetch mining rewards from Envio GraphQL endpoint:", err);
        return { matchRecords: [], rewardAccruals: [] };
      }
    },
    enabled: Boolean(address),
    refetchInterval: 5000,
  });

  const onchainBigInt = onchainVolume !== undefined ? BigInt(onchainVolume) : BigInt(0);
  const matchRecords = queryResult.data?.matchRecords ?? [];
  const rewardAccruals = queryResult.data?.rewardAccruals ?? [];

  // Compute total volume from accruals if onchain not yet fetched
  const indexedSum = rewardAccruals.reduce(
    (acc, item) => acc + BigInt(item.weightedVolume || 0),
    BigInt(0)
  );

  const totalWeightedVolume = onchainBigInt > BigInt(0) ? onchainBigInt : indexedSum;

  return {
    data: {
      onchainWeightedVolume: onchainBigInt,
      totalWeightedVolume,
      matchCount: matchRecords.length,
      matchRecords,
      rewardAccruals,
    },
    isLoading: isOnchainLoading || queryResult.isLoading,
    refetch: () => {
      refetchOnchain();
      queryResult.refetch();
    },
  };
}
