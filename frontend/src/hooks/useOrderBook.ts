"use client";

import { useQuery } from "@tanstack/react-query";

export interface OrderBookRow {
  id: string;
  rateBps: number;
  amount: number;
  total: number;
}

export interface UseOrderBookResult {
  bids: OrderBookRow[];
  asks: OrderBookRow[];
  isLoading: boolean;
  refetch: () => void;
}

interface EnvioOrder {
  id: string;
  orderId: string;
  maker: string;
  side: number;
  tenor: number;
  rate: string;
  amount: string;
  filledAmount: string;
  timestamp: string;
  status: string;
}

const ENVIO_ENDPOINT =
  process.env.NEXT_PUBLIC_ENVIO_ENDPOINT ?? "http://localhost:8080/v1/graphql";

const OPEN_ORDERS_QUERY = `
  query OpenOrdersByTenor($tenor: Int!) {
    Order(
      where: {
        tenor: { _eq: $tenor },
        status: { _in: ["Open", "PartiallyFilled"] }
      },
      order_by: { timestamp: asc }
    ) {
      id
      orderId
      maker
      side
      tenor
      rate
      amount
      filledAmount
      timestamp
      status
    }
  }
`;

export function useOrderBook(tenorId: number): UseOrderBookResult {
  const queryResult = useQuery<{ bids: OrderBookRow[]; asks: OrderBookRow[] }>({
    queryKey: ["orderBook", tenorId],
    queryFn: async () => {
      try {
        const res = await fetch(ENVIO_ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: OPEN_ORDERS_QUERY,
            variables: { tenor: tenorId },
          }),
        });

        if (!res.ok) {
          throw new Error(`GraphQL query failed: ${res.status}`);
        }

        const json = await res.json();
        const rawOrders = (json.data?.Order ?? []) as EnvioOrder[];

        const rawBids = rawOrders.filter((o) => o.side === 0);
        const rawAsks = rawOrders.filter((o) => o.side === 1);

        rawBids.sort((a, b) => Number(a.rate) - Number(b.rate));
        rawAsks.sort((a, b) => Number(b.rate) - Number(a.rate));

        let runningBidTotal = 0;
        const bids: OrderBookRow[] = rawBids
          .map((o) => {
            const rawRemaining = BigInt(o.amount) - BigInt(o.filledAmount);
            const remainingUsdc = Math.max(0, Number(rawRemaining) / 1e6);
            runningBidTotal += remainingUsdc;
            return {
              id: `bid-${o.id}`,
              rateBps: Number(o.rate),
              amount: remainingUsdc,
              total: runningBidTotal,
            };
          })
          .filter((row) => row.amount > 0);

        let runningAskTotal = 0;
        const asks: OrderBookRow[] = rawAsks
          .map((o) => {
            const rawRemaining = BigInt(o.amount) - BigInt(o.filledAmount);
            const remainingUsdc = Math.max(0, Number(rawRemaining) / 1e6);
            runningAskTotal += remainingUsdc;
            return {
              id: `ask-${o.id}`,
              rateBps: Number(o.rate),
              amount: remainingUsdc,
              total: runningAskTotal,
            };
          })
          .filter((row) => row.amount > 0);

        return { bids, asks };
      } catch (err) {
        console.warn("Could not fetch order book from Envio GraphQL:", err);
        return { bids: [], asks: [] };
      }
    },
    refetchInterval: 3000,
  });

  return {
    bids: queryResult.data?.bids ?? [],
    asks: queryResult.data?.asks ?? [],
    isLoading: queryResult.isLoading,
    refetch: queryResult.refetch,
  };
}
