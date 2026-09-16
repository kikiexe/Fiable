"use client";

import Link from "next/link";
import { useAccount } from "wagmi";
import { usePrivy } from "@privy-io/react-auth";
import { ConnectButton } from "@/components/wallet/ConnectButton";
import { FaucetButton } from "@/components/faucet/FaucetButton";
import { useMiningReward } from "@/hooks/useMiningReward";
import { formatUSDC } from "@/lib/contracts";

export default function MarketMakerPage() {
  const { authenticated } = usePrivy();
  const { address } = useAccount();
  const { data, isLoading } = useMiningReward(address);

  const totalWeighted = data?.totalWeightedVolume ?? BigInt(0);
  const matchCount = data?.matchCount ?? 0;
  const matchRecords = data?.matchRecords ?? [];
  const rewardAccruals = data?.rewardAccruals ?? [];

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
          <Link href="/positions" className="text-slate-400 hover:text-slate-200">
            Posisi Aktif
          </Link>
          <Link href="/market-maker" className="text-white font-semibold">
            Market Maker
          </Link>
          <FaucetButton />
          <ConnectButton />
        </nav>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-6 flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold text-white">
            Dashboard Market Maker & Liquidity Mining
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Program Matched-Volume Mining berbasis WashTradingGuard & Envio HyperIndex di Monad.
          </p>
        </div>

        {!authenticated || !address ? (
          <div className="flex flex-col items-center justify-center gap-4 py-24 text-center rounded-2xl bg-slate-900/40 border border-slate-800">
            <p className="text-slate-400 text-sm max-w-md">
              Hubungkan wallet Anda untuk melihat metrik liquidity mining, volume terbobot (weighted volume), dan riwayat match organik.
            </p>
            <ConnectButton />
          </div>
        ) : (
          <>
            {/* Top Metric Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between">
                <div>
                  <div className="text-xs text-slate-400 uppercase tracking-wider font-semibold">
                    Total Weighted Volume Anda
                  </div>
                  <div className="text-2xl font-bold font-mono text-emerald-400 mt-2">
                    {formatUSDC(totalWeighted)} mUSDC
                  </div>
                </div>
                <div className="text-[11px] text-slate-500 mt-3">
                  Volume efektif terverifikasi onchain via WashTradingGuard
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between">
                <div>
                  <div className="text-xs text-slate-400 uppercase tracking-wider font-semibold">
                    Total Match Organik Tercatat
                  </div>
                  <div className="text-2xl font-bold font-mono text-white mt-2">
                    {matchCount} Matches
                  </div>
                </div>
                <div className="text-[11px] text-slate-500 mt-3">
                  Match CLOB antar pengguna terindeks oleh Envio HyperIndex
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between">
                <div>
                  <div className="text-xs text-slate-400 uppercase tracking-wider font-semibold">
                    Status Wash Trading Guard
                  </div>
                  <div className="text-base font-bold text-blue-400 mt-2 flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                    Proteksi Aktif 100%
                  </div>
                </div>
                <div className="text-[11px] text-slate-500 mt-3">
                  Holding period weighting + TWAP spread decay
                </div>
              </div>
            </div>

            {/* Wash Trading Guard Explanation Banner */}
            <div className="p-5 rounded-2xl bg-indigo-950/20 border border-indigo-500/20 flex flex-col gap-3">
              <div className="text-sm font-semibold text-indigo-300">
                Mekanisme Anti-Wash Trading: Mengapa Volume Fieble Berkualitas Tinggi?
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-300">
                <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                  <div className="font-semibold text-white mb-1">
                    1. Holding Period Weighting
                  </div>
                  <p className="text-slate-400 leading-relaxed">
                    Setiap posisi kredit wajib ditahan minimal 50% dari durasi tenor (contoh: 3.5 hari untuk bucket 1 Minggu). Klaim sebelum batas minimum menghasilkan weighted volume 0.
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                  <div className="font-semibold text-white mb-1">
                    2. TWAP Spread Decay
                  </div>
                  <p className="text-slate-400 leading-relaxed">
                    Tingkat suku bunga match dibandingkan dengan TWAP AMM fallback secara real-time. Deviasi suku bunga dari konsensus pasar memicu penalti kuadratik, mencegah spoofing order di luar harga wajar.
                  </p>
                </div>
              </div>
            </div>

            {/* Indexed Match Records Table */}
            <div className="flex flex-col gap-3">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-bold text-white">
                  Riwayat Match CLOB Organik Anda
                </h2>
                <span className="text-xs text-slate-400">
                  Sumber: Envio HyperIndex GraphQL
                </span>
              </div>

              {isLoading ? (
                <div className="py-12 text-center text-slate-500 text-sm">
                  Memuat riwayat match dari Envio...
                </div>
              ) : matchRecords.length === 0 ? (
                <div className="py-12 text-center rounded-2xl bg-slate-900/30 border border-slate-800 flex flex-col items-center gap-2">
                  <p className="text-slate-400 text-sm">
                    Belum ada riwayat match CLOB yang melibatkan wallet ini.
                  </p>
                  <p className="text-xs text-slate-500">
                    Pasang limit order dua sisi di Order Book untuk mendapatkan reward liquidity mining.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-800">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-900/80 text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-800">
                      <tr>
                        <th className="p-3">Posisi</th>
                        <th className="p-3">Peran</th>
                        <th className="p-3">Nominal Matched</th>
                        <th className="p-3">Suku Bunga Eksekusi</th>
                        <th className="p-3">TWAP AMM</th>
                        <th className="p-3">Waktu Match</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 font-mono">
                      {matchRecords.map((m) => {
                        const isLender =
                          m.lender.toLowerCase() === address.toLowerCase();
                        return (
                          <tr key={m.id} className="hover:bg-slate-800/40">
                            <td className="p-3 font-semibold text-white">
                              #{m.positionId}
                            </td>
                            <td className="p-3">
                              <span
                                className={`px-2 py-0.5 rounded text-[11px] ${
                                  isLender
                                    ? "bg-emerald-500/10 text-emerald-400"
                                    : "bg-blue-500/10 text-blue-400"
                                }`}
                              >
                                {isLender ? "Lender" : "Borrower"}
                              </span>
                            </td>
                            <td className="p-3 text-slate-200">
                              {formatUSDC(BigInt(m.matchedAmount))} mUSDC
                            </td>
                            <td className="p-3 text-emerald-400">
                              {(Number(m.executionRate) / 100).toFixed(2)}% APY
                            </td>
                            <td className="p-3 text-slate-400">
                              {(Number(m.twapRateAtMatch) / 100).toFixed(2)}% APY
                            </td>
                            <td className="p-3 text-slate-400">
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

            {/* Accrued Rewards List */}
            {rewardAccruals.length > 0 && (
              <div className="flex flex-col gap-3">
                <h2 className="text-lg font-bold text-white">
                  Event Klaim Reward Tercatat (RewardAccrued)
                </h2>
                <div className="overflow-x-auto rounded-xl border border-slate-800">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-900/80 text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-800">
                      <tr>
                        <th className="p-3">Posisi</th>
                        <th className="p-3">Weighted Volume Terakreditasi</th>
                        <th className="p-3">Waktu Klaim</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 font-mono">
                      {rewardAccruals.map((r) => (
                        <tr key={r.id} className="hover:bg-slate-800/40">
                          <td className="p-3 text-white">#{r.positionId}</td>
                          <td className="p-3 text-emerald-400 font-bold">
                            {formatUSDC(BigInt(r.weightedVolume))} mUSDC
                          </td>
                          <td className="p-3 text-slate-400">
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
