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

  // Interest formula: (amount * rateBps * duration) / (10000 * 365 days)
  const interestAmount =
    (rawAmount * rawRate * durationSeconds) / (bpsDenominator * secondsInYear);
  const totalRepayment = rawAmount + interestAmount;

  const isMatured = now > zero && now >= rawMaturity;
  const isLender = role === "lender";
  const settled = isSettledLocal || initialSettled;

  // Check onchain allowance for borrower settlement
  const { data: allowance } = useReadContract({
    address: CONTRACT_ADDRESSES.mockUSDC,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: address ? [address, CONTRACT_ADDRESSES.clobEngine] : undefined,
  });

  // MiningReward match record onchain view
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
        // Borrower needs to approve token transfer for repayment if allowance is insufficient
        const currentAllowance = allowance !== undefined ? BigInt(allowance) : zero;
        if (currentAllowance < totalRepayment) {
          setActionStatus("Meminta approval pelunasan...");
          const approveHash = await writeContractAsync({
            address: CONTRACT_ADDRESSES.mockUSDC,
            abi: ERC20_ABI,
            functionName: "approve",
            args: [CONTRACT_ADDRESSES.clobEngine, totalRepayment],
          });
          setActionStatus("Menunggu konfirmasi approval...");
          await waitForTransactionReceipt(config, { hash: approveHash });
        }
      }

      setActionStatus("Mengirim transaksi settle...");
      const settleHash = await writeContractAsync({
        address: CONTRACT_ADDRESSES.clobEngine,
        abi: CLOB_ENGINE_ABI,
        functionName: "settlePosition",
        args: [BigInt(positionId)],
      });

      setActionStatus("Menunggu konfirmasi penyelesaian posisi...");
      await waitForTransactionReceipt(config, { hash: settleHash });
      setIsSettledLocal(true);
      setActionStatus("Posisi berhasil diselesaikan onchain!");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Penyelesaian posisi gagal";
      setActionStatus(`Settle gagal: ${msg.slice(0, 45)}...`);
    } finally {
      setIsBusy(false);
    }
  };

  const handleClaimReward = async () => {
    if (isBusy) return;
    setIsBusy(true);
    try {
      setActionStatus("Mengirim klaim reward...");
      const claimHash = await writeContractAsync({
        address: CONTRACT_ADDRESSES.miningReward,
        abi: MINING_REWARD_ABI,
        functionName: "claimWeightedVolume",
        args: [BigInt(positionId), isLender],
      });

      setActionStatus("Menunggu konfirmasi klaim...");
      await waitForTransactionReceipt(config, { hash: claimHash });
      setActionStatus("Mining reward berhasil diklaim!");
      await refetchMatchRecord();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Klaim gagal";
      setActionStatus(`Klaim gagal: ${msg.slice(0, 45)}...`);
    } finally {
      setIsBusy(false);
    }
  };

  // Format dates
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

  // Calculate remaining time
  const remainingSeconds =
    now > zero && rawMaturity > now ? Number(rawMaturity - now) : 0;
  const remainingDays = Math.floor(remainingSeconds / 86400);
  const remainingHours = Math.floor((remainingSeconds % 86400) / 3600);

  return (
    <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col gap-4 hover:border-slate-700 transition-colors">
      {/* Header Info */}
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-3">
          <span
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold uppercase tracking-wider ${
              isLender
                ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                : "bg-blue-500/15 text-blue-400 border border-blue-500/30"
            }`}
          >
            {isLender ? "Pemberi Pinjaman (Lender)" : "Peminjam (Borrower)"}
          </span>
          <span className="text-xs font-mono text-slate-400">
            Posisi #{positionId}
          </span>
        </div>

        {/* Status Badge */}
        <div>
          {settled ? (
            <span className="px-2.5 py-1 rounded-full bg-slate-800 text-slate-400 text-xs font-medium border border-slate-700">
              Selesai (Settled)
            </span>
          ) : isMatured ? (
            <span className="px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-medium border border-amber-500/40 animate-pulse">
              Jatuh Tempo (Siap Settle)
            </span>
          ) : (
            <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-medium border border-emerald-500/40">
              Aktif Berjalan
            </span>
          )}
        </div>
      </div>

      {/* Main Metric Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-2 border-y border-slate-800/80">
        <div>
          <div className="text-[11px] text-slate-400 uppercase tracking-wider">
            Pokok Pinjaman
          </div>
          <div className="text-lg font-bold font-mono text-white mt-0.5">
            {formatUSDC(rawAmount)} mUSDC
          </div>
        </div>

        <div>
          <div className="text-[11px] text-slate-400 uppercase tracking-wider">
            Suku Bunga Tetap
          </div>
          <div className="text-lg font-bold font-mono text-emerald-400 mt-0.5">
            {(Number(rawRate) / 100).toFixed(2)}% APY
          </div>
        </div>

        <div>
          <div className="text-[11px] text-slate-400 uppercase tracking-wider">
            Tenor Bucket
          </div>
          <div className="text-sm font-semibold text-slate-200 mt-1">
            {tenorBucket.name} ({tenorBucket.label})
          </div>
        </div>

        <div>
          <div className="text-[11px] text-slate-400 uppercase tracking-wider">
            {isLender ? "Estimasi Imbal Hasil" : "Total Kewajiban Pelunasan"}
          </div>
          <div className="text-sm font-bold font-mono text-slate-200 mt-1">
            {isLender
              ? `+${formatUSDC(interestAmount)} mUSDC`
              : `${formatUSDC(totalRepayment)} mUSDC`}
          </div>
        </div>
      </div>

      {/* Dates & Counterparty */}
      <div className="flex flex-col sm:flex-row justify-between text-xs text-slate-400 gap-2">
        <div>
          <span>Mulai: </span>
          <span className="text-slate-300 font-medium">{startDateStr}</span>
          <span className="mx-2">|</span>
          <span>Jatuh Tempo: </span>
          <span className="text-slate-300 font-medium">{maturityDateStr}</span>
          {!settled && !isMatured && remainingSeconds > 0 && (
            <span className="ml-2 text-slate-500">
              ({remainingDays > 0 ? `${remainingDays} hari ` : ""}{remainingHours} jam lagi)
            </span>
          )}
        </div>

        <div className="font-mono text-[11px]">
          <span>Counterparty: </span>
          <span className="text-slate-300">
            {isLender
              ? `${borrower.slice(0, 6)}...${borrower.slice(-4)}`
              : `${lender.slice(0, 6)}...${lender.slice(-4)}`}
          </span>
        </div>
      </div>

      {/* Action Footer */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <div className="text-xs text-slate-400">
          {actionStatus && (
            <span className="text-emerald-400 font-mono">{actionStatus}</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Settle Action */}
          {!settled && isMatured && (
            <button
              type="button"
              onClick={handleSettle}
              disabled={isBusy}
              className="px-4 py-2 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs hover:bg-amber-400 transition-colors disabled:opacity-50 cursor-pointer"
            >
              {isBusy ? "Memproses..." : isLender ? "Cairkan Pelunasan" : "Lunasi Pinjaman"}
            </button>
          )}

          {/* Mining Reward Claim Action */}
          {matchRecord && !isClaimedByMe && (
            <button
              type="button"
              onClick={handleClaimReward}
              disabled={isBusy}
              className="px-3 py-2 rounded-xl bg-indigo-600/20 text-indigo-300 border border-indigo-500/40 text-xs font-semibold hover:bg-indigo-600/30 transition-colors disabled:opacity-50 cursor-pointer"
            >
              Klaim Mining Reward
            </button>
          )}

          {isClaimedByMe && (
            <span className="text-xs text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-lg border border-indigo-500/20 font-medium">
              Reward Diklaim
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
