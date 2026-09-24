"use client";

import { TENOR_BUCKETS } from "@/lib/contracts";

interface TenorSelectorProps {
  selectedTenor: number;
  onSelectTenor: (tenorId: number) => void;
}

export function TenorSelector({ selectedTenor, onSelectTenor }: TenorSelectorProps) {
  return (
    <div
      role="tablist"
      aria-label="Pilihan Jangka Waktu Pinjaman"
      className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-1.5 bg-white rounded-xs border border-stone-200"
    >
      {TENOR_BUCKETS.map((bucket) => {
        const isSelected = selectedTenor === bucket.id;
        return (
          <button
            key={bucket.id}
            role="tab"
            aria-selected={isSelected}
            type="button"
            onClick={() => onSelectTenor(bucket.id)}
            className={`flex flex-col items-start p-3 rounded-xs transition-all cursor-pointer min-h-[48px] text-left border ${
              isSelected
                ? "bg-[#0e0f0c] text-white border-[#0e0f0c] shadow-xs"
                : "bg-[#f6f7f5] text-[#454745] border-transparent hover:border-stone-300 hover:bg-[#e8ebe6]"
            }`}
          >
            <div className="flex items-center justify-between w-full">
              <span className={`text-xs font-black tracking-tight ${isSelected ? "text-white" : "text-[#0e0f0c]"}`}>
                {bucket.name}
              </span>
              <span
                className={`text-[9px] font-mono px-1.5 py-0.5 rounded-2xs font-bold ${
                  isSelected ? "bg-[#9fe870] text-[#0e0f0c]" : "bg-stone-200 text-[#454745]"
                }`}
              >
                {bucket.label}
              </span>
            </div>
            <div className="mt-1 flex items-center justify-between w-full text-[11px] font-mono">
              <span className={isSelected ? "text-stone-300" : "text-[#868685]"}>
                {bucket.durationDays} Hari
              </span>
              {isSelected && (
                <span className="w-1.5 h-1.5 rounded-full bg-[#9fe870]" />
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
