"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useReadContract } from "wagmi";
import { TenorSelector } from "@/components/orderbook/TenorSelector";
import { OrderBookTable } from "@/components/orderbook/OrderBookTable";
import { OrderPlacementForm } from "@/components/orderbook/OrderPlacementForm";
import { AppHeader } from "@/components/AppHeader";
import { useOrderBook } from "@/hooks/useOrderBook";
import { CONTRACT_ADDRESSES, ERC20_ABI, formatUSDC } from "@/lib/contracts";

function OrderBookContent() {
  const searchParams = useSearchParams();
  const queryTenor = Number(searchParams.get("tenor"));
  const initialTenor = !isNaN(queryTenor) && queryTenor >= 0 && queryTenor <= 3 ? queryTenor : 0;
  const initialSideParam = searchParams.get("side") === "1" ? ("borrow" as const) : ("lend" as const);

  const [selectedTenor, setSelectedTenor] = useState<number>(initialTenor);
  const [selectedRate, setSelectedRate] = useState<string>("");
  const [selectedAmount, setSelectedAmount] = useState<string>("");

  const { bids, asks } = useOrderBook(selectedTenor);

  const { data: ammReserveBalance } = useReadContract({
    address: CONTRACT_ADDRESSES.mockUSDC,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: [CONTRACT_ADDRESSES.ammFallback],
  });

  const reserveText = typeof ammReserveBalance === "bigint"
    ? `${formatUSDC(ammReserveBalance)} mUSDC`
    : "400.000 mUSDC";

  return (
    <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8 flex flex-col gap-6">
      {/* Title & Market Indicator */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-3 pb-2 border-b border-stone-200">
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-mono font-black tracking-widest uppercase text-[#163300]">
            PASAR PINJAMAN MONAD
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-[#0e0f0c] tracking-tight">
            Daftar Penawaran Pinjaman & Pendanaan
          </h1>
          <p className="text-xs text-[#454745]">
            Tempat peminjam dan pendana saling menyepakati suku bunga secara langsung tanpa potongan perantara.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="px-2.5 py-1 rounded-xs bg-[#e2f6d5] text-[#163300] font-bold border border-[#9fe870]/40">
            Cadangan Otomatis: {reserveText}
          </span>
        </div>
      </div>

      {/* Tenor Selector */}
      <div className="flex flex-col gap-2">
        <div className="text-[10px] font-bold uppercase text-[#868685] tracking-wider">
          Pilih Jangka Waktu Pinjaman
        </div>
        <TenorSelector selectedTenor={selectedTenor} onSelectTenor={setSelectedTenor} />
      </div>

      {/* Order Book + Form Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 flex-1 items-start">
        <div className="lg:col-span-7 flex flex-col min-h-[500px]">
          <OrderBookTable
            bids={bids}
            asks={asks}
            onSelectRate={setSelectedRate}
            onSelectAmount={setSelectedAmount}
          />
        </div>
        <div className="lg:col-span-5 flex flex-col">
          <OrderPlacementForm
            key={`${selectedTenor}-${selectedRate}-${selectedAmount}`}
            tenorId={selectedTenor}
            initialRate={selectedRate}
            initialAmount={selectedAmount}
            initialSide={initialSideParam}
          />
        </div>
      </div>
    </div>
  );
}

export default function OrderBookPage() {
  return (
    <div className="min-h-screen bg-[#e8ebe6] text-[#0e0f0c] flex flex-col">
      <AppHeader />
      <Suspense fallback={
        <div className="flex-1 flex items-center justify-center py-24 text-xs font-mono text-[#868685]">
          Memuat pasar pinjaman...
        </div>
      }>
        <OrderBookContent />
      </Suspense>
    </div>
  );
}
