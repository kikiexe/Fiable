"use client";

import Link from "next/link";
import { useAccount, useReadContract } from "wagmi";
import { usePrivy } from "@privy-io/react-auth";
import { AppHeader } from "@/components/AppHeader";
import { useProtocolFee } from "@/hooks/useProtocolFee";
import { usePositions } from "@/hooks/usePositions";
import { useMiningReward } from "@/hooks/useMiningReward";
import { formatUSDC, CONTRACT_ADDRESSES, ERC20_ABI } from "@/lib/contracts";

export default function DashboardPage() {
  const { authenticated } = usePrivy();
  const { address } = useAccount();

  const { feePercent, feeBps } = useProtocolFee(0);
  const { data: positionsData, isLoading: isPositionsLoading } = usePositions(address);
  const { data: miningData, isLoading: isMiningLoading } = useMiningReward(address);

  // Live balance read from ERC20 token contract
  const { data: balanceData } = useReadContract({
    address: CONTRACT_ADDRESSES.mockUSDC,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
  });

  // Live reserve balance held by AMMFallback contract
  const { data: ammReserveBalance } = useReadContract({
    address: CONTRACT_ADDRESSES.mockUSDC,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: [CONTRACT_ADDRESSES.ammFallback],
  });

  const asLender = positionsData?.asLender ?? [];
  const asBorrower = positionsData?.asBorrower ?? [];
  const totalPositionsCount = asLender.length + asBorrower.length;
  const totalWeightedVolume = miningData?.totalWeightedVolume ?? BigInt(0);

  const rawBalance = typeof balanceData === "bigint" ? balanceData : BigInt(0);
  const rawReserve = typeof ammReserveBalance === "bigint" ? ammReserveBalance : BigInt(400_000_000_000);

  return (
    <div className="min-h-screen bg-[#e8ebe6] text-[#0e0f0c] flex flex-col">
      <AppHeader />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 flex flex-col gap-8">
        {/* Page Title & Account Strip */}
        <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-4 pb-6 border-b border-stone-300">
          <div>
            <span className="text-[10px] font-mono font-black tracking-widest uppercase text-[#163300]">
              PEMANTAUAN AKUN
            </span>
            <h1 className="text-2xl sm:text-4xl font-black text-[#0e0f0c] tracking-tight">
              Ringkasan Aktivitas Pasar
            </h1>
            <p className="text-sm text-[#454745] mt-1 max-w-xl">
              Pantau ketersediaan dana pasar, status pinjaman dan pendanaan Anda, serta perolehan imbalan.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {authenticated && address && (
              <div className="px-3.5 py-2 rounded-xs bg-white border border-stone-200 text-xs font-mono">
                <span className="text-[#868685]">Saldo: </span>
                <strong className="text-[#0e0f0c]">{formatUSDC(rawBalance)} mUSDC</strong>
              </div>
            )}
            <Link
              href="/orderbook"
              className="px-5 py-2.5 rounded-xs bg-[#9fe870] text-[#0e0f0c] font-black text-xs hover:bg-[#cdffad] transition-colors shadow-xs"
            >
              + Buat Penawaran Baru
            </Link>
          </div>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-xs bg-white border border-stone-200 shadow-xs">
            <div className="text-[10px] font-mono font-bold text-[#868685] uppercase tracking-wider">
              Biaya Layanan Saat Ini
            </div>
            <div className="text-2xl font-black font-mono text-[#0e0f0c] mt-1">
              {feePercent.toFixed(2)}%
            </div>
            <div className="text-[11px] text-[#868685] mt-3 flex items-center justify-between">
              <span>{feeBps !== undefined ? `${feeBps.toString()} bps` : "15 bps"}</span>
              <span className="font-mono font-bold text-[#163300] bg-[#e2f6d5] px-1.5 py-0.5 rounded-2xs">
                Otomatis
              </span>
            </div>
          </div>

          <div className="p-5 rounded-xs bg-white border border-stone-200 shadow-xs">
            <div className="text-[10px] font-mono font-bold text-[#868685] uppercase tracking-wider">
              Dana Cadangan Otomatis
            </div>
            <div className="text-2xl font-black font-mono text-[#2ead4b] mt-1">
              {formatUSDC(rawReserve)} mUSDC
            </div>
            <div className="text-[11px] text-[#868685] mt-3 flex items-center justify-between">
              <span>4 Jangka Waktu</span>
              <span className="text-[#2ead4b] font-bold">100k / durasi</span>
            </div>
          </div>

          <div className="p-5 rounded-xs bg-white border border-stone-200 shadow-xs">
            <div className="text-[10px] font-mono font-bold text-[#868685] uppercase tracking-wider">
              Pinjaman & Pendanaan Anda
            </div>
            <div className="text-2xl font-black font-mono text-[#0e0f0c] mt-1">
              {authenticated && address ? (
                isPositionsLoading ? "..." : `${totalPositionsCount} Transaksi`
              ) : (
                "Belum Terhubung"
              )}
            </div>
            <div className="text-[11px] text-[#868685] mt-3 flex items-center justify-between">
              <span>{asLender.length} Pendanaan &bull; {asBorrower.length} Pinjaman</span>
              <Link href="/positions" className="text-[#0e0f0c] font-bold hover:underline">
                Rincian &rarr;
              </Link>
            </div>
          </div>

          <div className="p-5 rounded-xs bg-white border border-stone-200 shadow-xs">
            <div className="text-[10px] font-mono font-bold text-[#868685] uppercase tracking-wider">
              Poin Keaktifan Pasar
            </div>
            <div className="text-2xl font-black font-mono text-[#163300] mt-1">
              {authenticated && address ? (
                isMiningLoading ? "..." : `${formatUSDC(totalWeightedVolume)} mUSDC`
              ) : (
                "0.00 mUSDC"
              )}
            </div>
            <div className="text-[11px] text-[#868685] mt-3 flex items-center justify-between">
              <span>Proteksi Kejujuran</span>
              <Link href="/market-maker" className="text-[#0e0f0c] font-bold hover:underline">
                Imbalan &rarr;
              </Link>
            </div>
          </div>
        </div>

        {/* Action Pillars */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-6 rounded-xs bg-white border border-stone-200 hover:border-stone-300 transition-colors flex flex-col justify-between">
            <div className="flex flex-col gap-3">
              <div className="w-10 h-10 rounded-xs bg-[#0e0f0c] flex items-center justify-center text-[#9fe870] font-black font-mono text-sm">
                01
              </div>
              <h2 className="text-base font-black text-[#0e0f0c]">
                Pasar Bebas Antar Pengguna
              </h2>
              <p className="text-xs text-[#454745] leading-relaxed">
                Tentukan suku bunga sendiri untuk jangka waktu 7 sampai 365 hari. Ada dana cadangan otomatis jika tawaran belum ada yang menyamai.
              </p>
            </div>
            <div className="pt-5">
              <Link href="/orderbook" className="w-full py-2.5 text-center text-xs font-bold rounded-xs bg-[#e8ebe6] text-[#0e0f0c] hover:bg-[#9fe870] transition-colors block">
                Buka Buku Penawaran
              </Link>
            </div>
          </div>

          <div className="p-6 rounded-xs bg-white border border-stone-200 hover:border-stone-300 transition-colors flex flex-col justify-between">
            <div className="flex flex-col gap-3">
              <div className="w-10 h-10 rounded-xs bg-[#2ead4b]/10 border border-[#2ead4b]/20 flex items-center justify-center text-[#2ead4b] font-black font-mono text-sm">
                02
              </div>
              <h2 className="text-base font-black text-[#0e0f0c]">
                Daftar Pinjaman & Pelunasan
              </h2>
              <p className="text-xs text-[#454745] leading-relaxed">
                Pantau tanggal jatuh tempo pinjaman Anda dan lakukan pelunasan langsung kapan saja.
              </p>
            </div>
            <div className="pt-5">
              <Link href="/positions" className="w-full py-2.5 text-center text-xs font-bold rounded-xs bg-[#e8ebe6] text-[#0e0f0c] hover:bg-[#9fe870] transition-colors block">
                Lihat Pinjaman Saya
              </Link>
            </div>
          </div>

          <div className="p-6 rounded-xs bg-white border border-stone-200 hover:border-stone-300 transition-colors flex flex-col justify-between">
            <div className="flex flex-col gap-3">
              <div className="w-10 h-10 rounded-xs bg-[#163300]/10 border border-[#163300]/20 flex items-center justify-center text-[#163300] font-black font-mono text-sm">
                03
              </div>
              <h2 className="text-base font-black text-[#0e0f0c]">
                Program Imbalan Keaktifan
              </h2>
              <p className="text-xs text-[#454745] leading-relaxed">
                Dapatkan imbalan tambahan karena membantu menyediakan dana di pasar secara aktif dan jujur.
              </p>
            </div>
            <div className="pt-5">
              <Link href="/market-maker" className="w-full py-2.5 text-center text-xs font-bold rounded-xs bg-[#e8ebe6] text-[#0e0f0c] hover:bg-[#9fe870] transition-colors block">
                Lihat Program Imbalan
              </Link>
            </div>
          </div>
        </div>

        {/* Quick Testing Guide */}
        <div className="p-6 rounded-xs bg-white border border-stone-200 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black text-[#0e0f0c] uppercase tracking-wider font-mono">
              Panduan Uji Coba
            </h3>
            <span className="text-[10px] text-[#868685] font-mono font-bold">Chain 10143</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
            {[
              { step: '01', title: 'Ambil Saldo Uji Coba', desc: 'Klik tombol Ambil Saldo +10k di kanan atas untuk mencoba tanpa modal sungguhan.' },
              { step: '02', title: 'Pasang Tawaran', desc: 'Pilih jangka waktu dan tentukan bunga pinjaman yang Anda inginkan.' },
              { step: '03', title: 'Pantau Transaksi', desc: 'Kesepakatan Anda langsung tercatat dan dapat dipantau setiap saat.' },
              { step: '04', title: 'Selesai & Imbalan', desc: 'Terima pelunasan pokok beserta bunga dan klaim imbalan keaktifan Anda.' },
            ].map((item) => (
              <div key={item.step} className="p-4 rounded-xs bg-[#f6f7f5] border border-stone-200">
                <div className="font-mono font-black text-[#163300] mb-1">{item.step}</div>
                <div className="font-bold text-[#0e0f0c] mb-1">{item.title}</div>
                <p className="text-[#454745] leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </main>

      <footer className="border-t border-stone-300 py-5 px-6 text-center text-xs text-[#868685]">
        <p>&copy; 2026 Fieble Protocol. Fixed-Rate Credit on Monad.</p>
      </footer>
    </div>
  );
}
