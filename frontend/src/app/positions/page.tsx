"use client";

import { useState } from "react";
import Link from "next/link";
import { usePrivy } from "@privy-io/react-auth";
import { useAccount } from "wagmi";
import { ConnectButton } from "@/components/wallet/ConnectButton";
import { AppHeader } from "@/components/AppHeader";
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

  const [sortBy, setSortBy] = useState<"time" | "amount" | "rate">("time");

  const totalLentRaw = asLender.reduce(
    (acc, pos) => acc + BigInt(pos.amount || "0"),
    BigInt(0)
  );
  const totalBorrowedRaw = asBorrower.reduce(
    (acc, pos) => acc + BigInt(pos.amount || "0"),
    BigInt(0)
  );

  const netExposure = totalLentRaw >= totalBorrowedRaw
    ? totalLentRaw - totalBorrowedRaw
    : totalBorrowedRaw - totalLentRaw;
  const isNetLender = totalLentRaw >= totalBorrowedRaw;

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

  displayPositions.sort((a, b) => {
    if (sortBy === "amount") {
      return Number(BigInt(b.pos.amount || "0") - BigInt(a.pos.amount || "0"));
    }
    if (sortBy === "rate") {
      return Number(BigInt(b.pos.rate || "0") - BigInt(a.pos.rate || "0"));
    }
    return Number(b.pos.startTime || 0) - Number(a.pos.startTime || 0);
  });

  const filterOptions = [
    { key: "all" as const, label: `Semua (${asLender.length + asBorrower.length})` },
    { key: "lender" as const, label: `Pendanaan (${asLender.length})` },
    { key: "borrower" as const, label: `Pinjaman (${asBorrower.length})` },
  ];

  return (
    <div className="min-h-screen bg-[#e8ebe6] text-[#0e0f0c] flex flex-col">
      <AppHeader />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-8 flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 pb-2 border-b border-stone-200">
          <div>
            <span className="text-[10px] font-mono font-black tracking-widest uppercase text-[#163300]">
              PINJAMAN SAYA
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-[#0e0f0c] tracking-tight">
              Daftar Pinjaman & Riwayat Transaksi
            </h1>
            <p className="text-xs text-[#454745] mt-1">
              Catatan seluruh pinjaman dan pendanaan Anda yang tersimpan aman di jaringan blockchain.
            </p>
          </div>
          <Link
            href="/orderbook"
            className="self-start sm:self-auto px-5 py-2.5 rounded-xs bg-[#9fe870] text-[#0e0f0c] text-xs font-black hover:bg-[#cdffad] transition-colors shadow-xs"
          >
            + Buat Penawaran
          </Link>
        </div>

        {!authenticated || !address ? (
          <div className="flex flex-col items-center justify-center gap-4 py-24 text-center rounded-xs bg-white border border-stone-200 shadow-xs">
            <p className="text-[#454745] text-sm max-w-md">
              Hubungkan dompet untuk memantau pinjaman, pendanaan, dan melakukan pelunasan secara langsung.
            </p>
            <ConnectButton />
          </div>
        ) : (
          <>
            {/* Metric Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-4 rounded-xs bg-white border border-stone-200 shadow-xs">
                <div className="text-[10px] font-bold text-[#868685] uppercase tracking-wider">
                  Total Dana Dipinjamkan
                </div>
                <div className="text-xl font-black font-mono text-[#2ead4b] mt-1">
                  {formatUSDC(totalLentRaw)} mUSDC
                </div>
                <div className="text-[10px] text-[#868685] mt-1">
                  {asLender.length} Transaksi Pendanaan
                </div>
              </div>

              <div className="p-4 rounded-xs bg-white border border-stone-200 shadow-xs">
                <div className="text-[10px] font-bold text-[#868685] uppercase tracking-wider">
                  Total Dana Dipinjam
                </div>
                <div className="text-xl font-black font-mono text-[#0e0f0c] mt-1">
                  {formatUSDC(totalBorrowedRaw)} mUSDC
                </div>
                <div className="text-[10px] text-[#868685] mt-1">
                  {asBorrower.length} Transaksi Pinjaman
                </div>
              </div>

              <div className="p-4 rounded-xs bg-white border border-stone-200 shadow-xs">
                <div className="text-[10px] font-bold text-[#868685] uppercase tracking-wider">
                  Selisih Bersih (Net)
                </div>
                <div className={`text-xl font-black font-mono mt-1 ${isNetLender ? "text-[#2ead4b]" : "text-[#d03238]"}`}>
                  {isNetLender ? "+" : "-"}{formatUSDC(netExposure)} mUSDC
                </div>
                <div className="text-[10px] text-[#868685] mt-1">
                  {isNetLender ? "Lebih Banyak Mendanai" : "Lebih Banyak Meminjam"}
                </div>
              </div>

              <div className="p-4 rounded-xs bg-white border border-stone-200 shadow-xs">
                <div className="text-[10px] font-bold text-[#868685] uppercase tracking-wider">
                  Status Jatuh Tempo
                </div>
                <div className="text-xl font-black font-mono text-[#0e0f0c] mt-1 flex items-center gap-2">
                  <span>{maturedCount} Siap</span>
                  <span className="text-xs text-[#868685] font-normal font-sans">({activeCount} Berjalan)</span>
                </div>
                <div className="text-[10px] text-[#868685] mt-1">
                  Pelunasan langsung kapan saja
                </div>
              </div>
            </div>

            {/* Filter and Sort Controls */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-300 pb-3">
              <div className="flex items-center gap-1.5">
                {filterOptions.map((opt) => (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => setFilter(opt.key)}
                    className={`px-3 py-1.5 rounded-xs text-xs font-bold cursor-pointer transition-colors ${
                      filter === opt.key
                        ? `bg-[#0e0f0c] text-white shadow-xs`
                        : "text-[#454745] hover:text-[#0e0f0c] hover:bg-white"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2 text-xs font-mono">
                <span className="text-[#868685]">Urutkan:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as "time" | "amount" | "rate")}
                  className="bg-white border border-stone-300 rounded-xs px-2.5 py-1 text-xs text-[#0e0f0c] font-bold focus:outline-none"
                >
                  <option value="time">Waktu Terbaru</option>
                  <option value="amount">Nominal Terbesar</option>
                  <option value="rate">Suku Bunga</option>
                </select>
              </div>
            </div>

            {/* Position List */}
            {isLoading ? (
              <div className="py-16 text-center text-[#868685] text-sm font-mono bg-white rounded-xs border border-stone-200">
                Memuat data pinjaman...
              </div>
            ) : displayPositions.length === 0 ? (
              <div className="py-14 text-center rounded-xs bg-white border border-stone-200 shadow-xs flex flex-col items-center gap-4 px-4">
                <div className="max-w-md">
                  <h3 className="text-base font-black text-[#0e0f0c]">
                    Belum Ada Riwayat Pinjaman
                  </h3>
                  <p className="text-xs text-[#454745] mt-1.5 leading-relaxed">
                    Anda belum memiliki pinjaman atau pendanaan yang aktif. Pasang penawaran di buku penawaran pasar untuk mengunci suku bunga pasti.
                  </p>
                </div>

                {/* Quick Tenor Shortcuts */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 w-full max-w-lg mt-2 text-left">
                  {[
                    { id: 0, name: "7 Hari", rate: "5.20% APY" },
                    { id: 1, name: "30 Hari", rate: "6.00% APY" },
                    { id: 2, name: "90 Hari", rate: "7.10% APY" },
                    { id: 3, name: "365 Hari", rate: "8.50% APY" },
                  ].map((item) => (
                    <Link
                      key={item.id}
                      href={`/orderbook?tenor=${item.id}&side=0`}
                      className="p-3 rounded-xs bg-[#f6f7f5] hover:bg-[#e8ebe6] border border-stone-200 transition-colors block group"
                    >
                      <div className="text-xs font-black text-[#0e0f0c] group-hover:text-[#163300]">
                        {item.name}
                      </div>
                      <div className="text-[11px] font-mono text-[#2ead4b] font-bold mt-0.5">
                        {item.rate}
                      </div>
                    </Link>
                  ))}
                </div>
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
