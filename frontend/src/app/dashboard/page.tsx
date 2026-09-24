"use client";

import Link from "next/link";
import { useAccount } from "wagmi";
import { usePrivy } from "@privy-io/react-auth";
import { ConnectButton } from "@/components/wallet/ConnectButton";
import { FaucetButton } from "@/components/faucet/FaucetButton";
import { useProtocolFee } from "@/hooks/useProtocolFee";
import { usePositions } from "@/hooks/usePositions";
import { useMiningReward } from "@/hooks/useMiningReward";
import { formatUSDC } from "@/lib/contracts";

export default function DashboardPage() {
  const { authenticated } = usePrivy();
  const { address } = useAccount();

  const { feePercent, feeBps } = useProtocolFee(0);
  const { data: positionsData, isLoading: isPositionsLoading } = usePositions(address);
  const { data: miningData, isLoading: isMiningLoading } = useMiningReward(address);

  const asLender = positionsData?.asLender ?? [];
  const asBorrower = positionsData?.asBorrower ?? [];
  const totalPositionsCount = asLender.length + asBorrower.length;
  const totalWeightedVolume = miningData?.totalWeightedVolume ?? BigInt(0);

  return (
    <div className="min-h-screen bg-[#090D16] text-slate-100 flex flex-col font-sans">
      {/* Top Banner */}
      <div className="bg-[#0D1424] border-b border-slate-800/80 px-4 py-2 text-center text-xs text-slate-400">
        <span className="font-semibold text-slate-300">Monad Testnet (Chain ID 10143)</span>
        <span className="mx-2">&bull;</span>
        <span>Protokol kredit fixed-rate 100% onchain pertama di Monad</span>
      </div>

      {/* Header */}
      <header className="border-b border-slate-800 bg-[#090D16]/90 backdrop-blur sticky top-0 z-50 px-6 sm:px-8 py-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-xl font-black text-white tracking-tight hover:text-slate-200 transition-colors">
            Fieble
          </Link>
          <span className="text-[11px] px-2.5 py-0.5 rounded-md bg-[#D4FF00]/10 text-[#D4FF00] font-mono font-medium border border-[#D4FF00]/20">
            v1.0 Testnet
          </span>
        </div>

        <nav className="flex items-center gap-4 text-xs sm:text-sm font-medium">
          <Link href="/dashboard" className="text-white font-semibold">
            Dashboard
          </Link>
          <Link href="/orderbook" className="text-slate-400 hover:text-slate-200 transition-colors">
            Order Book
          </Link>
          <Link href="/positions" className="text-slate-400 hover:text-slate-200 transition-colors">
            Posisi Aktif
          </Link>
          <Link href="/market-maker" className="text-slate-400 hover:text-slate-200 transition-colors">
            Market Maker
          </Link>
          <FaucetButton />
          <ConnectButton />
        </nav>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-6 sm:p-8 flex flex-col gap-8">
        {/* Welcome Header */}
        <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-4 pb-6 border-b border-slate-800">
          <div>
            <div className="text-xs font-mono text-[#D4FF00] uppercase tracking-wider mb-1">
              Pusat Kendali Protokol
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Dashboard Pasar Kredit Fieble
            </h1>
            <p className="text-sm text-slate-400 mt-1 max-w-xl">
              Pantau status likuiditas protokol, kelola posisi kredit berjalan, dan monitor imbal hasil Matched-Volume Mining onchain.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/orderbook"
              className="px-5 py-2.5 rounded-lg bg-[#D4FF00] text-slate-950 font-bold text-xs hover:bg-[#bce400] transition-colors"
            >
              + Buka Order Baru
            </Link>
          </div>
        </div>

        {/* Protocol Overview Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between">
            <div>
              <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
                Protocol Fee Dinamis
              </div>
              <div className="text-2xl font-bold font-mono text-white mt-1">
                {feePercent.toFixed(2)}%
              </div>
            </div>
            <div className="text-[11px] text-slate-500 mt-3 flex items-center justify-between">
              <span>{feeBps !== undefined ? `${feeBps.toString()} bps` : "15 bps"}</span>
              <span className="text-[#D4FF00] font-mono">Chainlink CRE</span>
            </div>
          </div>

          <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between">
            <div>
              <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
                Likuiditas Cadangan AMM
              </div>
              <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">
                400,000 mUSDC
              </div>
            </div>
            <div className="text-[11px] text-slate-500 mt-3 flex items-center justify-between">
              <span>4 Tenor Buckets</span>
              <span className="text-emerald-400">100k / bucket</span>
            </div>
          </div>

          <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between">
            <div>
              <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
                Posisi Kredit Anda
              </div>
              <div className="text-2xl font-bold font-mono text-white mt-1">
                {authenticated && address ? (
                  isPositionsLoading ? "..." : `${totalPositionsCount} Posisi`
                ) : (
                  "Wallet Offline"
                )}
              </div>
            </div>
            <div className="text-[11px] text-slate-500 mt-3 flex items-center justify-between">
              <span>{asLender.length} Lend &bull; {asBorrower.length} Borrow</span>
              <Link href="/positions" className="text-blue-400 hover:underline">
                Rincian &rarr;
              </Link>
            </div>
          </div>

          <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between">
            <div>
              <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
                Weighted Volume MM
              </div>
              <div className="text-2xl font-bold font-mono text-[#D4FF00] mt-1">
                {authenticated && address ? (
                  isMiningLoading ? "..." : `${formatUSDC(totalWeightedVolume)} mUSDC`
                ) : (
                  "0.00 mUSDC"
                )}
              </div>
            </div>
            <div className="text-[11px] text-slate-500 mt-3 flex items-center justify-between">
              <span>WashTradingGuard</span>
              <Link href="/market-maker" className="text-[#D4FF00] hover:underline">
                Mining &rarr;
              </Link>
            </div>
          </div>
        </div>

        {/* 3 Action Pillars */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Pillar 1: Order Book */}
          <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 hover:border-slate-700 transition-colors flex flex-col justify-between">
            <div className="flex flex-col gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 font-bold font-mono text-sm">
                01
              </div>
              <h2 className="text-lg font-bold text-white">
                Buku Order Kredit (CLOB Engine)
              </h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                Tentukan suku bunga APY Anda sendiri dan pasang limit order pinjaman untuk 4 bucket tenor (1W, 1M, 3M, 1Y). Jika pesanan belum matched di buku order, AMM Fallback pool siap mengeksekusi secara instan.
              </p>
            </div>
            <div className="pt-6">
              <Link
                href="/orderbook"
                className="w-full inline-flex justify-center items-center py-2.5 px-4 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition-colors"
              >
                Buka Order Book &rarr;
              </Link>
            </div>
          </div>

          {/* Pillar 2: Active Positions */}
          <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 hover:border-slate-700 transition-colors flex flex-col justify-between">
            <div className="flex flex-col gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold font-mono text-sm">
                02
              </div>
              <h2 className="text-lg font-bold text-white">
                Posisi Aktif & Pelunasan
              </h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                Pantau pinjaman yang Anda berikan (Lender) maupun yang Anda ambil (Borrower). Hitung mundur tanggal jatuh tempo dan lakukan pelunasan pokok beserta imbal hasil bunga secara onchain dengan 1 klik.
              </p>
            </div>
            <div className="pt-6">
              <Link
                href="/positions"
                className="w-full inline-flex justify-center items-center py-2.5 px-4 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition-colors"
              >
                Kelola Posisi Kredit &rarr;
              </Link>
            </div>
          </div>

          {/* Pillar 3: Market Maker Dashboard */}
          <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 hover:border-slate-700 transition-colors flex flex-col justify-between">
            <div className="flex flex-col gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#D4FF00]/10 border border-[#D4FF00]/20 flex items-center justify-center text-[#D4FF00] font-bold font-mono text-sm">
                03
              </div>
              <h2 className="text-lg font-bold text-white">
                Market Maker & Liquidity Mining
              </h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                Dapatkan alokasi volume terbobot untuk setiap match limit order dua sisi yang Anda pasang. Dilindungi oleh WashTradingGuard dengan holding period minimal 50% tenor dan diskon deviasi spread TWAP.
              </p>
            </div>
            <div className="pt-6">
              <Link
                href="/market-maker"
                className="w-full inline-flex justify-center items-center py-2.5 px-4 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition-colors"
              >
                Buka Dashboard MM &rarr;
              </Link>
            </div>
          </div>
        </div>

        {/* Quick Testing Walkthrough */}
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
              Panduan Cepat Uji Coba di Monad Testnet
            </h3>
            <span className="text-xs text-slate-400 font-mono">Chain 10143</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80">
              <div className="font-mono text-[#D4FF00] font-bold mb-1">Langkah 1</div>
              <div className="font-semibold text-white mb-1">Klaim Saldo Uji Coba</div>
              <p className="text-slate-400 leading-relaxed">
                Klik tombol <strong>Faucet +10k mUSDC</strong> di navigasi atas untuk mencetak token dummy di dompet Anda.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80">
              <div className="font-mono text-[#D4FF00] font-bold mb-1">Langkah 2</div>
              <div className="font-semibold text-white mb-1">Pasang Limit Order</div>
              <p className="text-slate-400 leading-relaxed">
                Pilih tenor bucket (misal: 1 Minggu), tentukan suku bunga target (misal: 6.50%), dan submit order sisi Lend.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80">
              <div className="font-mono text-[#D4FF00] font-bold mb-1">Langkah 3</div>
              <div className="font-semibold text-white mb-1">Verifikasi di Posisi Aktif</div>
              <p className="text-slate-400 leading-relaxed">
                Saat order matched, posisi kredit tercatat onchain dan diindeks Envio secara real-time di halaman Posisi Aktif.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80">
              <div className="font-mono text-[#D4FF00] font-bold mb-1">Langkah 4</div>
              <div className="font-semibold text-white mb-1">Klaim Mining Reward</div>
              <p className="text-slate-400 leading-relaxed">
                Setelah melewati holding period minimal, klaim weighted volume Anda di halaman Market Maker.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-6 px-8 text-center text-xs text-slate-500">
        <p>&copy; 2026 Fieble Protocol &bull; Fully Onchain Fixed-Rate Credit Market on Monad.</p>
      </footer>
    </div>
  );
}
