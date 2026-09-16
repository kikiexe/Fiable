import { describe, it, expect } from "vitest";
import { createTestIndexer } from "envio";

describe("Fieble Envio Handlers Test Suite", () => {
  const lender = "0x1111111111111111111111111111111111111111";
  const borrower = "0x2222222222222222222222222222222222222222";

  it("should index OrderPlaced, OrderMatched, FeeCharge, and PositionSettled lifecycle", async () => {
    const indexer = createTestIndexer();

    // 1. Simulate OrderPlaced for Lend
    await indexer.process({
      chains: {
        10143: {
          simulate: [
            {
              contract: "CLOBEngine",
              event: "OrderPlaced",
              params: {
                orderId: 1n,
                maker: lender,
                side: 0n, // Lend
                tenor: 0n, // 1 Week
                rate: 650n,
                amount: 1000_000_000n,
              },
            },
            {
              contract: "CLOBEngine",
              event: "OrderPlaced",
              params: {
                orderId: 2n,
                maker: borrower,
                side: 1n, // Borrow
                tenor: 0n,
                rate: 650n,
                amount: 1000_000_000n,
              },
            },
          ],
        },
      },
    });

    const order1 = await indexer.Order.getOrThrow("1");
    expect(order1.maker).toBe(lender);
    expect(order1.side).toBe(0);
    expect(order1.tenor).toBe(0);
    expect(order1.rate).toBe(650n);
    expect(order1.amount).toBe(1000_000_000n);
    expect(order1.filledAmount).toBe(0n);
    expect(order1.status).toBe("Open");

    const order2 = await indexer.Order.getOrThrow("2");
    expect(order2.maker).toBe(borrower);
    expect(order2.status).toBe("Open");

    // 2. Simulate OrderMatched
    await indexer.process({
      chains: {
        10143: {
          simulate: [
            {
              contract: "CLOBEngine",
              event: "OrderMatched",
              params: {
                positionId: 100n,
                lendOrderId: 1n,
                borrowOrderId: 2n,
                matchedAmount: 1000_000_000n,
                rate: 650n,
                tenor: 0n,
              },
            },
            {
              contract: "CLOBEngine",
              event: "ProtocolFeeCharged",
              params: {
                positionId: 100n,
                payer: borrower,
                feeAmount: 15_000n,
              },
            },
          ],
        },
      },
    });

    const position = await indexer.Position.getOrThrow("100");
    expect(position.positionId).toBe(100n);
    expect(position.lender).toBe(lender);
    expect(position.borrower).toBe(borrower);
    expect(position.rate).toBe(650n);
    expect(position.amount).toBe(1000_000_000n);
    expect(position.settled).toBe(false);

    // Verify orders updated to Filled
    const updatedOrder1 = await indexer.Order.getOrThrow("1");
    expect(updatedOrder1.filledAmount).toBe(1000_000_000n);
    expect(updatedOrder1.status).toBe("Filled");

    // Verify FeeCharge
    const feeCharges = await indexer.FeeCharge.getAll();
    expect(feeCharges.length).toBe(1);
    expect(feeCharges[0].positionId).toBe(100n);
    expect(feeCharges[0].payer).toBe(borrower);
    expect(feeCharges[0].feeAmount).toBe(15_000n);

    // 3. Simulate PositionSettled
    await indexer.process({
      chains: {
        10143: {
          simulate: [
            {
              contract: "CLOBEngine",
              event: "PositionSettled",
              params: {
                positionId: 100n,
                totalRepayment: 1001_246_575n,
              },
            },
          ],
        },
      },
    });

    const settledPosition = await indexer.Position.getOrThrow("100");
    expect(settledPosition.settled).toBe(true);
  });

  it("should index MiningReward events (MatchRecorded and RewardAccrued)", async () => {
    const indexer = createTestIndexer();

    await indexer.process({
      chains: {
        10143: {
          simulate: [
            {
              contract: "MiningReward",
              event: "MatchRecorded",
              params: {
                positionId: 200n,
                lender: lender,
                borrower: borrower,
                matchedAmount: 5000_000_000n,
                executionRate: 600n,
                twapRateAtMatch: 600n,
              },
            },
            {
              contract: "MiningReward",
              event: "RewardAccrued",
              params: {
                positionId: 200n,
                participant: lender,
                weightedVolume: 5000_000_000n,
              },
            },
          ],
        },
      },
    });

    const matchRecord = await indexer.MatchRecord.getOrThrow("200");
    expect(matchRecord.lender).toBe(lender);
    expect(matchRecord.borrower).toBe(borrower);
    expect(matchRecord.matchedAmount).toBe(5000_000_000n);
    expect(matchRecord.executionRate).toBe(600n);
    expect(matchRecord.twapRateAtMatch).toBe(600n);

    const miningReward = await indexer.MiningReward.getOrThrow("200-" + lender);
    expect(miningReward.positionId).toBe(200n);
    expect(miningReward.participant).toBe(lender);
    expect(miningReward.weightedVolume).toBe(5000_000_000n);
  });
});
