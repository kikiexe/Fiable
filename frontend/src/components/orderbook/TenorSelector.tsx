"use client";

import { TENOR_BUCKETS } from "@/lib/contracts";

interface TenorSelectorProps {
  selectedTenor: number;
  onSelectTenor: (tenorId: number) => void;
}

export function TenorSelector({ selectedTenor, onSelectTenor }: TenorSelectorProps) {
  return (
    <div className="flex gap-2 p-1.5 bg-[#1E293B] rounded-xl border border-slate-700/60">
      {TENOR_BUCKETS.map((bucket) => {
        const isSelected = selectedTenor === bucket.id;
        return (
          <button
            key={bucket.id}
            type="button"
            onClick={() => onSelectTenor(bucket.id)}
            className={`flex-1 py-2.5 px-4 rounded-lg font-medium text-sm transition-all ${
              isSelected
                ? "bg-[#2563EB] text-white shadow-lg shadow-blue-500/20"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
            }`}
          >
            <div className="font-semibold">{bucket.name}</div>
            <div className="text-xs opacity-75">{bucket.label} ({bucket.durationDays}h)</div>
          </button>
        );
      })}
    </div>
  );
}
