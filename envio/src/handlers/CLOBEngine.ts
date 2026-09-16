import { indexer, type Order, type Position, type FeeCharge } from "envio";

const TENOR_DURATIONS: Record<number, bigint> = {
  0: 7n * 86400n, // 1 Week
  1: 30n * 86400n, // 1 Month
  2: 90n * 86400n, // 3 Months
  3: 365n * 86400n, // 1 Year
};

indexer.onEvent(
  { contract: "CLOBEngine", event: "OrderPlaced" },
  async ({ event, context }) => {
    const orderObject: Order = {
      id: event.params.orderId.toString(),
      orderId: event.params.orderId,
      maker: event.params.maker,
      side: Number(event.params.side),
      tenor: Number(event.params.tenor),
      rate: event.params.rate,
      amount: event.params.amount,
      filledAmount: 0n,
      timestamp: BigInt(event.block.timestamp),
      status: "Open",
    };

    context.Order.set(orderObject);
  }
);

indexer.onEvent(
  { contract: "CLOBEngine", event: "OrderCancelled" },
  async ({ event, context }) => {
    const existingOrder = await context.Order.get(event.params.orderId.toString());
    if (existingOrder) {
      context.Order.set({
        ...existingOrder,
        status: "Cancelled",
      });
    }
  }
);

indexer.onEvent(
  { contract: "CLOBEngine", event: "OrderMatched" },
  async ({ event, context }) => {
    const tenorNum = Number(event.params.tenor);
    const duration = TENOR_DURATIONS[tenorNum] ?? 7n * 86400n;
    const startTime = BigInt(event.block.timestamp);
    const maturityTime = startTime + duration;

    const [lendOrder, borrowOrder] = await Promise.all([
      context.Order.get(event.params.lendOrderId.toString()),
      context.Order.get(event.params.borrowOrderId.toString()),
    ]);

    const lender = lendOrder ? lendOrder.maker : "0x0000000000000000000000000000000000000000";
    const borrower = borrowOrder ? borrowOrder.maker : "0x0000000000000000000000000000000000000000";

    const positionObject: Position = {
      id: event.params.positionId.toString(),
      positionId: event.params.positionId,
      lendOrderId: event.params.lendOrderId,
      borrowOrderId: event.params.borrowOrderId,
      lender,
      borrower,
      tenor: tenorNum,
      rate: event.params.rate,
      amount: event.params.matchedAmount,
      startTime,
      maturityTime,
      settled: false,
    };

    context.Position.set(positionObject);

    if (lendOrder) {
      const newFilled = lendOrder.filledAmount + event.params.matchedAmount;
      context.Order.set({
        ...lendOrder,
        filledAmount: newFilled,
        status: newFilled >= lendOrder.amount ? "Filled" : "PartiallyFilled",
      });
    }

    if (borrowOrder) {
      const newFilled = borrowOrder.filledAmount + event.params.matchedAmount;
      context.Order.set({
        ...borrowOrder,
        filledAmount: newFilled,
        status: newFilled >= borrowOrder.amount ? "Filled" : "PartiallyFilled",
      });
    }
  }
);

indexer.onEvent(
  { contract: "CLOBEngine", event: "PositionSettled" },
  async ({ event, context }) => {
    const existingPosition = await context.Position.get(event.params.positionId.toString());
    if (existingPosition) {
      context.Position.set({
        ...existingPosition,
        settled: true,
      });
    }
  }
);

indexer.onEvent(
  { contract: "CLOBEngine", event: "ProtocolFeeCharged" },
  async ({ event, context }) => {
    const feeId = `${event.transaction.hash}-${event.logIndex}`;
    const feeChargeObject: FeeCharge = {
      id: feeId,
      positionId: event.params.positionId,
      payer: event.params.payer,
      feeAmount: event.params.feeAmount,
      timestamp: BigInt(event.block.timestamp),
    };

    context.FeeCharge.set(feeChargeObject);
  }
);
