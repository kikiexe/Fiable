import { indexer, type MatchRecord, type MiningReward } from "envio";

indexer.onEvent(
  { contract: "MiningReward", event: "MatchRecorded" },
  async ({ event, context }) => {
    const matchRecordObject: MatchRecord = {
      id: event.params.positionId.toString(),
      positionId: event.params.positionId,
      lender: event.params.lender,
      borrower: event.params.borrower,
      matchedAmount: event.params.matchedAmount,
      executionRate: event.params.executionRate,
      twapRateAtMatch: event.params.twapRateAtMatch,
      timestamp: BigInt(event.block.timestamp),
    };

    context.MatchRecord.set(matchRecordObject);

    // Synchronize lender and borrower on Position entity if already created
    const existingPosition = await context.Position.get(event.params.positionId.toString());
    if (existingPosition) {
      context.Position.set({
        ...existingPosition,
        lender: event.params.lender,
        borrower: event.params.borrower,
      });
    }
  }
);

indexer.onEvent(
  { contract: "MiningReward", event: "RewardAccrued" },
  async ({ event, context }) => {
    const rewardId = `${event.params.positionId.toString()}-${event.params.participant}`;
    const rewardObject: MiningReward = {
      id: rewardId,
      positionId: event.params.positionId,
      participant: event.params.participant,
      weightedVolume: event.params.weightedVolume,
      timestamp: BigInt(event.block.timestamp),
    };

    context.MiningReward.set(rewardObject);
  }
);
