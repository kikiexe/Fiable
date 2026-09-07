"use client";

interface FallbackBadgeProps {
  isFallbackActive: boolean;
  spreadBps: number;
  fallbackRate: number;
}

export function FallbackBadge({ isFallbackActive, spreadBps, fallbackRate }: FallbackBadgeProps) {
  if (!isFallbackActive) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-medium">
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        CLOB Organik Aktif (Spread Kompetitif)
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs">
      <div className="flex items-center gap-2 text-amber-400 font-semibold">
        <span className="w-2 h-2 rounded-full bg-amber-400" />
        AMM Fallback Backstop Aktif
      </div>
      <p className="text-slate-300">
        Buku order organik tipis. Taker dieksekusi instan via pool likuiditas cadangan dengan estimasi rate{" "}
        <span className="font-bold text-white">{(fallbackRate / 100).toFixed(2)}%</span> (termasuk spread cadangan{" "}
        {(spreadBps / 100).toFixed(2)}%).
      </p>
    </div>
  );
}
