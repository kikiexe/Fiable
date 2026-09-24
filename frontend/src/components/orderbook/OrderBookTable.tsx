"use client";

import { useState } from "react";

interface OrderBookRow {
  id: string;
  rateBps: number;
  amount: number;
  total: number;
}

interface OrderBookTableProps {
  bids: OrderBookRow[];
  asks: OrderBookRow[];
  onSelectRate?: (ratePercent: string) => void;
  onSelectAmount?: (amount: string) => void;
}

type ViewMode = "both" | "asks" | "bids";

export function OrderBookTable({ bids, asks, onSelectRate, onSelectAmount }: OrderBookTableProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("both");
  const [activeRowId, setActiveRowId] = useState<string | null>(null);

  const maxTotal = Math.max(
    ...asks.map((a) => a.total),
    ...bids.map((b) => b.total),
    1
  );

  const bestBid = bids.length > 0 ? bids[0].rateBps : 0;
  const bestAsk = asks.length > 0 ? asks[0].rateBps : 0;
  const spreadBps = bestAsk > 0 && bestBid > 0 ? bestAsk - bestBid : 0;
  const midRate = bestAsk > 0 && bestBid > 0 ? (bestAsk + bestBid) / 2 : bestBid || bestAsk;

  const totalBidVolume = bids.reduce((acc, row) => acc + row.amount, 0);
  const totalAskVolume = asks.reduce((acc, row) => acc + row.amount, 0);

  const handleRowClick = (id: string, rateBps: number, amount: number) => {
    setActiveRowId(id);
    if (onSelectRate) {
      onSelectRate((rateBps / 100).toFixed(2));
    }
    if (onSelectAmount) {
      onSelectAmount(amount.toString());
    }
  };

  const showAsks = viewMode === "both" || viewMode === "asks";
  const showBids = viewMode === "both" || viewMode === "bids";

  return (
    <div className="flex flex-col h-full bg-white rounded-xs border border-stone-200 p-5 shadow-xs">
      {/* Table Header & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-stone-200">
        <div className="flex items-center gap-2.5">
          <span className="w-2 h-2 rounded-full bg-[#2ead4b]" />
          <span className="text-xs font-black uppercase tracking-wider text-[#0e0f0c]">
            Buku Penawaran Pasar
          </span>
          <span className="text-[10px] font-mono text-[#868685] bg-[#f6f7f5] px-2 py-0.5 rounded-2xs border border-stone-200">
            Urut Waktu
          </span>
        </div>

        {/* View Mode Filters */}
        <div className="flex items-center gap-1 p-0.5 bg-[#e8ebe6] rounded-xs text-[11px] font-bold">
          <button
            type="button"
            onClick={() => setViewMode("both")}
            className={`px-2.5 py-1 rounded-xs transition-colors cursor-pointer ${
              viewMode === "both" ? "bg-[#0e0f0c] text-white shadow-xs" : "text-[#454745] hover:text-[#0e0f0c]"
            }`}
          >
            Semua
          </button>
          <button
            type="button"
            onClick={() => setViewMode("asks")}
            className={`px-2.5 py-1 rounded-xs transition-colors cursor-pointer ${
              viewMode === "asks" ? "bg-[#0e0f0c] text-white shadow-xs" : "text-[#d03238] hover:text-[#0e0f0c]"
            }`}
          >
            Pinjam (Borrow)
          </button>
          <button
            type="button"
            onClick={() => setViewMode("bids")}
            className={`px-2.5 py-1 rounded-xs transition-colors cursor-pointer ${
              viewMode === "bids" ? "bg-[#0e0f0c] text-white shadow-xs" : "text-[#2ead4b] hover:text-[#0e0f0c]"
            }`}
          >
            Danai (Lend)
          </button>
        </div>
      </div>

      {/* Volume Summary Bar */}
      <div className="flex items-center justify-between py-2 text-[11px] font-mono border-b border-stone-100 text-[#868685]">
        <span>Total Kebutuhan Pinjaman: <strong className="text-[#0e0f0c]">{totalAskVolume.toLocaleString()} mUSDC</strong></span>
        <span>Total Ketersediaan Dana: <strong className="text-[#0e0f0c]">{totalBidVolume.toLocaleString()} mUSDC</strong></span>
      </div>

      {/* Columns Header */}
      <div className="grid grid-cols-3 pt-2.5 pb-1.5 text-[10px] font-bold text-[#868685] uppercase tracking-wider font-mono">
        <span>Suku Bunga (APY)</span>
        <span className="text-right">Nominal (mUSDC)</span>
        <span className="text-right">Akumulasi Dana</span>
      </div>

      <div className="flex flex-col flex-1 gap-1 py-1 overflow-y-auto font-mono text-xs">
        {/* Asks Section (Borrow Demand) */}
        {showAsks && (
          <div className="flex flex-col gap-0.5">
            <div className="text-[10px] font-bold text-[#d03238] uppercase tracking-wider py-1 flex items-center justify-between">
              <span>Permintaan Pinjaman (Borrow)</span>
              <span className="text-[9px] text-[#868685] font-normal">Pilih baris untuk menyalin</span>
            </div>
            {asks.length === 0 ? (
              <div className="text-xs text-[#868685] py-4 text-center font-sans bg-[#f6f7f5] rounded-xs border border-dashed border-stone-200">
                Belum ada antrean pinjaman pada durasi ini
              </div>
            ) : (
              asks.map((ask) => {
                const depthPercent = Math.min(100, Math.max(6, (ask.total / maxTotal) * 100));
                const isSelected = activeRowId === ask.id;
                return (
                  <button
                    key={ask.id}
                    type="button"
                    onClick={() => handleRowClick(ask.id, ask.rateBps, ask.amount)}
                    className={`relative grid grid-cols-3 text-xs py-2 px-2.5 rounded-xs overflow-hidden transition-all text-left cursor-pointer border ${
                      isSelected
                        ? "bg-red-50 border-red-300 ring-1 ring-red-400"
                        : "border-transparent hover:bg-red-50/70 hover:border-red-200"
                    }`}
                    title="Klik untuk memilih suku bunga dan nominal ini"
                  >
                    <div
                      className="absolute right-0 top-0 bottom-0 bg-[#d03238]/12 pointer-events-none transition-all duration-300"
                      style={{ width: `${depthPercent}%` }}
                    />
                    <span className="relative z-10 font-bold text-[#d03238]">
                      {(ask.rateBps / 100).toFixed(2)}%
                    </span>
                    <span className="relative z-10 text-[#0e0f0c] text-right font-semibold">
                      {ask.amount.toLocaleString()}
                    </span>
                    <span className="relative z-10 text-[#868685] text-right">
                      {ask.total.toLocaleString()}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        )}

        {/* Mid Rate & Spread Banner */}
        <div className="my-2.5 py-2.5 px-3 bg-[#e8ebe6] rounded-xs border border-stone-300 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#163300]">
              Bunga Rata-Rata:
            </span>
            <span className="font-black text-[#0e0f0c]">
              {(midRate / 100).toFixed(2)}% APY
            </span>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-[#454745]">
            <span>
              Selisih:{" "}
              <strong className="text-[#0e0f0c]">
                {spreadBps > 0 ? `${(spreadBps / 100).toFixed(2)}% (${spreadBps} bps)` : "0 bps"}
              </strong>
            </span>
            <span className="text-stone-400">|</span>
            <span className="text-[#163300] font-sans font-bold text-[10px] bg-white px-2 py-0.5 rounded-2xs border border-stone-200">
              Cadangan Siap
            </span>
          </div>
        </div>

        {/* Bids Section (Lend Supply) */}
        {showBids && (
          <div className="flex flex-col gap-0.5">
            <div className="text-[10px] font-bold text-[#2ead4b] uppercase tracking-wider py-1 flex items-center justify-between">
              <span>Ketersediaan Pendanaan (Lend)</span>
              <span className="text-[9px] text-[#868685] font-normal">Pilih baris untuk menyalin</span>
            </div>
            {bids.length === 0 ? (
              <div className="text-xs text-[#868685] py-4 text-center font-sans bg-[#f6f7f5] rounded-xs border border-dashed border-stone-200">
                Belum ada penawaran pendanaan pada durasi ini
              </div>
            ) : (
              bids.map((bid) => {
                const depthPercent = Math.min(100, Math.max(6, (bid.total / maxTotal) * 100));
                const isSelected = activeRowId === bid.id;
                return (
                  <button
                    key={bid.id}
                    type="button"
                    onClick={() => handleRowClick(bid.id, bid.rateBps, bid.amount)}
                    className={`relative grid grid-cols-3 text-xs py-2 px-2.5 rounded-xs overflow-hidden transition-all text-left cursor-pointer border ${
                      isSelected
                        ? "bg-emerald-50 border-emerald-300 ring-1 ring-emerald-400"
                        : "border-transparent hover:bg-emerald-50/70 hover:border-emerald-200"
                    }`}
                    title="Klik untuk memilih suku bunga dan nominal ini"
                  >
                    <div
                      className="absolute right-0 top-0 bottom-0 bg-[#2ead4b]/12 pointer-events-none transition-all duration-300"
                      style={{ width: `${depthPercent}%` }}
                    />
                    <span className="relative z-10 font-bold text-[#2ead4b]">
                      {(bid.rateBps / 100).toFixed(2)}%
                    </span>
                    <span className="relative z-10 text-[#0e0f0c] text-right font-semibold">
                      {bid.amount.toLocaleString()}
                    </span>
                    <span className="relative z-10 text-[#868685] text-right">
                      {bid.total.toLocaleString()}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}
