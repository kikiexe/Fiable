'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useReadContracts, useReadContract } from 'wagmi';
import { GradientWaves } from '@/components/GradientWaves';
import { CONTRACT_ADDRESSES, AMM_FALLBACK_ABI, ERC20_ABI, formatUSDC } from '@/lib/contracts';

export default function HomePage() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [calcAmount, setCalcAmount] = useState<string>('10000');
  const [calcTenor, setCalcTenor] = useState<number>(1);
  const [calcSide, setCalcSide] = useState<'borrow' | 'lend'>('borrow');
  const [calcViewTab, setCalcViewTab] = useState<'summary' | 'schedule'>('summary');
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 30);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Live reserve balance held by AMMFallback contract
  const { data: ammReserveBalance } = useReadContract({
    address: CONTRACT_ADDRESSES.mockUSDC,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [CONTRACT_ADDRESSES.ammFallback],
  });

  const reserveFormatted = typeof ammReserveBalance === 'bigint'
    ? formatUSDC(ammReserveBalance)
    : '400.000';

  // Fetch live pool info from AMMFallback for each tenor
  const { data: poolData } = useReadContracts({
    contracts: [0, 1, 2, 3].map((tenor) => ({
      address: CONTRACT_ADDRESSES.ammFallback,
      abi: AMM_FALLBACK_ABI,
      functionName: 'getPoolInfo',
      args: [tenor],
    })),
  });

  const baseBuckets = [
    { id: 0, name: '7 Hari', code: 'SHORT', days: 7, baseRateBps: 520, xCoord: 80, yCoord: 140 },
    { id: 1, name: '30 Hari', code: 'MONTH', days: 30, baseRateBps: 640, xCoord: 240, yCoord: 110 },
    { id: 2, name: '90 Hari', code: 'QUARTER', days: 90, baseRateBps: 785, xCoord: 440, yCoord: 75 },
    { id: 3, name: '365 Hari', code: 'ANNUAL', days: 365, baseRateBps: 960, xCoord: 640, yCoord: 30 },
  ];

  const tenorBuckets = baseBuckets.map((b) => {
    const pool = poolData?.[b.id]?.result;
    const rateBps = pool && Array.isArray(pool) && pool[4] !== undefined
      ? Number(pool[4])
      : b.baseRateBps;
    const ratePercent = rateBps / 100;
    const clampedRate = Math.min(10.5, Math.max(3.5, ratePercent));
    const yCoord = Math.round(144 - ((clampedRate - 4) / 6) * 110);
    return {
      ...b,
      rateBps,
      yCoord,
    };
  });

  const p0 = tenorBuckets[0];
  const p1 = tenorBuckets[1];
  const p2 = tenorBuckets[2];
  const p3 = tenorBuckets[3];
  const curvePath = `M ${p0.xCoord},${p0.yCoord} C ${p1.xCoord},${p1.yCoord} ${p2.xCoord},${p2.yCoord} ${p3.xCoord},${p3.yCoord}`;
  const areaPath = `${curvePath} L ${p3.xCoord},165 L ${p0.xCoord},165 Z`;

  const amountPresets = ['1000', '5000', '10000', '25000', '50000', '100000'];

  const verifiedContracts = [
    { name: 'CLOBEngine', role: 'Pencocokan transaksi pinjaman langsung antar pengguna', address: '0x9Ef5459216E8Bf1f12618cb3FA795C71a4cC6BCE' },
    { name: 'AMMFallback', role: 'Dana cadangan otomatis untuk pencairan seketika', address: '0xE1D063B8Ef992dB7CDDEb77E9a6592844E75aBc3' },
    { name: 'FeeRewardController', role: 'Pengatur biaya layanan dan penyesuaian pasar', address: '0xAE5CD607f92bED8482422c10B7e85245eFc7f79E' },
    { name: 'MiningReward', role: 'Pengelola imbalan penyedia dana dan pencegah manipulasi', address: '0x131692bF40Fb489494A9b3D5982816DD5C67B589' },
    { name: 'MockERC20 (mUSDC)', role: 'Mata uang dolar digital uji coba protokol', address: '0x7A13F0709937a85037028DBff016Fd2A73122F70' },
  ];

  const bucket = tenorBuckets[calcTenor];
  const amount = Math.max(0, Number(calcAmount) || 0);
  const interest = (amount * (bucket.rateBps / 10000) * bucket.days) / 365;
  const protocolFee = amount * 0.0015;
  const settlement = calcSide === 'borrow' ? amount + interest + protocolFee : amount + interest - protocolFee;

  const handleCopy = (address: string) => {
    navigator.clipboard.writeText(address);
    setCopiedAddress(address);
    setTimeout(() => setCopiedAddress(null), 2500);
  };

  return (
    <div className="min-h-screen bg-[#e8ebe6] text-[#0e0f0c] flex flex-col selection:bg-[#9fe870] selection:text-[#0e0f0c]">
      {/* Dynamic Navbar: transitions into floating bar on scroll */}
      <header
        className={`fixed z-50 transition-all duration-300 ease-in-out ${
          isScrolled
            ? 'top-4 inset-x-4 max-w-5xl mx-auto py-2.5 px-5 bg-[#0e0f0c]/90 text-white backdrop-blur-md border border-stone-800 shadow-2xl rounded-xs'
            : 'top-0 inset-x-0 w-full py-5 px-6 sm:px-8 bg-transparent text-white border-b border-white/5'
        }`}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <Image
              src="/icon.png"
              alt="Fieble Logo"
              width={32}
              height={32}
              className="w-8 h-8 rounded-xs object-contain"
              priority
            />
            <div className="flex items-center gap-2">
              <span className="text-lg font-black tracking-tight text-white block leading-none">
                FIEBLE
              </span>
              <span className="hidden sm:inline-block text-[10px] font-mono font-bold px-2 py-0.5 rounded-xs bg-white/10 text-stone-300">
                Monad 10143
              </span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-7 text-xs font-bold text-stone-300">
            <Link href="/orderbook" className="hover:text-white transition-colors">Buku Penawaran</Link>
            <Link href="/positions" className="hover:text-white transition-colors">Pinjaman Saya</Link>
            <Link href="/market-maker" className="hover:text-white transition-colors">Program Imbalan</Link>
            <a
              href="https://testnet.monadexplorer.com/address/0x9Ef5459216E8Bf1f12618cb3FA795C71a4cC6BCE"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white transition-colors"
            >
              Kontrak
            </a>
          </nav>

          <div className="flex items-center gap-2.5">
            <Link
              href="/orderbook"
              className="hidden sm:inline-flex px-3.5 py-1.5 text-xs font-bold rounded-xs border border-white/20 text-white hover:bg-white/10 transition-colors"
            >
              Buku Penawaran
            </Link>
            <Link
              href="/dashboard"
              className="px-4 py-1.5 text-xs font-black rounded-xs bg-[#9fe870] text-[#0e0f0c] hover:bg-[#cdffad] transition-colors"
            >
              Mulai Sekarang
            </Link>
          </div>
        </div>
      </header>

      {/* Clean Editorial Hero */}
      <section className="relative min-h-[100svh] flex flex-col justify-center items-center overflow-hidden bg-[#0e0f0c] text-white px-4 sm:px-6 pt-24 pb-16">
        {/* WebGL GradientWaves adhering strictly to DESIGN.md tokens */}
        <div className="absolute inset-0 z-0">
          <GradientWaves
            horizonColor="#163300"
            waveColor="#9fe870"
            crestColor="#cdffad"
            className="w-full h-full"
          />
        </div>

        {/* Ambient bottom fade */}
        <div className="absolute inset-x-0 bottom-0 h-40 z-10 bg-gradient-to-t from-[#0e0f0c] to-transparent pointer-events-none" />

        {/* Hero Content: Bold Scandinavian Fintech Typography */}
        <div className="relative z-20 max-w-4xl mx-auto text-center flex flex-col items-center">
          <div className="text-[11px] font-mono tracking-widest text-[#9fe870] uppercase font-bold mb-4">
            Monad Testnet (Chain ID 10143)
          </div>

          <h1 className="text-5xl sm:text-7xl lg:text-8xl font-black tracking-tight leading-[0.95] text-white">
            Pinjaman Terbuka.<br />
            <span className="text-[#9fe870]">Suku Bunga Pasti.</span>
          </h1>

          <p className="mt-6 text-base sm:text-xl text-stone-300 max-w-2xl leading-relaxed font-normal">
            Kunci biaya pinjaman dan imbal hasil pendanaan sejak hari pertama tanpa risiko kenaikan bunga di tengah jalan. Kesepakatan langsung antar pengguna dengan jaminan dana cadangan otomatis di jaringan Monad.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/dashboard"
              className="px-8 py-4 text-sm font-black rounded-xs bg-[#9fe870] text-[#0e0f0c] hover:bg-[#cdffad] transition-all duration-200 shadow-lg shadow-[#9fe870]/20 cursor-pointer"
            >
              Mulai Sekarang
            </Link>
            <Link
              href="/orderbook"
              className="px-8 py-4 text-sm font-semibold rounded-xs border border-white/25 text-white hover:bg-white/10 transition-all duration-200 cursor-pointer"
            >
              Lihat Buku Penawaran
            </Link>
          </div>

          {/* Transparent Onchain Verification Strip */}
          <div className="mt-14 pt-8 border-t border-white/10 grid grid-cols-3 gap-6 sm:gap-14 w-full max-w-2xl text-center">
            <div>
              <div className="text-[11px] uppercase tracking-wider text-stone-400 font-mono">Dana Cadangan</div>
              <div className="text-2xl sm:text-3xl font-black text-white font-mono mt-1">{reserveFormatted}</div>
              <div className="text-[11px] text-stone-500 mt-0.5">mUSDC di 4 Pilihan Durasi</div>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-wider text-stone-400 font-mono">Kesepakatan Langsung</div>
              <div className="text-2xl sm:text-3xl font-black text-[#9fe870] font-mono mt-1">Bunga Pasti</div>
              <div className="text-[11px] text-stone-500 mt-0.5">Urutan Antrean Terbuka</div>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-wider text-stone-400 font-mono">Risiko Bunga Berubah</div>
              <div className="text-2xl sm:text-3xl font-black text-white font-mono mt-1">0%</div>
              <div className="text-[11px] text-stone-500 mt-0.5">Bunga Pasti Hingga Lunas</div>
            </div>
          </div>
        </div>
      </section>

      {/* Yield Curve Term Structure Visualizer */}
      <section className="py-20 px-4 sm:px-6 max-w-5xl mx-auto w-full">
        <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-4 mb-8">
          <div>
            <span className="text-xs font-black font-mono tracking-widest uppercase text-[#163300]">
              PILIHAN JANGKA WAKTU
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-[#0e0f0c] mt-2">
              Tingkat Bunga Berdasarkan Waktu
            </h2>
            <p className="text-sm text-[#454745] mt-1">
              Pilihan suku bunga tetap di 4 jangka waktu. Klik salah satu titik untuk melihat simulasi perhitungan pinjaman.
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs font-mono">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-1 bg-[#163300] inline-block rounded-xs" />
              <span className="text-[#0e0f0c] font-bold">Bunga Tetap Fieble</span>
            </div>
            <div className="flex items-center gap-1.5 text-stone-400">
              <span className="w-3 h-0.5 border-t border-dashed border-stone-400 inline-block" />
              <span>Bunga Fluktuatif Pasar Biasa</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xs border border-stone-200 p-6 sm:p-8 shadow-xs">
          {/* SVG Yield Curve Graph */}
          <div className="relative w-full aspect-[21/9] min-h-[220px]">
            <svg viewBox="0 0 720 180" className="w-full h-full overflow-visible">
              <defs>
                <linearGradient id="curveGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#9fe870" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#9fe870" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Grid Lines */}
              <line x1="40" y1="30" x2="680" y2="30" stroke="#f0f2ee" strokeWidth="1" />
              <line x1="40" y1="75" x2="680" y2="75" stroke="#f0f2ee" strokeWidth="1" />
              <line x1="40" y1="110" x2="680" y2="110" stroke="#f0f2ee" strokeWidth="1" />
              <line x1="40" y1="140" x2="680" y2="140" stroke="#f0f2ee" strokeWidth="1" />

              {/* Y Axis Labels */}
              <text x="25" y="34" className="text-[10px] font-mono fill-stone-400" textAnchor="end">10%</text>
              <text x="25" y="79" className="text-[10px] font-mono fill-stone-400" textAnchor="end">8%</text>
              <text x="25" y="114" className="text-[10px] font-mono fill-stone-400" textAnchor="end">6%</text>
              <text x="25" y="144" className="text-[10px] font-mono fill-stone-400" textAnchor="end">4%</text>

              {/* Floating Rate Volatility Cloud Simulation */}
              <path
                d="M 80,120 Q 240,60 440,130 T 640,45"
                fill="none"
                stroke="#c7c9c5"
                strokeWidth="1.5"
                strokeDasharray="4 4"
              />

              {/* Fixed Yield Curve Area Fill */}
              <path
                d={areaPath}
                fill="url(#curveGradient)"
              />

              {/* Fixed Yield Curve Primary Line */}
              <path
                d={curvePath}
                fill="none"
                stroke="#163300"
                strokeWidth="3.5"
                strokeLinecap="round"
              />

              {/* Tenor Interactive Point Nodes */}
              {tenorBuckets.map((b) => {
                const isSelected = calcTenor === b.id;
                return (
                  <g
                    key={b.id}
                    onClick={() => setCalcTenor(b.id)}
                    className="cursor-pointer group"
                  >
                    <line
                      x1={b.xCoord}
                      y1={b.yCoord}
                      x2={b.xCoord}
                      y2="165"
                      stroke={isSelected ? "#163300" : "#d8dbd5"}
                      strokeWidth={isSelected ? "1.5" : "1"}
                      strokeDasharray="2 2"
                    />
                    <circle
                      cx={b.xCoord}
                      cy={b.yCoord}
                      r={isSelected ? "8" : "5"}
                      fill={isSelected ? "#9fe870" : "#ffffff"}
                      stroke="#163300"
                      strokeWidth={isSelected ? "3" : "2"}
                      className="transition-all duration-200"
                    />
                    <text
                      x={b.xCoord}
                      y={b.yCoord - 14}
                      textAnchor="middle"
                      className={`text-xs font-mono font-bold ${
                        isSelected ? "fill-[#0e0f0c] font-black" : "fill-stone-600"
                      }`}
                    >
                      {(b.rateBps / 100).toFixed(2)}%
                    </text>
                    <text
                      x={b.xCoord}
                      y="178"
                      textAnchor="middle"
                      className={`text-[11px] font-mono ${
                        isSelected ? "fill-[#0e0f0c] font-bold" : "fill-stone-400"
                      }`}
                    >
                      {b.name}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          <div className="mt-6 pt-4 border-t border-stone-200 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            {tenorBuckets.map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => setCalcTenor(b.id)}
                className={`p-3 rounded-xs text-left transition-all border cursor-pointer ${
                  calcTenor === b.id
                    ? "bg-[#e8ebe6] border-[#163300]"
                    : "bg-[#f6f7f5] border-stone-200 hover:border-stone-300"
                }`}
              >
                <div className="flex justify-between items-center text-[10px] font-mono text-stone-500">
                  <span>Pilihan #{b.id + 1}</span>
                  <span className="font-bold text-[#163300]">{b.code}</span>
                </div>
                <div className="text-base font-black font-mono text-[#0e0f0c] mt-1">
                  {(b.rateBps / 100).toFixed(2)}% APY
                </div>
                <div className="text-[11px] text-stone-500 mt-0.5">{b.days} Hari</div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Advanced Interactive Credit Simulator */}
      <section className="py-12 px-4 sm:px-6 max-w-5xl mx-auto w-full">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <span className="text-xs font-black font-mono tracking-widest uppercase text-[#163300]">
            KALKULATOR PINJAMAN
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-[#0e0f0c] mt-2">
            Simulasi Pinjaman Transparan
          </h2>
          <p className="text-sm text-[#454745] mt-2">
            Tentukan jumlah dana dan jangka waktu pinjaman. Ketahui seluruh rincian bunga dan biaya sejak awal.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Controls Column */}
          <div className="lg:col-span-7 bg-white text-[#0e0f0c] p-6 sm:p-8 rounded-xs border border-stone-200 shadow-xs">
            <div className="flex items-center justify-between pb-4 border-b border-stone-200">
              <span className="font-bold text-base">Pilihan Simulasi</span>
              <div className="flex items-center gap-1 p-0.5 bg-[#e8ebe6] rounded-xs text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setCalcSide('borrow')}
                  className={`px-3 py-1.5 rounded-xs transition-all cursor-pointer ${
                    calcSide === 'borrow' ? 'bg-[#0e0f0c] text-white' : 'text-[#454745] hover:text-[#0e0f0c]'
                  }`}
                >
                  Pinjam Dana
                </button>
                <button
                  type="button"
                  onClick={() => setCalcSide('lend')}
                  className={`px-3 py-1.5 rounded-xs transition-all cursor-pointer ${
                    calcSide === 'lend' ? 'bg-[#0e0f0c] text-white' : 'text-[#454745] hover:text-[#0e0f0c]'
                  }`}
                >
                  Beri Pinjaman
                </button>
              </div>
            </div>

            {/* Principal Input + Presets */}
            <div className="mt-6">
              <div className="flex justify-between items-center mb-1.5">
                <label htmlFor="calc-amount-input" className="text-[10px] font-bold text-[#454745] uppercase tracking-wider">
                  Jumlah Dana (mUSDC)
                </label>
                <span className="text-[10px] font-mono text-stone-500">Maks. 100.000</span>
              </div>
              <input
                id="calc-amount-input"
                type="number"
                value={calcAmount}
                onChange={(e) => setCalcAmount(e.target.value)}
                className="w-full text-2xl font-black font-mono px-4 py-3 bg-[#f6f7f5] rounded-xs border border-stone-300 focus:outline-none focus:ring-2 focus:ring-[#0e0f0c] text-[#0e0f0c]"
                placeholder="10000"
              />

              {/* Fluid Range Slider */}
              <div className="mt-3">
                <input
                  type="range"
                  min="500"
                  max="100000"
                  step="500"
                  value={amount}
                  onChange={(e) => setCalcAmount(e.target.value)}
                  className="w-full h-1.5 bg-stone-200 rounded-xs appearance-none cursor-pointer accent-[#163300]"
                />
              </div>

              {/* Quick Chip Presets */}
              <div className="mt-3 flex flex-wrap gap-1.5">
                {amountPresets.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setCalcAmount(preset)}
                    className={`px-2.5 py-1 text-xs font-mono font-bold rounded-xs transition-colors cursor-pointer ${
                      calcAmount === preset
                        ? 'bg-[#0e0f0c] text-white'
                        : 'bg-[#f6f7f5] text-[#454745] hover:bg-stone-200 border border-stone-200'
                    }`}
                  >
                    {Number(preset) >= 1000 ? `${Number(preset) / 1000}k` : preset}
                  </button>
                ))}
              </div>
            </div>

            {/* Tenor Selection */}
            <div className="mt-6">
              <div className="text-[10px] font-bold text-[#454745] uppercase tracking-wider mb-2">
                Pilih Jangka Waktu Pinjaman
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {tenorBuckets.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => setCalcTenor(b.id)}
                    className={`py-3 px-2 rounded-xs text-xs font-bold font-mono transition-all border cursor-pointer ${
                      calcTenor === b.id
                        ? 'bg-[#9fe870] border-[#9fe870] text-[#0e0f0c]'
                        : 'bg-[#f6f7f5] border-stone-200 text-[#454745] hover:border-stone-400'
                    }`}
                  >
                    <div className="font-bold text-sm">{b.name}</div>
                    <div className="text-[10px] opacity-75 mt-0.5">{(b.rateBps / 100).toFixed(2)}% APY</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Action Link */}
            <Link
              href={`/orderbook?tenor=${calcTenor}&side=${calcSide === 'borrow' ? '1' : '0'}`}
              className="mt-6 w-full py-4 text-center text-sm font-black rounded-xs bg-[#0e0f0c] text-white hover:bg-[#163300] transition-colors block"
            >
              Lanjutkan ke Pasar Pinjaman
            </Link>
          </div>

          {/* Breakdown & Fixed-vs-Floating Insight Column */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            {/* Settlement Summary & Schedule Card */}
            <div className="bg-white p-6 rounded-xs border border-stone-200 shadow-xs flex flex-col gap-4">
              <div className="flex justify-between items-center pb-3 border-b border-stone-200">
                <div className="flex items-center gap-1 p-0.5 bg-[#e8ebe6] rounded-xs text-[11px] font-bold">
                  <button
                    type="button"
                    onClick={() => setCalcViewTab('summary')}
                    className={`px-2.5 py-1 rounded-xs transition-colors cursor-pointer ${
                      calcViewTab === 'summary' ? 'bg-[#0e0f0c] text-white' : 'text-[#454745] hover:text-[#0e0f0c]'
                    }`}
                  >
                    Rincian
                  </button>
                  <button
                    type="button"
                    onClick={() => setCalcViewTab('schedule')}
                    className={`px-2.5 py-1 rounded-xs transition-colors cursor-pointer ${
                      calcViewTab === 'schedule' ? 'bg-[#0e0f0c] text-white' : 'text-[#454745] hover:text-[#0e0f0c]'
                    }`}
                  >
                    Jadwal Arus Kas
                  </button>
                </div>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-xs bg-[#e2f6d5] text-[#163300]">
                  100% Bunga Pasti
                </span>
              </div>

              {calcViewTab === 'summary' ? (
                <div className="space-y-2.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-[#454745]">Jumlah Pokok Pinjaman</span>
                    <span className="font-mono font-bold text-[#0e0f0c]">{amount.toLocaleString()} mUSDC</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#454745]">Tingkat Bunga Pasti</span>
                    <span className="font-mono font-bold text-[#2ead4b]">{(bucket.rateBps / 100).toFixed(2)}% APY</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#454745]">Beban Bunga ({bucket.days} Hari)</span>
                    <span className="font-mono font-bold text-[#0e0f0c]">{interest.toFixed(2)} mUSDC</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#454745]">Biaya Layanan (0,15%)</span>
                    <span className="font-mono text-stone-500">{protocolFee.toFixed(2)} mUSDC</span>
                  </div>
                  <div className="pt-3 border-t border-stone-200 flex justify-between items-baseline font-bold">
                    <span className="text-sm text-[#0e0f0c]">{calcSide === 'borrow' ? 'Total Pembayaran Kembali' : 'Total Penerimaan Bersih'}</span>
                    <span className="font-mono text-xl text-[#0e0f0c]">{settlement.toFixed(2)} mUSDC</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 text-xs font-mono">
                  <div className="p-2.5 rounded-xs bg-[#f6f7f5] border border-stone-200">
                    <div className="flex justify-between font-bold text-[#0e0f0c]">
                      <span>Hari Pertama (Pencairan)</span>
                      <span className={calcSide === 'borrow' ? 'text-[#2ead4b]' : 'text-[#d03238]'}>
                        {calcSide === 'borrow' ? `+${(amount - protocolFee).toFixed(2)}` : `-${amount.toFixed(2)}`} mUSDC
                      </span>
                    </div>
                    <div className="text-[11px] text-[#868685] font-sans mt-0.5">
                      {calcSide === 'borrow' ? 'Dana masuk langsung ke dompet Anda (dipotong biaya layanan 0,15%)' : 'Dana disiapkan untuk disalurkan ke peminjam'}
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xs bg-[#f6f7f5] border border-stone-200">
                    <div className="flex justify-between font-bold text-[#0e0f0c]">
                      <span>Hari ke-{bucket.days} (Jatuh Tempo)</span>
                      <span className={calcSide === 'borrow' ? 'text-[#d03238]' : 'text-[#2ead4b]'}>
                        {calcSide === 'borrow' ? `-${(amount + interest).toFixed(2)}` : `+${(amount + interest - protocolFee).toFixed(2)}`} mUSDC
                      </span>
                    </div>
                    <div className="text-[11px] text-[#868685] font-sans mt-0.5">
                      {calcSide === 'borrow' ? 'Pelunasan pokok pinjaman ditambah bunga yang telah disepakati' : 'Pengembalian pokok pinjaman beserta keuntungan bunga'}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Fixed vs Floating Structural Comparison */}
            <div className="bg-[#163300] text-white p-6 rounded-xs shadow-xs flex flex-col gap-3">
              <div className="text-xs font-black uppercase tracking-wider text-[#9fe870]">
                Keunggulan Bunga Tetap
              </div>
              <p className="text-xs text-stone-200 leading-relaxed">
                Pada pinjaman konvensional dengan bunga yang berubah-ubah, suku bunga pinjaman bisa melonjak drastis sewaktu-waktu. Di Fiable, tingkat bunga dikunci sejak awal sehingga tagihan Anda tetap sama sampai lunas.
              </p>
              <div className="p-3.5 rounded-xs bg-white/10 border border-white/10 flex flex-col gap-1 text-xs">
                <div className="text-stone-300 text-[11px]">Kepastian Penuh Sejak Awal:</div>
                <div className="font-mono font-bold text-[#9fe870]">
                  Tingkat bunga tidak akan berubah hingga pinjaman selesai
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Dual Engine Architecture: Structural Comparison */}
      <section className="py-20 px-4 sm:px-6 bg-white border-y border-stone-200">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="text-xs font-black font-mono tracking-widest uppercase text-[#163300]">METODE TRANSAKSI</span>
            <h2 className="text-3xl sm:text-4xl font-black text-[#0e0f0c] mt-2">Dua Jalur Transaksi Fleksibel</h2>
            <p className="text-sm text-[#454745] mt-2">
              Pilih suku bunga sendiri lewat pasar terbuka atau cairkan pinjaman seketika melalui dana cadangan otomatis.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-7 rounded-xs bg-[#f6f7f5] border border-stone-200 flex flex-col justify-between">
              <div>
                <div className="text-[10px] font-mono font-bold text-[#868685] uppercase tracking-wider mb-2">
                  Jalur 1: Pasar Terbuka
                </div>
                <h3 className="text-2xl font-black text-[#0e0f0c]">Tentukan Bunga Sendiri</h3>
                <p className="text-sm text-[#454745] mt-3 leading-relaxed">
                  Pasar terbuka langsung antar pengguna. Anda bebas menentukan suku bunga terbaik yang Anda inginkan dan sistem menyusun antrean secara adil berdasarkan waktu pengajuan.
                </p>

                <div className="mt-6 pt-4 border-t border-stone-200 space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-stone-500">Penetapan Bunga</span>
                    <span className="font-semibold text-[#0e0f0c]">Bebas Sesuai Target Anda</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-500">Perubahan Bunga</span>
                    <span className="font-mono font-bold text-[#2ead4b]">0% (Pasti Terkunci)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-500">Penyelesaian Transaksi</span>
                    <span className="font-semibold text-[#0e0f0c]">Otomatis & Terbuka</span>
                  </div>
                </div>
              </div>
              <div className="mt-6">
                <Link
                  href="/orderbook"
                  className="w-full py-3 text-center text-xs font-bold rounded-xs bg-[#e8ebe6] hover:bg-[#9fe870] text-[#0e0f0c] transition-colors block"
                >
                  Buka Pasar Penawaran
                </Link>
              </div>
            </div>

            <div className="p-7 rounded-xs bg-[#f6f7f5] border border-stone-200 flex flex-col justify-between">
              <div>
                <div className="text-[10px] font-mono font-bold text-[#868685] uppercase tracking-wider mb-2">
                  Jalur 2: Pencairan Instan
                </div>
                <h3 className="text-2xl font-black text-[#0e0f0c]">Dana Cadangan Otomatis</h3>
                <p className="text-sm text-[#454745] mt-3 leading-relaxed">
                  Penyedia dana cadangan otomatis yang siap melayani pinjaman atau pendanaan seketika tanpa perlu menunggu antrean kesepakatan pengguna lain.
                </p>

                <div className="mt-6 pt-4 border-t border-stone-200 space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-stone-500">Total Dana Siaga</span>
                    <span className="font-mono font-bold text-[#0e0f0c]">{reserveFormatted} mUSDC</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-500">Kecepatan Transaksi</span>
                    <span className="font-mono font-bold text-[#2ead4b]">Instan Seketika</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-500">Penetapan Bunga</span>
                    <span className="font-semibold text-[#0e0f0c]">Mengikuti Rata-rata Pasar</span>
                  </div>
                </div>
              </div>
              <div className="mt-6">
                <Link
                  href="/market-maker"
                  className="w-full py-3 text-center text-xs font-bold rounded-xs bg-[#e8ebe6] hover:bg-[#9fe870] text-[#0e0f0c] transition-colors block"
                >
                  Pelajari Program Imbalan
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Verified Contracts Section */}
      <section className="py-20 px-4 sm:px-6 max-w-7xl mx-auto w-full">
        <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-3 mb-8">
          <div>
            <span className="text-xs font-black font-mono tracking-widest uppercase text-[#163300]">KONTRAK TERVERIFIKASI</span>
            <h2 className="text-3xl sm:text-4xl font-black text-[#0e0f0c] mt-2">Penerapan di Monad Testnet</h2>
          </div>
          <div className="text-xs font-mono text-stone-500">
            Chain ID: 10143
          </div>
        </div>

        <div className="overflow-x-auto rounded-xs border border-stone-300 bg-white shadow-xs">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-stone-200 bg-[#f6f7f5] text-[#454745] font-mono">
              <tr>
                <th className="py-3 px-4 font-bold">Nama Kontrak</th>
                <th className="py-3 px-4 font-bold">Fungsi Utama</th>
                <th className="py-3 px-4 font-bold">Alamat Kontrak</th>
                <th className="py-3 px-4 font-bold text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {verifiedContracts.map((c) => (
                <tr key={c.name} className="hover:bg-stone-50 transition-colors">
                  <td className="py-3.5 px-4 font-mono font-bold text-[#0e0f0c]">{c.name}</td>
                  <td className="py-3.5 px-4 text-[#454745]">{c.role}</td>
                  <td className="py-3.5 px-4 font-mono text-stone-600">
                    <span className="hidden sm:inline">{c.address}</span>
                    <span className="sm:hidden">{c.address.slice(0, 8)}...{c.address.slice(-6)}</span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => handleCopy(c.address)}
                        className="px-2.5 py-1 text-[11px] font-mono font-semibold rounded-xs bg-[#e8ebe6] hover:bg-stone-300 text-[#0e0f0c] transition-colors cursor-pointer"
                      >
                        {copiedAddress === c.address ? "Tersalin" : "Salin"}
                      </button>
                      <a
                        href={`https://testnet.monadexplorer.com/address/${c.address}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2.5 py-1 text-[11px] font-mono font-bold rounded-xs bg-[#0e0f0c] text-white hover:bg-[#163300] transition-colors"
                      >
                        Explorer
                      </a>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Final Action Band */}
      <section className="py-20 px-4 sm:px-6 bg-[#0e0f0c] text-white">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl sm:text-5xl font-black tracking-tight mb-4">
            Mulai Pinjaman Bunga Pasti di Monad
          </h2>
          <p className="text-sm sm:text-base text-stone-300 max-w-xl mx-auto mb-8 leading-relaxed">
            Hubungkan dompet Anda, ambil saldo uji coba 10.000 mUSDC secara gratis, dan pasang penawaran pinjaman pertama Anda.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-3">
            <Link
              href="/dashboard"
              className="px-8 py-4 rounded-xs bg-[#9fe870] text-[#0e0f0c] font-black text-sm hover:bg-[#cdffad] transition-colors cursor-pointer"
            >
              Mulai Sekarang
            </Link>
            <Link
              href="/orderbook"
              className="px-8 py-4 rounded-xs border border-stone-700 text-stone-100 font-semibold text-sm hover:bg-stone-800 transition-colors cursor-pointer"
            >
              Buku Penawaran
            </Link>
          </div>
        </div>
      </section>

      {/* Clean Footer */}
      <footer className="bg-[#0e0f0c] border-t border-stone-800 py-8 px-4 sm:px-6 text-xs text-stone-400">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Image
              src="/icon.png"
              alt="Fieble Logo"
              width={20}
              height={20}
              className="w-5 h-5 rounded-xs object-contain"
            />
            <span className="font-mono text-white font-bold">FIEBLE</span>
            <span className="text-stone-600">/</span>
            <span>Pasar Pinjaman Bunga Pasti di Monad</span>
          </div>
          <div className="flex flex-wrap items-center gap-5 font-medium text-stone-300">
            <Link href="/dashboard" className="hover:text-white transition-colors">Ringkasan</Link>
            <Link href="/orderbook" className="hover:text-white transition-colors">Buku Penawaran</Link>
            <Link href="/positions" className="hover:text-white transition-colors">Pinjaman Saya</Link>
            <Link href="/market-maker" className="hover:text-white transition-colors">Program Imbalan</Link>
            <a href="https://github.com/kikiexe/Fiable" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">GitHub</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
