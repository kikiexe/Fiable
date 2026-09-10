"use client";

import { useState } from "react";
import {
  TENOR_BUCKETS,
  parseUSDC,
  rateToBps,
  formatUSDC,
  CONTRACT_ADDRESSES,
  FEE_REWARD_CONTROLLER_ABI,
  useReadContract,
} from "@/lib/contracts";
import { FallbackBadge } from "./FallbackBadge";

interface OrderPlacementFormProps {
  tenorId: number;
}

export function OrderPlacementForm({ tenorId }: OrderPlacementFormProps) {
  const [side, setSide] = useState<"lend" | "borrow">("lend");
  const [orderType, setOrderType] = useState<"limit" | "market">("limit");
  const [rate, setRate] = useState<string>("6.50");
  const [amount, setAmount] = useState<string>("1000");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const isLend = side === "lend";
  const isMarket = orderType === "market";
  const selectedBucket = TENOR_BUCKETS.find((b) => b.id === tenorId) ?? TENOR_BUCKETS[0];
  const selectedTenor = tenorId;

  // Hook: baca fee dinamis dari FeeRewardController onchain
  const { data: feeBps } = useReadContract({
    address: CONTRACT_ADDRESSES.feeRewardController,
    abi: FEE_REWARD_CONTROLLER_ABI,
    functionName: "getProtocolFeeBps",
    args: [selectedTenor],
  });
  const feePercent = feeBps ? Number(feeBps) / 100 : 0.15;
  const feeDecimal = feePercent / 100;

  const handleSubmit = () => {
    const rawAmount = parseUSDC(amount);
    const rawRateBps = isMarket ? BigInt(0) : rateToBps(rate);

    if (rawAmount === BigInt(0)) {
      setStatusMessage("Masukkan jumlah nominal principal yang valid (min. 10 mUSDC).");
      return;
    }

    if (!isMarket && rawRateBps === BigInt(0)) {
      setStatusMessage("Masukkan suku bunga target APY yang valid.");
      return;
    }

    const actionText = isMarket ? "Order Market (Instant Swap)" : "Limit Order (CLOB)";
    const sideText = isLend ? "Lend (Supply)" : "Borrow (Demand)";

    setStatusMessage(
      `Payload siap di-broadcast: ${actionText} ${sideText} | Tenor: ${selectedBucket.name} | Pokok: ${formatUSDC(rawAmount)} mUSDC (${rawAmount.toString()} units) | APY: ${isMarket ? "Market Rate" : `${rate}% (${rawRateBps.toString()} bps)`}`
    );
  };

  return (
    <div className="flex flex-col gap-4 bg-[#1E293B] rounded-2xl border border-slate-800 p-5">
      {/* Tenor Indicator */}
      <div className="flex justify-between items-center pb-1 text-xs">
        <span className="text-slate-400 font-medium">Tenor Target:</span>
        <span className="font-semibold text-blue-400">
          {selectedBucket.name} ({selectedBucket.durationDays} hari)
        </span>
      </div>

      {/* Side Toggle */}
      <div className="flex p-1 bg-slate-900 rounded-xl">
        <button
          type="button"
          onClick={() => {
            setSide("lend");
            setStatusMessage(null);
          }}
          className={`flex-1 py-2 rounded-lg font-semibold text-sm transition-all ${
            isLend ? "bg-[#22C55E] text-slate-950 shadow-md shadow-emerald-500/20" : "text-slate-400 hover:text-white"
          }`}
        >
          Lend (Supply)
        </button>
        <button
          type="button"
          onClick={() => {
            setSide("borrow");
            setStatusMessage(null);
          }}
          className={`flex-1 py-2 rounded-lg font-semibold text-sm transition-all ${
            !isLend ? "bg-[#3B82F6] text-white shadow-md shadow-blue-500/20" : "text-slate-400 hover:text-white"
          }`}
        >
          Borrow (Demand)
        </button>
      </div>

      {/* Order Type Toggle */}
      <div className="flex gap-2 border-b border-slate-800 pb-3 text-xs font-semibold">
        <button
          type="button"
          onClick={() => {
            setOrderType("limit");
            setStatusMessage(null);
          }}
          className={`pb-1 border-b-2 transition-all ${
            !isMarket ? "border-blue-500 text-white" : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          Limit Order (CLOB)
        </button>
        <button
          type="button"
          onClick={() => {
            setOrderType("market");
            setStatusMessage(null);
          }}
          className={`pb-1 border-b-2 transition-all ${
            isMarket ? "border-amber-400 text-amber-400" : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          Instant Execution (AMM Fallback)
        </button>
      </div>

      {/* AMM Fallback Notice for Market Order */}
      {isMarket && (
        <FallbackBadge isFallbackActive={true} spreadBps={150} fallbackRate={720} />
      )}

      {/* Inputs */}
      <div className="flex flex-col gap-3">
        {!isMarket && (
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-slate-400">Target APY (%)</label>
            <input
              type="number"
              step="0.01"
              value={rate}
              onChange={(e) => {
                setRate(e.target.value);
                setStatusMessage(null);
              }}
              className="bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white font-mono focus:outline-none focus:border-blue-500"
              placeholder="Contoh: 5.50"
            />
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-slate-400">Nominal Principal (mUSDC)</label>
          <input
            type="number"
            step="10"
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value);
              setStatusMessage(null);
            }}
            className="bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white font-mono focus:outline-none focus:border-blue-500"
            placeholder="Min. 10"
          />
        </div>
      </div>

      {/* Fee Breakdown Disclosure */}
      <div className="flex flex-col gap-1 p-3 bg-slate-900/60 rounded-xl border border-slate-800 text-xs">
        <div className="flex justify-between text-slate-400">
          <span>Protocol Fee (Dinamis):</span>
          <span className="font-mono text-slate-200">
            {feePercent.toFixed(2)}% ({feeBps !== undefined ? feeBps.toString() : "..."} bps)
          </span>
        </div>
        <div className="flex justify-between text-slate-400">
          <span>Estimasi Potongan Fee:</span>
          <span className="font-mono text-amber-400">
            {amount ? (parseFloat(amount) * feeDecimal).toFixed(2) : "0.00"} mUSDC
          </span>
        </div>
      </div>

      {/* Submission Feedback */}
      {statusMessage && (
        <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-xl text-xs text-blue-200">
          {statusMessage}
        </div>
      )}

      {/* Action Button */}
      <button
        type="button"
        onClick={handleSubmit}
        className={`w-full py-3.5 rounded-xl font-bold text-sm tracking-wide transition-all mt-2 cursor-pointer ${
          isLend
            ? "bg-[#22C55E] text-slate-950 hover:bg-emerald-400"
            : "bg-[#2563EB] text-white hover:bg-blue-600"
        }`}
      >
        {isMarket
          ? `Eksekusi Instan via AMM (${isLend ? "Lend" : "Borrow"})`
          : `Pasang Limit Order (${isLend ? "Supply" : "Borrow"})`}
      </button>
    </div>
  );
}
