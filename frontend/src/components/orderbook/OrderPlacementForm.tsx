"use client";

import { useState } from "react";
import { useAccount, useConfig, useWriteContract, useReadContract } from "wagmi";
import { waitForTransactionReceipt } from "wagmi/actions";
import {
  TENOR_BUCKETS,
  parseUSDC,
  rateToBps,
  CONTRACT_ADDRESSES,
  CLOB_ENGINE_ABI,
  AMM_FALLBACK_ABI,
  ERC20_ABI,
} from "@/lib/contracts";
import { useProtocolFee } from "@/hooks/useProtocolFee";
import { useCurrentTimestamp } from "@/hooks/useCurrentTimestamp";
import { FallbackBadge } from "./FallbackBadge";

interface OrderPlacementFormProps {
  tenorId: number;
  initialRate?: string;
  initialAmount?: string;
  initialSide?: OrderSideType;
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

export function OrderPlacementForm({ tenorId, initialRate, initialAmount, initialSide }: OrderPlacementFormProps) {
  const config = useConfig();
  const { address, isConnected } = useAccount();

  const [side, setSide] = useState<OrderSideType>(initialSide || "lend");
  const [orderType, setOrderType] = useState<OrderKind>("limit");
  const [rate, setRate] = useState<string>(initialRate ?? "");
  const [amount, setAmount] = useState<string>(initialAmount ?? "");

  const [txPhase, setTxPhase] = useState<TxPhase>("idle");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [successTxHash, setSuccessTxHash] = useState<string | null>(null);

  const isLend = side === "lend";
  const isMarket = orderType === "market";
  const selectedBucket = TENOR_BUCKETS.find((b) => b.id === tenorId) ?? TENOR_BUCKETS[0];
  const selectedTenor = tenorId;

  const { feeBps, feePercent } = useProtocolFee(selectedTenor);
  const feeDecimal = feePercent / 100;

  // Check existing token allowance to avoid redundant approve transactions
  const { data: allowanceData, refetch: refetchAllowance } = useReadContract({
    address: CONTRACT_ADDRESSES.mockUSDC,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: address ? [address, CONTRACT_ADDRESSES.clobEngine] : undefined,
  });

  const { writeContractAsync: writeApproveAsync } = useWriteContract();
  const { writeContractAsync: writePlaceOrderAsync } = useWriteContract();

  const resetFormState = () => {
    setTxPhase("idle");
    setStatusMessage(null);
    setSuccessTxHash(null);
  };

  // Query live pool info from AMMFallback contract to dynamically price market orders
  const { data: ammPoolData } = useReadContract({
    address: CONTRACT_ADDRESSES.ammFallback,
    abi: AMM_FALLBACK_ABI,
    functionName: "getPoolInfo",
    args: [selectedTenor],
  });

  const fallbackRateBps = ammPoolData && Array.isArray(ammPoolData) && ammPoolData[4] !== undefined
    ? Number(ammPoolData[4])
    : 600;
  const fallbackRatePercent = fallbackRateBps / 100;

  const numericAmount = Math.max(0, parseFloat(amount) || 0);
  const numericRate = isMarket ? fallbackRatePercent : Math.max(0, parseFloat(rate) || 0);
  const durationDays = selectedBucket.durationDays;
  const interestEstimate = (numericAmount * (numericRate / 100) * durationDays) / 365;
  const feeAmountEstimate = numericAmount * feeDecimal;
  const netSettlement = isLend
    ? numericAmount + interestEstimate - feeAmountEstimate
    : numericAmount + interestEstimate + feeAmountEstimate;

  const now = useCurrentTimestamp();
  const maturityDateEstimate = now > BigInt(0)
    ? new Date(Number(now + BigInt(durationDays * 86400)) * 1000).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : `${durationDays} hari mendatang`;

  const handleSubmit = async () => {
    resetFormState();

    if (!isConnected || !address) {
      setTxPhase("error");
      setStatusMessage("Hubungkan dompet terlebih dahulu.");
      return;
    }

    if (CONTRACT_ADDRESSES.clobEngine === "0x0000000000000000000000000000000000000000") {
      setTxPhase("error");
      setStatusMessage("Alamat pasar kredit belum dikonfigurasi.");
      return;
    }

    const rawAmount = parseUSDC(amount);
    const rawRateBps = isMarket ? BigInt(0) : rateToBps(rate);

    if (rawAmount === BigInt(0)) {
      setTxPhase("error");
      setStatusMessage("Masukkan nominal dana yang valid (minimal 10 mUSDC).");
      return;
    }

    if (!isMarket && rawRateBps === BigInt(0)) {
      setTxPhase("error");
      setStatusMessage("Masukkan target suku bunga yang valid (lebih dari 0%).");
      return;
    }

    try {
      if (isLend) {
        const currentAllowance = typeof allowanceData === "bigint" ? allowanceData : BigInt(0);
        if (currentAllowance < rawAmount) {
          setTxPhase("approving");
          setStatusMessage("Langkah 1/2: Menyetujui izin akses dana di dompet...");

          const approveHash = await writeApproveAsync({
            address: CONTRACT_ADDRESSES.mockUSDC,
            abi: ERC20_ABI,
            functionName: "approve",
            args: [CONTRACT_ADDRESSES.clobEngine, rawAmount],
          });

          setTxPhase("confirming_approval");
          setStatusMessage("Langkah 1/2: Menunggu izin transaksi dikonfirmasi...");

          await waitForTransactionReceipt(config, { hash: approveHash });
          await refetchAllowance();
        }
      }

      setTxPhase("placing");
      setStatusMessage("Langkah 2/2: Konfirmasi transaksi penawaran di dompet...");

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
      setStatusMessage("Langkah 2/2: Menyimpan transaksi penawaran ke pasar...");

      await waitForTransactionReceipt(config, { hash: orderHash });

      setTxPhase("success");
      setSuccessTxHash(orderHash);
      setStatusMessage(
        `Penawaran Anda berhasil terpasang di pasar!`
      );
    } catch (err: unknown) {
      setTxPhase("error");
      const message = err instanceof Error ? err.message : "Transaksi gagal diproses.";
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
        return "1/2: Setujui Izin Dana di Dompet...";
      case "confirming_approval":
        return "1/2: Menunggu Izin Disetujui...";
      case "placing":
        return "2/2: Konfirmasi Transaksi di Dompet...";
      case "confirming_place":
        return "2/2: Menyimpan Transaksi...";
      case "success":
        return "Berhasil (Pasang Penawaran Baru)";
      default:
        return isMarket
          ? `Eksekusi Sekarang (${isLend ? "Danai" : "Pinjam"})`
          : `Pasang Penawaran Bunga (${isLend ? "Danai" : "Pinjam"})`;
    }
  };

  return (
    <div className="flex flex-col gap-4 bg-white rounded-xs border border-stone-200 p-5 shadow-xs">
      {/* Header & Tenor Indicator */}
      <div className="flex justify-between items-center pb-2 border-b border-stone-100">
        <span className="text-xs font-black uppercase tracking-wider text-[#0e0f0c]">
          Formulir Transaksi
        </span>
        <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-xs bg-[#e8ebe6] text-[#163300]">
          {selectedBucket.name} ({selectedBucket.durationDays} hari)
        </span>
      </div>

      {/* Side Toggle */}
      <div className="flex p-1 bg-[#e8ebe6] rounded-xs gap-1">
        <button
          type="button"
          disabled={isBusy}
          onClick={() => {
            setSide("lend");
            resetFormState();
          }}
          className={`flex-1 py-2.5 rounded-xs font-black text-xs transition-all cursor-pointer ${
            isLend
              ? "bg-[#2ead4b] text-white shadow-xs"
              : "text-[#454745] hover:text-[#0e0f0c]"
          } ${isBusy ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          Danai (Beri Pinjaman)
        </button>
        <button
          type="button"
          disabled={isBusy}
          onClick={() => {
            setSide("borrow");
            resetFormState();
          }}
          className={`flex-1 py-2.5 rounded-xs font-black text-xs transition-all cursor-pointer ${
            !isLend
              ? "bg-[#0e0f0c] text-white shadow-xs"
              : "text-[#454745] hover:text-[#0e0f0c]"
          } ${isBusy ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          Pinjam (Ajukan Pinjaman)
        </button>
      </div>

      {/* Order Type Toggle */}
      <div className="flex gap-4 border-b border-stone-200 pb-2 text-xs font-bold">
        <button
          type="button"
          disabled={isBusy}
          onClick={() => {
            setOrderType("limit");
            resetFormState();
          }}
          className={`pb-1 border-b-2 transition-all cursor-pointer ${
            !isMarket
              ? "border-[#0e0f0c] text-[#0e0f0c]"
              : "border-transparent text-[#868685] hover:text-[#454745]"
          } ${isBusy ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          Tentukan Bunga Sendiri
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
              ? "border-[#0e0f0c] text-[#0e0f0c]"
              : "border-transparent text-[#868685] hover:text-[#454745]"
          } ${isBusy ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          Pencairan Cepat (Bunga Pasar)
        </button>
      </div>

      {isMarket && (
        <FallbackBadge isFallbackActive={true} spreadBps={150} fallbackRate={fallbackRateBps} />
      )}

      {/* Inputs */}
      <div className="flex flex-col gap-3.5">
        {!isMarket && (
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between items-center">
              <label htmlFor="target-apy" className="text-[10px] font-bold text-[#868685] uppercase tracking-wider">
                Target Suku Bunga per Tahun (%)
              </label>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={() => {
                    const current = parseFloat(rate) || 0;
                    setRate(Math.max(0.1, current - 0.25).toFixed(2));
                  }}
                  className="px-2 py-0.5 rounded-xs bg-[#e8ebe6] hover:bg-stone-300 text-[10px] font-mono font-bold text-[#0e0f0c] transition-colors cursor-pointer"
                >
                  -0.25%
                </button>
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={() => {
                    const current = parseFloat(rate) || 0;
                    setRate((current + 0.25).toFixed(2));
                  }}
                  className="px-2 py-0.5 rounded-xs bg-[#e8ebe6] hover:bg-stone-300 text-[10px] font-mono font-bold text-[#0e0f0c] transition-colors cursor-pointer"
                >
                  +0.25%
                </button>
              </div>
            </div>
            <input
              id="target-apy"
              type="number"
              step="0.01"
              disabled={isBusy}
              value={rate}
              onChange={(e) => {
                setRate(e.target.value);
                setStatusMessage(null);
              }}
              className="bg-[#f6f7f5] border border-stone-300 rounded-xs px-4 py-2.5 text-[#0e0f0c] font-mono font-bold focus:outline-none focus:ring-2 focus:ring-[#0e0f0c] disabled:opacity-50 text-base"
              placeholder="Contoh: 6.50"
            />
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between items-center">
            <label htmlFor="principal-amount" className="text-[10px] font-bold text-[#868685] uppercase tracking-wider">
              Jumlah Dana (mUSDC)
            </label>
            <div className="flex items-center gap-1">
              {['500', '1000', '5000', '25000'].map((val) => (
                <button
                  key={val}
                  type="button"
                  disabled={isBusy}
                  onClick={() => {
                    setAmount(val);
                    setStatusMessage(null);
                  }}
                  className={`px-2 py-0.5 rounded-xs text-[10px] font-mono font-bold transition-colors cursor-pointer ${
                    amount === val ? 'bg-[#0e0f0c] text-white' : 'bg-[#e8ebe6] hover:bg-stone-300 text-[#454745]'
                  }`}
                >
                  {val === '25000' ? '25k' : val === '5000' ? '5k' : val === '1000' ? '1k' : '500'}
                </button>
              ))}
            </div>
          </div>
          <input
            id="principal-amount"
            type="number"
            step="10"
            disabled={isBusy}
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value);
              setStatusMessage(null);
            }}
            className="bg-[#f6f7f5] border border-stone-300 rounded-xs px-4 py-2.5 text-[#0e0f0c] font-mono font-bold focus:outline-none focus:ring-2 focus:ring-[#0e0f0c] disabled:opacity-50 text-base"
            placeholder="Minimal 10 mUSDC"
          />
        </div>
      </div>

      {/* Financial Projection Card */}
      <div className="flex flex-col gap-2 p-3.5 bg-[#f6f7f5] rounded-xs border border-stone-200 text-xs">
        <div className="flex justify-between items-center text-[10px] font-bold text-[#868685] uppercase tracking-wider">
          <span>Proyeksi Perhitungan</span>
          <span>Jatuh Tempo: {maturityDateEstimate}</span>
        </div>
        <div className="flex justify-between text-[#454745]">
          <span>{isLend ? "Estimasi Bunga Diterima:" : "Estimasi Beban Bunga Pinjaman:"}</span>
          <span className="font-mono font-bold text-[#2ead4b]">
            {isLend ? "+" : ""}{interestEstimate.toFixed(2)} mUSDC
          </span>
        </div>
        <div className="flex justify-between text-[#454745]">
          <span>Biaya Layanan ({feeBps !== undefined ? feeBps.toString() : "15"} bps / {(feePercent).toFixed(2)}%):</span>
          <span className="font-mono text-[#868685]">
            {feeAmountEstimate.toFixed(2)} mUSDC
          </span>
        </div>
        <div className="pt-2 border-t border-stone-200 flex justify-between items-baseline font-bold text-[#0e0f0c]">
          <span>{isLend ? "Total Pengembalian Pokok + Bunga:" : "Total Kewajiban Pelunasan:"}</span>
          <span className="font-mono text-sm font-black">
            {netSettlement.toFixed(2)} mUSDC
          </span>
        </div>
      </div>

      {/* Submission Feedback */}
      {statusMessage && (
        <div
          className={`p-3.5 rounded-xs text-xs border transition-all ${
            txPhase === "error"
              ? "bg-red-50 border-[#d03238]/30 text-[#d03238]"
              : txPhase === "success"
                ? "bg-[#e2f6d5] border-[#2ead4b]/30 text-[#163300]"
                : "bg-[#e8ebe6] border-stone-300 text-[#0e0f0c]"
          }`}
        >
          <div className="font-semibold">{statusMessage}</div>
          {successTxHash && (
            <div className="mt-2 flex items-center justify-between text-[11px] font-mono">
              <span className="text-[#163300] truncate max-w-[200px]">Tx: {successTxHash}</span>
              <a
                href={`https://testnet.monadexplorer.com/tx/${successTxHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="underline font-bold text-[#163300] hover:text-[#0e0f0c]"
              >
                Lihat di Explorer &rarr;
              </a>
            </div>
          )}
        </div>
      )}

      {/* Action Button */}
      <button
        type="button"
        disabled={isBusy}
        onClick={handleSubmit}
        className={`w-full py-4 rounded-xs font-black text-sm tracking-wide transition-all mt-1 cursor-pointer ${
          isLend
            ? "bg-[#9fe870] text-[#0e0f0c] hover:bg-[#cdffad] disabled:bg-stone-300 disabled:text-[#868685]"
            : "bg-[#0e0f0c] text-white hover:bg-[#163300] disabled:bg-stone-300 disabled:text-[#868685]"
        } ${isBusy ? "cursor-wait opacity-80" : ""}`}
      >
        {getButtonText()}
      </button>
    </div>
  );
}
