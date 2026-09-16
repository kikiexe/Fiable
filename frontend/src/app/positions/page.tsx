"use client";

import { useState } from "react";
import Link from "next/link";
import { usePrivy } from "@privy-io/react-auth";
import { useAccount } from "wagmi";
import { ConnectButton } from "@/components/wallet/ConnectButton";
import { FaucetButton } from "@/components/faucet/FaucetButton";
import { PositionCard } from "@/components/positions/PositionCard";
import { usePositions, type IndexedPosition } from "@/hooks/usePositions";
import { useCurrentTimestamp } from "@/hooks/useCurrentTimestamp";
import { formatUSDC } from "@/lib/contracts";

export default function PositionsPage() {
  const { authenticated } = usePrivy();
  const { address } = useAccount();
  const { data, isLoading } = usePositions(address);
  const now = useCurrentTimestamp();
  const [filter, setFilter] = useState<"all" | "lender" | "borrower">("all");

  const asLender = data?.asLender ?? [];
  const asBorrower = data?.asBorrower ?? [];

  // Summary Metrics
  const totalLentRaw = asLender.reduce(
    (acc, pos) => acc + BigInt(pos.amount || "0"),
    BigInt(0)
  );
  const totalBorrowedRaw = asBorrower.reduce(
    (acc, pos) => acc + BigInt(pos.amount || "0"),
    BigInt(0)
  );

  const zeroBigInt = BigInt(0);
  const activeCount = [...asLender, ...asBorrower].filter(
    (p) => !p.settled && now > zeroBigInt && now < BigInt(p.maturityTime || "0")
  ).length;
  const maturedCount = [...asLender, ...asBorrower].filter(
    (p) => !p.settled && now > zeroBigInt && now >= BigInt(p.maturityTime || "0")
  ).length;

  let displayPositions: { pos: IndexedPosition; role: "lender" | "borrower" }[] = [];
  if (filter === "all") {
    displayPositions = [
      ...asLender.map((pos) => ({ pos, role: "lender" as const })),
      ...asBorrower.map((pos) => ({ pos, role: "borrower" as const })),
    ];
  } else if (filter === "lender") {
    displayPositions = asLender.map((pos) => ({ pos, role: "lender" as const }));
  } else {
    displayPositions = asBorrower.map((pos) => ({ pos, role: "borrower" as const }));
  }

  // Sort by startTime descending
  displayPositions.sort(
    (a, b) => Number(b.pos.startTime || 0) - Number(a.pos.startTime || 0)
  );

  return (
    <div className="min-h-screen bg-[#0F172A] text-slate-100 flex flex-col">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur px-8 py-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-xl font-black text-white tracking-tight">
            Fieble
          </Link>
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-400 font-medium">
            Monad Testnet
          </span>
        </div>

        <nav className="flex items-center gap-4 text-sm font-medium">
          <Link href="/orderbook" className="text-slate-400 hover:text-slate-200">
            Order Book
          </Link>
          <Link href="/positions" className="text-white font-semibold">
            Posisi Aktif
          </Link>
          <Link href="/market-maker" className="text-slate-400 hover:text-slate-200">
            Market Maker
          </Link>
          <FaucetButton />
          <ConnectButton />
        </nav>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-6 flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
          <div>
            <h1 className="text-2xl font-bold text-white">Posisi Kredit & Riwayat</h1>
            <p className="text-xs text-slate-400 mt-1">
              Data posisi real-time dari Envio HyperIndex pada Monad Testnet.
            </p>
          </div>
          <Link
            href="/orderbook"
            className="self-start sm:self-auto px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-colors"
          >
            + Buka Order Baru
          </Link>
        </div>

        {!authenticated || !address ? (
          <div className="flex flex-col items-center justify-center gap-4 py-24 text-center rounded-2xl bg-slate-900/40 border border-slate-800">
            <p className="text-slate-400 text-sm max-w-md">
              Hubungkan wallet Anda untuk melihat posisi lending, borrowing, status jatuh tempo, dan melakukan pelunasan pinjaman onchain.
            </p>
            <ConnectButton />
          </div>
        ) : (
          <>
            {/* Overview Metric Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                <div className="text-[11px] text-slate-400 uppercase tracking-wider">
                  Total Dipinjamkan
                </div>
                <div className="text-xl font-bold font-mono text-emerald-400 mt-1">
                  {formatUSDC(totalLentRaw)} mUSDC
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                <div className="text-[11px] text-slate-400 uppercase tracking-wider">
                  Total Dipinjam
                </div>
                <div className="text-xl font-bold font-mono text-blue-400 mt-1">
                  {formatUSDC(totalBorrowedRaw)} mUSDC
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                <div className="text-[11px] text-slate-400 uppercase tracking-wider">
                  Posisi Berjalan
                </div>
                <div className="text-xl font-bold font-mono text-white mt-1">
                  {activeCount}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                <div className="text-[11px] text-slate-400 uppercase tracking-wider">
                  Jatuh Tempo (Settle)
                </div>
                <div className="text-xl font-bold font-mono text-amber-400 mt-1">
                  {maturedCount}
                </div>
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
              <button
                type="button"
                onClick={() => setFilter("all")}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                  filter === "all"
                    ? "bg-slate-800 text-white"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Semua Posisi ({asLender.length + asBorrower.length})
              </button>
              <button
                type="button"
                onClick={() => setFilter("lender")}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                  filter === "lender"
                    ? "bg-slate-800 text-emerald-400"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Lending ({asLender.length})
              </button>
              <button
                type="button"
                onClick={() => setFilter("borrower")}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                  filter === "borrower"
                    ? "bg-slate-800 text-blue-400"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Borrowing ({asBorrower.length})
              </button>
            </div>

            {/* Content List */}
            {isLoading ? (
              <div className="py-16 text-center text-slate-500 text-sm">
                Memuat data posisi dari Envio HyperIndex...
              </div>
            ) : displayPositions.length === 0 ? (
              <div className="py-20 text-center rounded-2xl bg-slate-900/30 border border-slate-800/80 flex flex-col items-center gap-3">
                <p className="text-slate-400 text-sm">
                  Tidak ada posisi kredit yang ditemukan untuk wallet ini.
                </p>
                <Link
                  href="/orderbook"
                  className="px-4 py-2 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30 text-xs font-medium hover:bg-blue-600/30 transition-colors"
                >
                  Pasang Order di Order Book
                </Link>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {displayPositions.map(({ pos, role }) => (
                  <PositionCard
                    key={`${pos.id}-${role}`}
                    {...pos}
                    role={role}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
