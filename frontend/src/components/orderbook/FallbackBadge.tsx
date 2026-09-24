"use client";

interface FallbackBadgeProps {
  isFallbackActive: boolean;
  spreadBps: number;
  fallbackRate: number;
}

export function FallbackBadge({ isFallbackActive, spreadBps, fallbackRate }: FallbackBadgeProps) {
  if (!isFallbackActive) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-xs bg-[#e2f6d5] border border-[#9fe870]/30 text-[#163300] text-xs font-bold">
        <span className="w-2 h-2 rounded-full bg-[#2ead4b]" />
        Antrean Pasar Aktif (Bunga Kompetitif)
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1 p-3 rounded-xs bg-[#ffd11a]/10 border border-[#ffd11a]/30 text-xs">
      <div className="flex items-center gap-2 text-[#0e0f0c] font-bold">
        <span className="w-2 h-2 rounded-full bg-[#ffd11a]" />
        Cadangan Dana Otomatis Aktif
      </div>
      <p className="text-[#454745]">
        Antrean penawaran pengguna lain sedang lengang. Transaksi Anda akan dipenuhi seketika melalui dana cadangan protokol dengan estimasi suku bunga{" "}
        <span className="font-bold text-[#0e0f0c]">{(fallbackRate / 100).toFixed(2)}%</span> (termasuk selisih bunga cadangan{" "}
        {(spreadBps / 100).toFixed(2)}%).
      </p>
    </div>
  );
}
