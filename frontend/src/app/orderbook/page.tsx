"use client";

import { useState } from "react";
import Link from "next/link";
import { TenorSelector } from "@/components/orderbook/TenorSelector";
import { OrderBookTable } from "@/components/orderbook/OrderBookTable";
import { OrderPlacementForm } from "@/components/orderbook/OrderPlacementForm";
import { ConnectButton } from "@/components/wallet/ConnectButton";
import { FaucetButton } from "@/components/faucet/FaucetButton";

// Data kedalaman pasar per tenor bucket
const BUCKET_DEPTH_DATA: Record<
  number,
  {
    bids: { id: string; rateBps: number; amount: number; total: number }[];
    asks: { id: string; rateBps: number; amount: number; total: number }[];
  }
> = {
  0: {
    // 1 Minggu (Short)
    bids: [
      { id: "1w-b1", rateBps: 520, amount: 25000, total: 25000 },
      { id: "1w-b2", rateBps: 500, amount: 15000, total: 40000 },
    ],
    asks: [
      { id: "1w-a1", rateBps: 650, amount: 20000, total: 20000 },
      { id: "1w-a2", rateBps: 680, amount: 35000, total: 55000 },
    ],
  },
  1: {
    // 1 Bulan (Medium)
    bids: [
      { id: "1m-b1", rateBps: 600, amount: 50000, total: 50000 },
      { id: "1m-b2", rateBps: 575, amount: 30000, total: 80000 },
    ],
    asks: [
      { id: "1m-a1", rateBps: 720, amount: 45000, total: 45000 },
      { id: "1m-a2", rateBps: 760, amount: 60000, total: 105000 },
    ],
  },
  2: {
    // 3 Bulan (Long)
    bids: [
      { id: "3m-b1", rateBps: 710, amount: 80000, total: 80000 },
      { id: "3m-b2", rateBps: 680, amount: 40000, total: 120000 },
    ],
    asks: [
      { id: "3m-a1", rateBps: 840, amount: 50000, total: 50000 },
      { id: "3m-a2", rateBps: 890, amount: 75000, total: 125000 },
    ],
  },
  3: {
    // 1 Tahun (Extended)
    bids: [
      { id: "1y-b1", rateBps: 850, amount: 100000, total: 100000 },
      { id: "1y-b2", rateBps: 810, amount: 60000, total: 160000 },
    ],
    asks: [
      { id: "1y-a1", rateBps: 1000, amount: 70000, total: 70000 },
      { id: "1y-a2", rateBps: 1050, amount: 90000, total: 160000 },
    ],
  },
};

export default function OrderBookPage() {
  const [selectedTenor, setSelectedTenor] = useState<number>(0);

  const activeDepth = BUCKET_DEPTH_DATA[selectedTenor] ?? BUCKET_DEPTH_DATA[0];

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
          <Link href="/orderbook" className="text-white">
            Order Book
          </Link>
          <Link href="/positions" className="text-slate-400 hover:text-slate-200">
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
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 flex flex-col gap-6">
        {/* Tenor Selector Bar */}
        <div className="flex flex-col gap-2">
          <div className="text-xs font-semibold uppercase text-slate-400 tracking-wider">
            Pilih Tenor Bucket Kredit
          </div>
          <TenorSelector selectedTenor={selectedTenor} onSelectTenor={setSelectedTenor} />
        </div>

        {/* Grid: Order Book Depth vs Placement Form */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1">
          {/* Depth Chart & Order Book Table */}
          <div className="lg:col-span-7 flex flex-col min-h-115">
            <OrderBookTable bids={activeDepth.bids} asks={activeDepth.asks} />
          </div>

          {/* Action & Placement Form */}
          <div className="lg:col-span-5 flex flex-col">
            <OrderPlacementForm tenorId={selectedTenor} />
          </div>
        </div>
      </main>
    </div>
  );
}
