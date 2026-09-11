"use client";

import { useQuery } from "@tanstack/react-query";

export interface IndexedPosition {
  id: string;
  positionId: string;
  lendOrderId?: string;
  borrowOrderId?: string;
  lender: string;
  borrower: string;
  tenor: number;
  rate: string;
  amount: string;
  startTime: string;
  maturityTime: string;
  settled: boolean;
}

export interface PositionsResult {
  asLender: IndexedPosition[];
  asBorrower: IndexedPosition[];
}

const ENVIO_ENDPOINT =
  process.env.NEXT_PUBLIC_ENVIO_ENDPOINT ?? "http://localhost:8080/v1/graphql";

const POSITIONS_QUERY = `
  query PositionsByAddress($address: String!, $addressLower: String!) {
    asLender: Position(
      where: { _or: [{ lender: { _eq: $address } }, { lender: { _eq: $addressLower } }] }
    ) {
      id
      positionId
      lendOrderId
      borrowOrderId
      lender
      borrower
      tenor
      rate
      amount
      startTime
      maturityTime
      settled
    }
    asBorrower: Position(
      where: { _or: [{ borrower: { _eq: $address } }, { borrower: { _eq: $addressLower } }] }
    ) {
      id
      positionId
      lendOrderId
      borrowOrderId
      lender
      borrower
      tenor
      rate
      amount
      startTime
      maturityTime
      settled
    }
  }
`;

export function usePositions(address?: string) {
  return useQuery<PositionsResult>({
    queryKey: ["positions", address],
    queryFn: async () => {
      if (!address) {
        return { asLender: [], asBorrower: [] };
      }

      try {
        const res = await fetch(ENVIO_ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: POSITIONS_QUERY,
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
        if (json.errors) {
          console.warn("Envio GraphQL query returned errors:", json.errors);
        }

        const data = json.data as {
          asLender?: IndexedPosition[];
          asBorrower?: IndexedPosition[];
        } | undefined;

        const asLender = (data?.asLender ?? []).slice().sort(
          (a, b) => Number(b.startTime) - Number(a.startTime)
        );
        const asBorrower = (data?.asBorrower ?? []).slice().sort(
          (a, b) => Number(b.startTime) - Number(a.startTime)
        );

        return { asLender, asBorrower };
      } catch (err) {
        console.warn("Could not fetch positions from Envio GraphQL endpoint:", err);
        return { asLender: [], asBorrower: [] };
      }
    },
    enabled: Boolean(address),
    refetchInterval: 5000,
  });
}
