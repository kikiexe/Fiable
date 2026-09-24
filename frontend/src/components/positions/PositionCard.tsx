"use client";

import { useState } from "react";
import { useAccount, useConfig, useWriteContract, useReadContract } from "wagmi";
import { waitForTransactionReceipt } from "wagmi/actions";
import {
  CONTRACT_ADDRESSES,
  CLOB_ENGINE_ABI,
  MINING_REWARD_ABI,
  ERC20_ABI,
  TENOR_BUCKETS,
  formatUSDC,
} from "@/lib/contracts";
import { useCurrentTimestamp } from "@/hooks/useCurrentTimestamp";

export interface PositionCardProps {
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
  role: "lender" | "borrower";
}

export function PositionCard({
  positionId,
  lender,
  borrower,
  tenor,
  rate,
  amount,
  startTime,
  maturityTime,
  settled: initialSettled,
  role,
}: PositionCardProps) {
  const config = useConfig();
  const { address } = useAccount();
  const now = useCurrentTimestamp();

  const [isSettledLocal, setIsSettledLocal] = useState<boolean>(initialSettled);
  const [actionStatus, setActionStatus] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState<boolean>(false);

  const rawAmount = BigInt(amount || "0");
  const rawRate = BigInt(rate || "0");
  const rawStart = BigInt(startTime || "0");
  const rawMaturity = BigInt(maturityTime || "0");

  const tenorBucket = TENOR_BUCKETS.find((b) => b.id === tenor) ?? TENOR_BUCKETS[0];
  const durationSeconds =
    rawMaturity > rawStart
      ? rawMaturity - rawStart
      : BigInt(tenorBucket.durationDays * 86400);

  const zero = BigInt(0);
  const secondsInYear = BigInt(365 * 86400);
  const bpsDenominator = BigInt(10000);

  const interestAmount =
    (rawAmount * rawRate * durationSeconds) / (bpsDenominator * secondsInYear);
  const totalRepayment = rawAmount + interestAmount;

  const isMatured = now > zero && now >= rawMaturity;
  const isLender = role === "lender";
  const settled = isSettledLocal || initialSettled;

  const { data: allowance } = useReadContract({
    address: CONTRACT_ADDRESSES.mockUSDC,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: address ? [address, CONTRACT_ADDRESSES.clobEngine] : undefined,
  });

  const { data: matchRecord, refetch: refetchMatchRecord } = useReadContract({
    address: CONTRACT_ADDRESSES.miningReward,
    abi: MINING_REWARD_ABI,
    functionName: "getMatchRecord",
    args: [BigInt(positionId)],
  });

  const isClaimedByMe = matchRecord
    ? isLender
      ? matchRecord.claimedLender
      : matchRecord.claimedBorrower
    : false;

  const { writeContractAsync } = useWriteContract();

  const handleSettle = async () => {
    if (!role || isBusy) return;

    setIsBusy(true);
    try {
      if (!isLender) {
        const currentAllowance = allowance !== undefined ? BigInt(allowance) : zero;
        if (currentAllowance < totalRepayment) {
          setActionStatus("Menyiapkan izin pembayaran di dompet...");
          const approveHash = await writeContractAsync({
            address: CONTRACT_ADDRESSES.mockUSDC,
            abi: ERC20_ABI,
            functionName: "approve",
            args: [CONTRACT_ADDRESSES.clobEngine, totalRepayment],
          });
          setActionStatus("Menunggu izin pembayaran disetujui...");
          await waitForTransactionReceipt(config, { hash: approveHash });
        }
      }

      setActionStatus("Memproses transaksi pelunasan di dompet...");
      const settleHash = await writeContractAsync({
        address: CONTRACT_ADDRESSES.clobEngine,
        abi: CLOB_ENGINE_ABI,
        functionName: "settlePosition",
        args: [BigInt(positionId)],
      });

      setActionStatus("Menunggu konfirmasi pelunasan...");
      await waitForTransactionReceipt(config, { hash: settleHash });
      setIsSettledLocal(true);
      setActionStatus("Pinjaman berhasil dilunasi!");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Pelunasan pinjaman gagal";
      setActionStatus(`Pelunasan gagal: ${msg.slice(0, 45)}...`);
    } finally {
      setIsBusy(false);
    }
  };

  const handleClaimReward = async () => {
    if (isBusy) return;
    setIsBusy(true);
    try {
      setActionStatus("Memproses pengambilan imbalan...");
      const claimHash = await writeContractAsync({
        address: CONTRACT_ADDRESSES.miningReward,
        abi: MINING_REWARD_ABI,
        functionName: "claimWeightedVolume",
        args: [BigInt(positionId), isLender],
      });

      setActionStatus("Menunggu konfirmasi penerimaan imbalan...");
      await waitForTransactionReceipt(config, { hash: claimHash });
      setActionStatus("Imbalan berhasil diambil!");
      await refetchMatchRecord();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Klaim gagal";
      setActionStatus(`Gagal mengambil imbalan: ${msg.slice(0, 45)}...`);
    } finally {
      setIsBusy(false);
    }
  };

  const startDateStr =
    rawStart > zero
      ? new Date(Number(rawStart) * 1000).toLocaleDateString("id-ID", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })
      : "Baru saja";

  const maturityDateStr =
    rawMaturity > zero
      ? new Date(Number(rawMaturity) * 1000).toLocaleDateString("id-ID", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })
      : "Segera";

  const remainingSeconds =
    now > zero && rawMaturity > now ? Number(rawMaturity - now) : 0;
  const remainingDays = Math.floor(remainingSeconds / 86400);
  const remainingHours = Math.floor((remainingSeconds % 86400) / 3600);

  const totalDuration = rawMaturity > rawStart ? Math.max(1, Number(rawMaturity - rawStart)) : 1;
  const elapsedSeconds = now > rawStart ? Math.min(totalDuration, Number(now - rawStart)) : 0;
  const progressPercent = Math.min(100, Math.max(0, Math.round((elapsedSeconds / totalDuration) * 100)));
  const isAntiWashMet = progressPercent >= 50;
  const [copied, setCopied] = useState<boolean>(false);

  const handleCopyAddress = (addr: string) => {
    navigator.clipboard.writeText(addr);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const counterpartyAddress = isLender ? borrower : lender;

  return (
    <div className="p-5 rounded-xs bg-white border border-stone-200 flex flex-col gap-4 hover:border-stone-300 transition-colors shadow-xs">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-3">
          <span
            className={`px-3 py-1 rounded-xs text-[10px] font-black uppercase tracking-wider ${
              isLender
                ? "bg-[#e2f6d5] text-[#163300] border border-[#9fe870]/30"
                : "bg-[#0e0f0c] text-white border border-[#0e0f0c]"
            }`}
          >
            {isLender ? "Pendana (Memberi Pinjaman)" : "Peminjam (Mengambil Pinjaman)"}
          </span>
          <span className="text-xs font-mono font-bold text-[#868685]">
            Posisi #{positionId}
          </span>
        </div>

        <div>
          {settled ? (
            <span className="px-2.5 py-1 rounded-xs bg-stone-200 text-[#868685] text-[10px] font-bold border border-stone-300">
              Lunas / Selesai
            </span>
          ) : isMatured ? (
            <span className="px-2.5 py-1 rounded-xs bg-[#ffd11a]/20 text-[#4a3b1c] text-[10px] font-bold border border-[#ffd11a]/50">
              Jatuh Tempo (Siap Dilunasi)
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xs bg-[#e2f6d5] text-[#163300] text-[10px] font-bold border border-[#9fe870]/30">
              <span className="w-1.5 h-1.5 rounded-full bg-[#2ead4b]" />
              Sedang Berjalan
            </span>
          )}
        </div>
      </div>

      {/* Metric Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-3 border-y border-stone-200">
        <div>
          <div className="text-[10px] font-bold text-[#868685] uppercase tracking-wider">
            Jumlah Pinjaman
          </div>
          <div className="text-lg font-black font-mono text-[#0e0f0c] mt-0.5">
            {formatUSDC(rawAmount)} mUSDC
          </div>
        </div>

        <div>
          <div className="text-[10px] font-bold text-[#868685] uppercase tracking-wider">
            Suku Bunga Pasti
          </div>
          <div className="text-lg font-black font-mono text-[#2ead4b] mt-0.5">
            {(Number(rawRate) / 100).toFixed(2)}% APY
          </div>
        </div>

        <div>
          <div className="text-[10px] font-bold text-[#868685] uppercase tracking-wider">
            Jangka Waktu
          </div>
          <div className="text-sm font-bold text-[#0e0f0c] mt-1">
            {tenorBucket.name} ({tenorBucket.label})
          </div>
        </div>

        <div>
          <div className="text-[10px] font-bold text-[#868685] uppercase tracking-wider">
            {isLender ? "Perkiraan Bunga Diterima" : "Total Pembayaran Kembali"}
          </div>
          <div className="text-sm font-black font-mono text-[#0e0f0c] mt-1">
            {isLender
              ? `+${formatUSDC(interestAmount)} mUSDC`
              : `${formatUSDC(totalRepayment)} mUSDC`}
          </div>
        </div>
      </div>

      {/* Lifecycle Progress Bar */}
      <div className="flex flex-col gap-1.5 py-1">
        <div className="flex justify-between items-center text-[10px] font-mono text-[#868685]">
          <span>Waktu Berjalan Pinjaman: {progressPercent}%</span>
          <span className={isAntiWashMet ? "text-[#163300] font-bold" : "text-stone-400"}>
            {isAntiWashMet ? "[Memenuhi Syarat Waktu Imbalan]" : "[Menunggu Batas Waktu Imbalan]"}
          </span>
        </div>
        <div className="relative h-2 w-full bg-[#f6f7f5] rounded-xs border border-stone-200 overflow-hidden">
          {/* 50% threshold mark */}
          <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-stone-300 z-10" title="Batas Minimal 50% Durasi Imbalan" />
          <div
            className={`h-full transition-all duration-500 ${
              settled
                ? "bg-stone-400"
                : isMatured
                  ? "bg-[#ffd11a]"
                  : "bg-[#9fe870]"
            }`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Dates & Counterparty */}
      <div className="flex flex-col sm:flex-row justify-between text-xs text-[#868685] gap-2">
        <div>
          <span>Mulai: </span>
          <span className="text-[#0e0f0c] font-semibold">{startDateStr}</span>
          <span className="mx-2">|</span>
          <span>Jatuh Tempo: </span>
          <span className="text-[#0e0f0c] font-semibold">{maturityDateStr}</span>
          {!settled && !isMatured && remainingSeconds > 0 && (
            <span className="ml-2 text-[#868685]">
              ({remainingDays > 0 ? `${remainingDays} hari ` : ""}{remainingHours} jam lagi)
            </span>
          )}
        </div>

        <div className="font-mono text-[11px] flex items-center gap-1.5">
          <span>Mitra Transaksi:</span>
          <button
            type="button"
            onClick={() => handleCopyAddress(counterpartyAddress)}
            className="text-[#0e0f0c] font-semibold hover:underline bg-[#f6f7f5] px-1.5 py-0.5 rounded-2xs border border-stone-200 cursor-pointer"
            title="Klik untuk menyalin alamat lengkap"
          >
            {counterpartyAddress ? `${counterpartyAddress.slice(0, 6)}...${counterpartyAddress.slice(-4)}` : "None"}
          </button>
          {copied && (
            <span className="text-[10px] text-[#2ead4b] font-bold">Tersalin!</span>
          )}
        </div>
      </div>

      {/* Action Footer */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-stone-100">
        <div className="text-xs text-[#868685]">
          {actionStatus && (
            <span className="text-[#163300] font-mono font-bold">{actionStatus}</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {!settled && isMatured && (
            <button
              type="button"
              onClick={handleSettle}
              disabled={isBusy}
              className="px-4 py-2 rounded-xs bg-[#9fe870] text-[#0e0f0c] font-black text-xs hover:bg-[#cdffad] transition-colors disabled:opacity-50 cursor-pointer min-h-[38px]"
            >
              {isBusy ? "Memproses..." : isLender ? "Cairkan Pokok & Bunga" : "Lunasi Pinjaman"}
            </button>
          )}

          {matchRecord && !isClaimedByMe && (
            <button
              type="button"
              onClick={handleClaimReward}
              disabled={isBusy}
              className="px-3.5 py-2 rounded-xs bg-[#e2f6d5] text-[#163300] border border-[#9fe870]/30 text-xs font-bold hover:bg-[#9fe870] transition-colors disabled:opacity-50 cursor-pointer min-h-[38px]"
            >
              Ambil Imbalan Keaktifan
            </button>
          )}

          {isClaimedByMe && (
            <span className="text-[10px] text-[#163300] bg-[#e2f6d5] px-2.5 py-1.5 rounded-xs border border-[#9fe870]/20 font-bold">
              Imbalan Sudah Diambil
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
