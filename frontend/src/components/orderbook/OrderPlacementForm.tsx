"use client";

import { useState } from "react";
import { useAccount, useConfig, useWriteContract } from "wagmi";
import { waitForTransactionReceipt } from "wagmi/actions";
import {
  TENOR_BUCKETS,
  parseUSDC,
  rateToBps,
  CONTRACT_ADDRESSES,
  CLOB_ENGINE_ABI,
  ERC20_ABI,
} from "@/lib/contracts";
import { useProtocolFee } from "@/hooks/useProtocolFee";
import { FallbackBadge } from "./FallbackBadge";

interface OrderPlacementFormProps {
  tenorId: number;
}

type OrderSideType = "lend" | "borrow";
type OrderKind = "limit" | "market";
type TxPhase =
  | "idle"
  | "approving"
  | "confirming_approval"
  | "placing"
  | "confirming_place"
  | "success"
  | "error";

const ORDER_SIDE_INDEX: Record<OrderSideType, 0 | 1> = {
  lend: 0,
  borrow: 1,
};

export function OrderPlacementForm({ tenorId }: OrderPlacementFormProps) {
  const config = useConfig();
  const { address, isConnected } = useAccount();

  const [side, setSide] = useState<OrderSideType>("lend");
  const [orderType, setOrderType] = useState<OrderKind>("limit");
  const [rate, setRate] = useState<string>("6.50");
  const [amount, setAmount] = useState<string>("1000");

  const [txPhase, setTxPhase] = useState<TxPhase>("idle");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [successTxHash, setSuccessTxHash] = useState<string | null>(null);

  const isLend = side === "lend";
  const isMarket = orderType === "market";
  const selectedBucket = TENOR_BUCKETS.find((b) => b.id === tenorId) ?? TENOR_BUCKETS[0];
  const selectedTenor = tenorId;

  // --- Read protocol fee dinamis onchain via useProtocolFee hook ---
  const { feeBps, feePercent } = useProtocolFee(selectedTenor);
  const feeDecimal = feePercent / 100;

  // Hooks write contract wagmi
  const { writeContractAsync: writeApproveAsync } = useWriteContract();
  const { writeContractAsync: writePlaceOrderAsync } = useWriteContract();

  const resetFormState = () => {
    setTxPhase("idle");
    setStatusMessage(null);
    setSuccessTxHash(null);
  };

  const handleSubmit = async () => {
    resetFormState();

    if (!isConnected || !address) {
      setTxPhase("error");
      setStatusMessage("Hubungkan wallet Web3 terlebih dahulu.");
      return;
    }

    if (CONTRACT_ADDRESSES.clobEngine === "0x0000000000000000000000000000000000000000") {
      setTxPhase("error");
      setStatusMessage("Alamat kontrak CLOBEngine belum dikonfigurasi.");
      return;
    }

    const rawAmount = parseUSDC(amount);
    const rawRateBps = isMarket ? BigInt(0) : rateToBps(rate);

    if (rawAmount === BigInt(0)) {
      setTxPhase("error");
      setStatusMessage("Masukkan nominal principal yang valid (min. 10 mUSDC).");
      return;
    }

    if (!isMarket && rawRateBps === BigInt(0)) {
      setTxPhase("error");
      setStatusMessage("Masukkan suku bunga target APY yang valid (> 0%).");
      return;
    }

    try {
      // Sisi Lend: Lender menyetor principal, wajib approve CLOBEngine terlebih dahulu
      if (isLend) {
        setTxPhase("approving");
        setStatusMessage("Menunggu persetujuan token di wallet (Approve ERC20)...");

        const approveHash = await writeApproveAsync({
          address: CONTRACT_ADDRESSES.mockUSDC,
          abi: ERC20_ABI,
          functionName: "approve",
          args: [CONTRACT_ADDRESSES.clobEngine, rawAmount],
        });

        setTxPhase("confirming_approval");
        setStatusMessage("Menunggu konfirmasi transaksi approval di Monad testnet...");

        await waitForTransactionReceipt(config, { hash: approveHash });
      }

      // Pasang order ke CLOBEngine
      setTxPhase("placing");
      setStatusMessage("Menandatangani transaksi order di wallet...");

      const sideIdx = ORDER_SIDE_INDEX[side];
      const orderHash = isMarket
        ? await writePlaceOrderAsync({
            address: CONTRACT_ADDRESSES.clobEngine,
            abi: CLOB_ENGINE_ABI,
            functionName: "executeMarketOrder",
            args: [sideIdx, selectedTenor, rawAmount, BigInt(0)],
          })
        : await writePlaceOrderAsync({
            address: CONTRACT_ADDRESSES.clobEngine,
            abi: CLOB_ENGINE_ABI,
            functionName: "placeOrder",
            args: [sideIdx, selectedTenor, rawRateBps, rawAmount],
          });

      setTxPhase("confirming_place");
      setStatusMessage("Memproses pencatatan order onchain di Monad testnet...");

      await waitForTransactionReceipt(config, { hash: orderHash });

      setTxPhase("success");
      setSuccessTxHash(orderHash);
      setStatusMessage(
        `Order berhasil terpasang onchain! Tx: ${orderHash.slice(0, 10)}...${orderHash.slice(-8)}`
      );
    } catch (err: unknown) {
      setTxPhase("error");
      const message = err instanceof Error ? err.message : "Transaksi gagal dieksekusi.";
      setStatusMessage(message.slice(0, 180));
    }
  };

  const isBusy =
    txPhase === "approving" ||
    txPhase === "confirming_approval" ||
    txPhase === "placing" ||
    txPhase === "confirming_place";

  const getButtonText = (): string => {
    switch (txPhase) {
      case "approving":
        return "1/2: Menyetujui Token di Wallet...";
      case "confirming_approval":
        return "1/2: Mengonfirmasi Approval Onchain...";
      case "placing":
        return "2/2: Menandatangani Order di Wallet...";
      case "confirming_place":
        return "2/2: Memproses Order di Testnet...";
      case "success":
        return "Order Terpasang (Pasang Order Baru)";
      default:
        return isMarket
          ? `Eksekusi Instan via AMM (${isLend ? "Lend" : "Borrow"})`
          : `Pasang Limit Order (${isLend ? "Supply" : "Borrow"})`;
    }
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
          disabled={isBusy}
          onClick={() => {
            setSide("lend");
            resetFormState();
          }}
          className={`flex-1 py-2 rounded-lg font-semibold text-sm transition-all cursor-pointer ${
            isLend
              ? "bg-[#22C55E] text-slate-950 shadow-md shadow-emerald-500/20"
              : "text-slate-400 hover:text-white"
          } ${isBusy ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          Lend (Supply)
        </button>
        <button
          type="button"
          disabled={isBusy}
          onClick={() => {
            setSide("borrow");
            resetFormState();
          }}
          className={`flex-1 py-2 rounded-lg font-semibold text-sm transition-all cursor-pointer ${
            !isLend
              ? "bg-[#3B82F6] text-white shadow-md shadow-blue-500/20"
              : "text-slate-400 hover:text-white"
          } ${isBusy ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          Borrow (Demand)
        </button>
      </div>

      {/* Order Type Toggle */}
      <div className="flex gap-2 border-b border-slate-800 pb-3 text-xs font-semibold">
        <button
          type="button"
          disabled={isBusy}
          onClick={() => {
            setOrderType("limit");
            resetFormState();
          }}
          className={`pb-1 border-b-2 transition-all cursor-pointer ${
            !isMarket
              ? "border-blue-500 text-white"
              : "border-transparent text-slate-400 hover:text-slate-200"
          } ${isBusy ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          Limit Order (CLOB)
        </button>
        <button
          type="button"
          disabled={isBusy}
          onClick={() => {
            setOrderType("market");
            resetFormState();
          }}
          className={`pb-1 border-b-2 transition-all cursor-pointer ${
            isMarket
              ? "border-amber-400 text-amber-400"
              : "border-transparent text-slate-400 hover:text-slate-200"
          } ${isBusy ? "opacity-50 cursor-not-allowed" : ""}`}
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
              disabled={isBusy}
              value={rate}
              onChange={(e) => {
                setRate(e.target.value);
                setStatusMessage(null);
              }}
              className="bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white font-mono focus:outline-none focus:border-blue-500 disabled:opacity-50"
              placeholder="Contoh: 5.50"
            />
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-slate-400">Nominal Principal (mUSDC)</label>
          <input
            type="number"
            step="10"
            disabled={isBusy}
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value);
              setStatusMessage(null);
            }}
            className="bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white font-mono focus:outline-none focus:border-blue-500 disabled:opacity-50"
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
        <div
          className={`p-3 rounded-xl text-xs border transition-all ${
            txPhase === "error"
              ? "bg-red-500/10 border-red-500/30 text-red-300"
              : txPhase === "success"
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                : "bg-blue-500/10 border-blue-500/30 text-blue-200"
          }`}
        >
          {statusMessage}
          {successTxHash && (
            <div className="mt-1 font-mono text-[10px] text-emerald-400 truncate">
              Tx: {successTxHash}
            </div>
          )}
        </div>
      )}

      {/* Action Button */}
      <button
        type="button"
        disabled={isBusy}
        onClick={handleSubmit}
        className={`w-full py-3.5 rounded-xl font-bold text-sm tracking-wide transition-all mt-2 cursor-pointer ${
          isLend
            ? "bg-[#22C55E] text-slate-950 hover:bg-emerald-400 disabled:bg-emerald-800 disabled:text-slate-400"
            : "bg-[#2563EB] text-white hover:bg-blue-600 disabled:bg-blue-900 disabled:text-slate-400"
        } ${isBusy ? "cursor-wait opacity-80" : ""}`}
      >
        {getButtonText()}
      </button>
    </div>
  );
}
