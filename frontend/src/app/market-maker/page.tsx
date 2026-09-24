"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { usePrivy } from "@privy-io/react-auth";
import { ConnectButton } from "@/components/wallet/ConnectButton";
import { AppHeader } from "@/components/AppHeader";
import { useMiningReward } from "@/hooks/useMiningReward";
import { formatUSDC } from "@/lib/contracts";

export default function MarketMakerPage() {
  const { authenticated } = usePrivy();
  const { address } = useAccount();
  const { data, isLoading } = useMiningReward(address);

  const [simSpreadBps, setSimSpreadBps] = useState<number>(30);
  const [simHoldingPct, setSimHoldingPct] = useState<number>(80);
  const [simVolume, setSimVolume] = useState<number>(10000);

  const totalWeighted = data?.totalWeightedVolume ?? BigInt(0);
  const matchCount = data?.matchCount ?? 0;
  const matchRecords = data?.matchRecords ?? [];
  const rewardAccruals = data?.rewardAccruals ?? [];

  // WashTradingGuard Mathematical Formulation
  const isHoldingQualified = simHoldingPct >= 50;
  const spreadDecayFactor = Math.max(0, 1 - Math.pow(simSpreadBps / 300, 2));
  const effectiveMultiplier = isHoldingQualified ? spreadDecayFactor * (simHoldingPct / 100) : 0;
  const estimatedWeightedVolume = Math.round(simVolume * effectiveMultiplier);

  return (
    <div className="min-h-screen bg-[#e8ebe6] text-[#0e0f0c] flex flex-col">
      <AppHeader />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-8 flex flex-col gap-6">
        <div>
          <span className="text-[10px] font-mono font-black tracking-widest uppercase text-[#163300]">PROGRAM IMBALAN</span>
          <h1 className="text-2xl sm:text-3xl font-black text-[#0e0f0c] tracking-tight">
            Ringkasan Imbalan Penyedia Dana
          </h1>
          <p className="text-xs text-[#454745] mt-1">
            Sistem penghargaan bagi penyedia dana dengan proteksi keamanan transaksi otomatis.
          </p>
        </div>

        {!authenticated || !address ? (
          <div className="flex flex-col items-center justify-center gap-4 py-24 text-center rounded-xs bg-white border border-stone-200">
            <p className="text-[#454745] text-sm max-w-md">
              Hubungkan dompet untuk melihat perolehan imbalan, aktivitas transaksi, dan riwayat kecocokan penawaran Anda.
            </p>
            <ConnectButton />
          </div>
        ) : (
          <>
            {/* Top Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-5 rounded-xs bg-white border border-stone-200 flex flex-col justify-between shadow-xs">
                <div>
                  <div className="text-[10px] font-bold text-[#868685] uppercase tracking-wider">
                    Total Poin Imbalan Efektif
                  </div>
                  <div className="text-2xl font-black font-mono text-[#2ead4b] mt-2">
                    {formatUSDC(totalWeighted)} mUSDC
                  </div>
                </div>
                <div className="text-[11px] text-[#868685] mt-3">
                  Poin terhitung berdasarkan kejujuran transaksi
                </div>
              </div>

              <div className="p-5 rounded-xs bg-white border border-stone-200 flex flex-col justify-between shadow-xs">
                <div>
                  <div className="text-[10px] font-bold text-[#868685] uppercase tracking-wider">
                    Transaksi Dicocokkan
                  </div>
                  <div className="text-2xl font-black font-mono text-[#0e0f0c] mt-2">
                    {matchCount} Transaksi
                  </div>
                </div>
                <div className="text-[11px] text-[#868685] mt-3">
                  Kesepakatan langsung antar pengguna
                </div>
              </div>

              <div className="p-5 rounded-xs bg-white border border-stone-200 flex flex-col justify-between shadow-xs">
                <div>
                  <div className="text-[10px] font-bold text-[#868685] uppercase tracking-wider">
                    Perlindungan Anti-Manipulasi
                  </div>
                  <div className="text-base font-black text-[#2ead4b] mt-2 flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-[#2ead4b]" />
                    Proteksi Aktif
                  </div>
                </div>
                <div className="text-[11px] text-[#868685] mt-3">
                  Pemeriksaan durasi simpan dan kewajaran bunga
                </div>
              </div>
            </div>

            {/* Interactive Mining Multiplier Simulator */}
            <div className="p-6 rounded-xs bg-white border border-stone-200 shadow-xs flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 pb-3 border-b border-stone-100">
                <div>
                  <span className="text-[10px] font-mono font-bold uppercase text-[#163300] tracking-wider">
                    SIMULASI IMBALAN
                  </span>
                  <h2 className="text-base font-black text-[#0e0f0c]">
                    Simulasi Perhitungan Poin Imbalan
                  </h2>
                </div>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-xs bg-[#e2f6d5] text-[#163300] border border-[#9fe870]/30">
                  Rumus Keamanan Pasar
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
                <div className="flex flex-col gap-4 md:col-span-2">
                  {/* Spread Slider */}
                  <div>
                    <div className="flex justify-between items-center text-xs font-mono mb-1.5">
                      <span className="text-[#454745] font-bold">Selisih Bunga vs Bunga Pasar:</span>
                      <span className="font-black text-[#0e0f0c]">{simSpreadBps} bps ({(simSpreadBps / 100).toFixed(2)}%)</span>
                    </div>
                    <input
                      type="range"
                      min="5"
                      max="300"
                      step="5"
                      value={simSpreadBps}
                      onChange={(e) => setSimSpreadBps(Number(e.target.value))}
                      className="w-full h-2 bg-stone-200 rounded-xs appearance-none cursor-pointer accent-[#0e0f0c]"
                    />
                    <div className="flex justify-between text-[10px] text-[#868685] font-mono mt-1">
                      <span>5 bps (Sesuai bunga wajar)</span>
                      <span>300 bps (Batas penalti maksimal)</span>
                    </div>
                  </div>

                  {/* Holding Duration Slider */}
                  <div>
                    <div className="flex justify-between items-center text-xs font-mono mb-1.5">
                      <span className="text-[#454745] font-bold">Waktu Dana Dibiarkan Aktif:</span>
                      <span className="font-black text-[#0e0f0c]">{simHoldingPct}%</span>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="100"
                      step="5"
                      value={simHoldingPct}
                      onChange={(e) => setSimHoldingPct(Number(e.target.value))}
                      className="w-full h-2 bg-stone-200 rounded-xs appearance-none cursor-pointer accent-[#163300]"
                    />
                    <div className="flex justify-between text-[10px] text-[#868685] font-mono mt-1">
                      <span className="text-red-500">&lt; 50% durasi (0 Poin Imbalan)</span>
                      <span className="text-[#2ead4b]">50% hingga 100% (Berhak Dapat Poin)</span>
                    </div>
                  </div>

                  {/* Volume Presets */}
                  <div>
                    <div className="flex justify-between items-center text-xs font-mono mb-1.5">
                      <span className="text-[#454745] font-bold">Simulasi Jumlah Dana Terpasang:</span>
                      <span className="font-black text-[#0e0f0c]">{simVolume.toLocaleString()} mUSDC</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {[2500, 5000, 10000, 25000, 50000].map((val) => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setSimVolume(val)}
                          className={`px-2.5 py-1 text-xs font-mono font-bold rounded-xs transition-colors cursor-pointer ${
                            simVolume === val
                              ? "bg-[#0e0f0c] text-white"
                              : "bg-[#e8ebe6] hover:bg-stone-300 text-[#454745]"
                          }`}
                        >
                          {val >= 1000 ? `${val / 1000}k` : val}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Simulation Result Card */}
                <div className="p-4 rounded-xs bg-[#f6f7f5] border border-stone-200 flex flex-col gap-3">
                  <div className="text-[10px] font-mono font-bold uppercase text-[#868685] tracking-wider">
                    Hasil Simulasi
                  </div>
                  <div>
                    <div className="text-xs text-[#454745]">Syarat Waktu Minimal:</div>
                    <div className={`font-mono font-black text-sm mt-0.5 ${isHoldingQualified ? "text-[#2ead4b]" : "text-[#d03238]"}`}>
                      {isHoldingQualified ? "[Memenuhi Syarat (>= 50%)]" : "[Belum Memenuhi Syarat (< 50%)]"}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-[#454745]">Pengali Poin:</div>
                    <div className="font-mono font-black text-xl text-[#0e0f0c] mt-0.5">
                      {(effectiveMultiplier * 100).toFixed(1)}%
                    </div>
                  </div>
                  <div className="pt-2 border-t border-stone-200">
                    <div className="text-xs text-[#454745]">Estimasi Poin Imbalan:</div>
                    <div className="font-mono font-black text-lg text-[#163300] mt-0.5">
                      {estimatedWeightedVolume.toLocaleString()} mUSDC
                    </div>
                    <div className="text-[10px] text-[#868685] mt-0.5">
                      Dari dana terpasang: {simVolume.toLocaleString()} mUSDC
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Anti-Wash Mechanics Explanation */}
            <div className="p-5 rounded-xs bg-white border border-stone-200 flex flex-col gap-3 shadow-xs">
              <div className="text-xs font-black text-[#0e0f0c] uppercase tracking-wider font-mono">
                Cara Kerja Keamanan Pasar
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-[#454745]">
                <div className="p-3.5 rounded-xs bg-[#f6f7f5] border border-stone-200">
                  <div className="font-bold text-[#0e0f0c] mb-1">
                    Batas Minimal Waktu Penyimpanan Dana
                  </div>
                  <p className="leading-relaxed">
                    Dana wajib dibiarkan aktif minimal 50% dari jangka waktu pinjaman. Pencairan sebelum batas tersebut menghasilkan 0 poin imbalan, guna mencegah manipulasi transaksi palsu.
                  </p>
                </div>
                <div className="p-3.5 rounded-xs bg-[#f6f7f5] border border-stone-200">
                  <div className="font-bold text-[#0e0f0c] mb-1">
                    Kewajaran Suku Bunga Pasar
                  </div>
                  <p className="leading-relaxed">
                    Suku bunga yang ditawarkan terlalu jauh dari rata-rata pasar akan terkena penalti poin. Hal ini memastikan imbalan hanya diberikan kepada pihak yang menawarkan bunga wajar.
                  </p>
                </div>
              </div>
            </div>

            {/* Match Records Table */}
            <div className="flex flex-col gap-3">
              <div className="flex justify-between items-center">
                <h2 className="text-base font-black text-[#0e0f0c]">
                  Riwayat Transaksi Langsung
                </h2>
                <span className="text-[10px] text-[#868685] font-mono font-bold">
                  Tercatat di Blockchain
                </span>
              </div>

              {isLoading ? (
                <div className="py-12 text-center text-[#868685] text-sm">
                  Memuat riwayat transaksi...
                </div>
              ) : matchRecords.length === 0 ? (
                <div className="py-12 text-center rounded-xs bg-white border border-stone-200 flex flex-col items-center gap-2">
                  <p className="text-[#454745] text-sm">
                    Belum ada riwayat transaksi langsung untuk dompet ini.
                  </p>
                  <p className="text-[10px] text-[#868685]">
                    Pasang penawaran di Buku Penawaran untuk mendapatkan imbalan.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xs border border-stone-200 bg-white">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#f6f7f5] text-[#868685] uppercase tracking-wider text-[10px] border-b border-stone-200 font-mono">
                      <tr>
                        <th className="p-3 font-bold">Posisi</th>
                        <th className="p-3 font-bold">Peran</th>
                        <th className="p-3 font-bold">Nominal</th>
                        <th className="p-3 font-bold">Bunga Disepakati</th>
                        <th className="p-3 font-bold">Bunga Rata-Rata Pasar</th>
                        <th className="p-3 font-bold">Waktu</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100 font-mono">
                      {matchRecords.map((m) => {
                        const isLender =
                          m.lender.toLowerCase() === address.toLowerCase();
                        return (
                          <tr key={m.id} className="hover:bg-stone-50 transition-colors">
                            <td className="p-3 font-bold text-[#0e0f0c]">
                              #{m.positionId}
                            </td>
                            <td className="p-3">
                              <span
                                className={`px-2 py-0.5 rounded-xs text-[10px] font-bold ${
                                  isLender
                                    ? "bg-[#e2f6d5] text-[#163300]"
                                    : "bg-stone-200 text-[#0e0f0c]"
                                }`}
                              >
                                {isLender ? "Pendana" : "Peminjam"}
                              </span>
                            </td>
                            <td className="p-3 text-[#0e0f0c]">
                              {formatUSDC(BigInt(m.matchedAmount))} mUSDC
                            </td>
                            <td className="p-3 text-[#2ead4b] font-bold">
                              {(Number(m.executionRate) / 100).toFixed(2)}% APY
                            </td>
                            <td className="p-3 text-[#868685]">
                              {(Number(m.twapRateAtMatch) / 100).toFixed(2)}% APY
                            </td>
                            <td className="p-3 text-[#868685]">
                              {new Date(Number(m.timestamp) * 1000).toLocaleString("id-ID", {
                                dateStyle: "short",
                                timeStyle: "short",
                              })}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Accrued Rewards */}
            {rewardAccruals.length > 0 && (
              <div className="flex flex-col gap-3">
                <h2 className="text-base font-black text-[#0e0f0c]">
                  Riwayat Pengambilan Imbalan
                </h2>
                <div className="overflow-x-auto rounded-xs border border-stone-200 bg-white">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#f6f7f5] text-[#868685] uppercase tracking-wider text-[10px] border-b border-stone-200 font-mono">
                      <tr>
                        <th className="p-3 font-bold">Posisi</th>
                        <th className="p-3 font-bold">Poin Imbalan</th>
                        <th className="p-3 font-bold">Waktu Pengambilan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100 font-mono">
                      {rewardAccruals.map((r) => (
                        <tr key={r.id} className="hover:bg-stone-50 transition-colors">
                          <td className="p-3 text-[#0e0f0c] font-bold">#{r.positionId}</td>
                          <td className="p-3 text-[#2ead4b] font-bold">
                            {formatUSDC(BigInt(r.weightedVolume))} mUSDC
                          </td>
                          <td className="p-3 text-[#868685]">
                            {new Date(Number(r.timestamp) * 1000).toLocaleString("id-ID", {
                              dateStyle: "short",
                              timeStyle: "short",
                            })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
