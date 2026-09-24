import Link from "next/link";

export default function HomePage() {
  const verifiedContracts = [
    {
      name: "CLOBEngine",
      role: "Core matching engine & order storage",
      address: "0x9Ef5459216E8Bf1f12618cb3FA795C71a4cC6BCE",
    },
    {
      name: "AMMFallback",
      role: "Residual liquidity pool & yield curve model",
      address: "0xE1D063B8Ef992dB7CDDEb77E9a6592844E75aBc3",
    },
    {
      name: "FeeRewardController",
      role: "Chainlink dynamic volatility fee tuning",
      address: "0xAE5CD607f92bED8482422c10B7e85245eFc7f79E",
    },
    {
      name: "MiningReward",
      role: "Matched-Volume Mining with WashTradingGuard",
      address: "0x131692bF40Fb489494A9b3D5982816DD5C67B589",
    },
    {
      name: "MockPriceFeed",
      role: "Chainlink oracle price feed mock ($1.00 base)",
      address: "0xD89Cb0453557C4BC8bf918B21432eB97C71Ba2e9",
    },
    {
      name: "MockERC20 (mUSDC)",
      role: "Principal lending token (6 decimals, open faucet)",
      address: "0x7A13F0709937a85037028DBff016Fd2A73122F70",
    },
  ];

  const tenorBuckets = [
    {
      id: 0,
      name: "1 Minggu",
      tag: "Short",
      duration: "7 Hari",
      holdingPeriod: "3.5 Hari (50%)",
      description: "Ideal untuk likuiditas cepat dan kebutuhan modal kerja jangka pendek.",
      rateEstimate: "5.00% - 6.50% APY",
    },
    {
      id: 1,
      name: "1 Bulan",
      tag: "Medium",
      duration: "30 Hari",
      holdingPeriod: "15 Hari (50%)",
      description: "Tenor paling seimbang untuk siklus pembiayaan operasional reguler.",
      rateEstimate: "5.75% - 7.60% APY",
    },
    {
      id: 2,
      name: "3 Bulan",
      tag: "Long",
      duration: "90 Hari",
      holdingPeriod: "45 Hari (50%)",
      description: "Kredit kuartalan untuk ekspansi modal dengan imbal hasil terukur.",
      rateEstimate: "6.80% - 8.90% APY",
    },
    {
      id: 3,
      name: "1 Tahun",
      tag: "Extended",
      duration: "365 Hari",
      holdingPeriod: "182.5 Hari (50%)",
      description: "Perjanjian kredit tahunan dengan kepastian suku bunga penuh dari hari pertama.",
      rateEstimate: "8.10% - 10.50% APY",
    },
  ];

  const partners = [
    { name: "Monad", desc: "Parallel EVM" },
    { name: "Chainlink", desc: "CRE Automation" },
    { name: "OpenZeppelin", desc: "Audited Security" },
    { name: "Privy", desc: "Embedded Wallets" },
    { name: "Envio", desc: "HyperIndex Indexer" },
    { name: "Wagmi & Viem", desc: "Web3 Client Hooks" },
    { name: "Foundry", desc: "Smart Contract Suite" },
  ];

  return (
    <div className="min-h-screen bg-[#090D16] text-slate-100 flex flex-col font-sans selection:bg-[#D4FF00] selection:text-slate-950">
      {/* Top Banner */}
      <div className="bg-[#0D1424] border-b border-slate-800 px-4 py-2 text-center text-xs text-slate-300">
        <span className="font-semibold text-white">Monad Testnet (Chain ID 10143)</span>
        <span className="mx-2">&bull;</span>
        <span>Protokol kredit fixed-rate 100% onchain pertama di Monad</span>
        <Link
          href="/dashboard"
          className="ml-3 inline-flex items-center text-[#D4FF00] font-medium hover:underline"
        >
          Coba Aplikasi &rarr;
        </Link>
      </div>

      {/* Navigation Header */}
      <header className="border-b border-slate-800 bg-[#090D16]/90 backdrop-blur sticky top-0 z-50 px-6 sm:px-12 py-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-2xl font-black text-white tracking-tight">
            Fieble
          </Link>
          <span className="text-[11px] px-2 py-0.5 rounded bg-[#D4FF00]/10 text-[#D4FF00] font-mono font-medium border border-[#D4FF00]/20">
            Monad Testnet
          </span>
        </div>

        <nav className="hidden md:flex items-center gap-6 text-sm text-slate-400">
          <a href="#problem" className="hover:text-white transition-colors">
            Keunggulan
          </a>
          <a href="#tenors" className="hover:text-white transition-colors">
            Bucket Tenor
          </a>
          <a href="#architecture" className="hover:text-white transition-colors">
            Arsitektur
          </a>
          <a href="#contracts" className="hover:text-white transition-colors">
            Kontrak
          </a>
          <a
            href="https://github.com/kikiexe/Fiable#readme"
            target="_blank"
            rel="noreferrer"
            className="hover:text-white transition-colors"
          >
            Dokumentasi
          </a>
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="px-5 py-2 rounded-lg bg-[#D4FF00] text-slate-950 font-bold text-xs hover:bg-[#bce400] transition-colors"
          >
            Launch App
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative px-6 sm:px-12 pt-12 pb-20 border-b border-slate-800 overflow-hidden">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Column: Hero Content */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            <div className="self-start inline-flex items-center gap-2 px-3 py-1 rounded-md bg-slate-900/90 border border-slate-800 text-[11px] font-mono text-slate-300">
              <span className="h-1.5 w-1.5 rounded-full bg-[#D4FF00]" />
              100% ONCHAIN CREDIT MARKET &bull; BUILT FOR MONAD
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-[1.08]">
              Trade fixed-rate{" "}
              <span className="text-[#D4FF00]">credit market</span>{" "}
              from the first block.
            </h1>

            <p className="text-base sm:text-lg text-slate-400 leading-relaxed max-w-xl">
              Protokol pasar kredit berjangka terdesentralisasi di Monad. Tentukan suku bunga APY Anda sendiri, pilih dari 4 bucket tenor terstandarisasi, dan nikmati eksekusi instan melalui buku order CLOB dengan cadangan likuiditas AMM Fallback.
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-2">
              <Link
                href="/dashboard"
                className="px-6 py-3.5 rounded-lg bg-white text-slate-950 font-bold text-sm hover:bg-slate-200 transition-colors shadow-lg"
              >
                Launch App
              </Link>
              <Link
                href="/orderbook"
                className="px-6 py-3.5 rounded-lg bg-[#D4FF00] text-slate-950 font-bold text-sm hover:bg-[#bce400] transition-colors flex items-center gap-2"
              >
                Buka Order Book &rarr;
              </Link>
              <a
                href="https://github.com/kikiexe/Fiable#readme"
                target="_blank"
                rel="noreferrer"
                className="px-5 py-3.5 rounded-lg border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 text-sm font-semibold transition-colors"
              >
                Baca Whitepaper
              </a>
            </div>
          </div>

          {/* Right Column: Protocol Infrastructure Stack Panel */}
          <div className="lg:col-span-5">
            <div className="p-6 rounded-2xl bg-[#0D1424]/90 border border-slate-800 flex flex-col gap-6">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
                <div className="text-xs font-mono text-[#D4FF00] uppercase tracking-wider font-semibold">
                  &bull; PROTOCOL INFRASTRUCTURE STACK
                </div>
                <span className="text-[11px] font-mono text-slate-500">Chain 10143</span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 flex flex-col gap-2">
                  <div className="text-xs font-bold text-white">Monad Testnet</div>
                  <div className="text-[11px] text-slate-400 leading-snug">
                    Parallel EVM execution, 10,000 TPS, dan block time 1 detik untuk matching cepat.
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 flex flex-col gap-2">
                  <div className="text-xs font-bold text-white">Onchain CLOB</div>
                  <div className="text-[11px] text-slate-400 leading-snug">
                    Price-time priority matching engine tanpa ketergantungan offchain sequencer.
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 flex flex-col gap-2">
                  <div className="text-xs font-bold text-white">AMM Fallback</div>
                  <div className="text-[11px] text-slate-400 leading-snug">
                    Pool cadangan 400k mUSDC menjamin eksekusi saat buku order tipis.
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 flex flex-col gap-2">
                  <div className="text-xs font-bold text-white">Chainlink CRE</div>
                  <div className="text-[11px] text-slate-400 leading-snug">
                    Dynamic fee tuning otomatis dan oracle price feed dengan circuit breaker.
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 flex flex-col gap-2">
                  <div className="text-xs font-bold text-white">WashTradingGuard</div>
                  <div className="text-[11px] text-slate-400 leading-snug">
                    Holding period 50% dan diskon kuadratik spread TWAP membasmi wash trading.
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 flex flex-col gap-2">
                  <div className="text-xs font-bold text-white">Privy & Envio</div>
                  <div className="text-[11px] text-slate-400 leading-snug">
                    Embedded wallet frictionless dan HyperIndex GraphQL untuk query sub-detik.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Partner / Tooling Strip */}
      <section className="border-b border-slate-800 bg-[#090D16] py-8 px-6 sm:px-12">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="text-[11px] font-mono uppercase tracking-wider text-slate-500 whitespace-nowrap">
            INFRASTRUCTURE & INTEGRATIONS
          </div>
          <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-8">
            {partners.map((p) => (
              <div key={p.name} className="flex flex-col items-center">
                <span className="text-sm font-bold text-slate-300">{p.name}</span>
                <span className="text-[10px] text-slate-500 font-mono">{p.desc}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Problem vs Solution Section */}
      <section id="problem" className="py-20 px-6 sm:px-12 border-b border-slate-800">
        <div className="max-w-6xl mx-auto flex flex-col gap-12">
          <div className="text-center max-w-2xl mx-auto flex flex-col gap-3">
            <div className="text-xs font-mono text-[#D4FF00] uppercase tracking-wider font-semibold">
              Kepastian Suku Bunga vs Ketidakpastian Variabel
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Suku Bunga Mengambang di DeFi Sudah Usang.
            </h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              Pasar kredit konvensional membuat peminjam terjebak dalam lonjakan bunga mendadak. Fieble menghadirkan kepastian suku bunga tetap sejak transaksi pertama disetujui.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Conventional Variable Pool */}
            <div className="p-8 rounded-2xl bg-slate-900/40 border border-slate-800 flex flex-col gap-4">
              <div className="text-xs font-mono text-rose-400 uppercase tracking-wider font-semibold">
                Model Konvensional (Aave / Compound)
              </div>
              <h3 className="text-xl font-bold text-white">
                Suku Bunga Mengambang (Floating-Rate)
              </h3>
              <ul className="flex flex-col gap-3 text-xs text-slate-400 leading-relaxed mt-2">
                <li className="flex items-start gap-2">
                  <span className="text-rose-400 font-bold">&times;</span>
                  <span>Suku bunga berubah tiap detik tergantung rasio utilitas pool.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-rose-400 font-bold">&times;</span>
                  <span>Biaya pinjaman tidak dapat diprediksi untuk kalkulasi bisnis institusi.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-rose-400 font-bold">&times;</span>
                  <span>Volume mining sering dieksploitasi oleh bot wash trading tanpa risiko hold.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-rose-400 font-bold">&times;</span>
                  <span>Tanpa tanggal jatuh tempo pasti; biaya bunga berjalan tanpa batas waktu.</span>
                </li>
              </ul>
            </div>

            {/* Fieble Fixed-Rate Solution */}
            <div className="p-8 rounded-2xl bg-slate-900/90 border border-[#D4FF00]/40 flex flex-col gap-4 relative">
              <div className="text-xs font-mono text-[#D4FF00] uppercase tracking-wider font-semibold">
                Solusi Fieble di Monad
              </div>
              <h3 className="text-xl font-bold text-white">
                Kredit Berjangka Suku Bunga Tetap (Fixed-Rate)
              </h3>
              <ul className="flex flex-col gap-3 text-xs text-slate-300 leading-relaxed mt-2">
                <li className="flex items-start gap-2">
                  <span className="text-[#D4FF00] font-bold">&check;</span>
                  <span>Suku bunga APY terkunci rapat sejak order matched hingga jatuh tempo.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#D4FF00] font-bold">&check;</span>
                  <span>4 bucket tenor terstandarisasi mengonsentrasikan likuiditas pasar.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#D4FF00] font-bold">&check;</span>
                  <span>WashTradingGuard memvalidasi durasi hold 50% dan kedekatan harga ke TWAP.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#D4FF00] font-bold">&check;</span>
                  <span>AMM Fallback menjamin peminjam tidak pernah kehabisan likuiditas eksekusi.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Tenor Buckets Section */}
      <section id="tenors" className="py-20 px-6 sm:px-12 border-b border-slate-800 bg-[#090D16]">
        <div className="max-w-6xl mx-auto flex flex-col gap-12">
          <div className="text-center max-w-2xl mx-auto flex flex-col gap-3">
            <div className="text-xs font-mono text-[#D4FF00] uppercase tracking-wider font-semibold">
              Standarisasi Tenor Pasar Kredit
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              4 Tenor Bucket untuk Segala Kebutuhan Modal.
            </h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              Likuiditas terkonsentrasi pada empat jangka waktu terpisah, menghindarkan fragmentasi likuiditas di seluruh buku order onchain.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {tenorBuckets.map((bucket) => (
              <div
                key={bucket.id}
                className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-colors flex flex-col justify-between"
              >
                <div className="flex flex-col gap-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-mono font-bold text-[#D4FF00]">
                      Bucket #{bucket.id}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                      {bucket.tag}
                    </span>
                  </div>

                  <h3 className="text-xl font-bold text-white">{bucket.name}</h3>

                  <div className="py-2 border-y border-slate-800 text-xs flex flex-col gap-1">
                    <div className="flex justify-between text-slate-400">
                      <span>Durasi Tenor:</span>
                      <span className="font-semibold text-white">{bucket.duration}</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Holding Proteksi:</span>
                      <span className="font-semibold text-emerald-400">{bucket.holdingPeriod}</span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-400 leading-relaxed">
                    {bucket.description}
                  </p>
                </div>

                <div className="pt-6">
                  <Link
                    href={`/orderbook?tenor=${bucket.id}`}
                    className="w-full inline-flex justify-center items-center py-2 px-4 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition-colors"
                  >
                    Buka Buku Order &rarr;
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Architecture & Flow Section */}
      <section id="architecture" className="py-20 px-6 sm:px-12 border-b border-slate-800">
        <div className="max-w-6xl mx-auto flex flex-col gap-12">
          <div className="text-center max-w-2xl mx-auto flex flex-col gap-3">
            <div className="text-xs font-mono text-[#D4FF00] uppercase tracking-wider font-semibold">
              Mekanisme Eksekusi Hybrid
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Buku Order CLOB dengan Jaminan AMM Fallback.
            </h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              Kombinasi ketepatan harga dari limit order buku order dan kepastian eksekusi instan dari pool likuiditas otomatis.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col gap-4">
              <div className="w-8 h-8 rounded bg-blue-500/10 text-blue-400 font-mono font-bold flex items-center justify-center text-sm">
                1
              </div>
              <h3 className="text-lg font-bold text-white">Order Placement Onchain</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Pengguna memasang limit order Lend atau Borrow pada suku bunga target. Dana lender ditarik aman ke dalam kontrak via transfer token terotorisasi tanpa escrow perantara pihak ketiga.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col gap-4">
              <div className="w-8 h-8 rounded bg-emerald-500/10 text-emerald-400 font-mono font-bold flex items-center justify-center text-sm">
                2
              </div>
              <h3 className="text-lg font-bold text-white">Price-Time Priority Matching</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                CLOBEngine mengeksekusi order lawan terbaik secara organik. Setiap match otomatis menghasilkan posisi kredit berjangka baru yang tercatat onchain dan diindeks Envio HyperIndex.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col gap-4">
              <div className="w-8 h-8 rounded bg-[#D4FF00]/10 text-[#D4FF00] font-mono font-bold flex items-center justify-center text-sm">
                3
              </div>
              <h3 className="text-lg font-bold text-white">Residual AMM Fallback Swap</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Jika order market taker belum terpenuhi penuh oleh order limit yang tersedia, sisa volume pinjaman otomatis dialihkan ke AMMFallback pool untuk eksekusi instan tanpa slippage liar.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Verified Contracts Table Section */}
      <section id="contracts" className="py-20 px-6 sm:px-12 border-b border-slate-800 bg-[#090D16]">
        <div className="max-w-6xl mx-auto flex flex-col gap-8">
          <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-4">
            <div>
              <div className="text-xs font-mono text-[#D4FF00] uppercase tracking-wider font-semibold">
                Transparansi & Bukti Onchain
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mt-1">
                Kontrak Terverifikasi di Monad Testnet
              </h2>
            </div>
            <a
              href="https://testnet.monadexplorer.com"
              target="_blank"
              rel="noreferrer"
              className="text-xs text-slate-400 hover:text-white font-mono transition-colors"
            >
              Buka Monad Explorer &rarr;
            </a>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/40">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900 text-slate-400 font-mono uppercase text-[10px] border-b border-slate-800">
                <tr>
                  <th className="p-4">Nama Kontrak</th>
                  <th className="p-4">Peran & Fungsi Utama</th>
                  <th className="p-4">Alamat Monad Testnet (Chain 10143)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 font-mono">
                {verifiedContracts.map((c) => (
                  <tr key={c.name} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-4 font-bold text-white">{c.name}</td>
                    <td className="p-4 text-slate-300 font-sans">{c.role}</td>
                    <td className="p-4">
                      <a
                        href={`https://testnet.monadexplorer.com/address/${c.address}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[#D4FF00] hover:underline"
                      >
                        {c.address}
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Final Call to Action */}
      <section className="py-24 px-6 sm:px-12 text-center bg-[#0D1424]">
        <div className="max-w-3xl mx-auto flex flex-col items-center gap-6">
          <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
            Siap Masuk ke Era Kredit Fixed-Rate di Monad?
          </h2>
          <p className="text-sm sm:text-base text-slate-400 leading-relaxed max-w-xl">
            Coba aplikasi langsung di Monad Testnet. Ambil token uji coba dari faucet dan mulai pasang limit order pinjaman pertama Anda hari ini.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
            <Link
              href="/dashboard"
              className="px-8 py-4 rounded-lg bg-white text-slate-950 font-black text-sm hover:bg-slate-200 transition-colors shadow-xl"
            >
              Launch App &rarr;
            </Link>
            <Link
              href="/orderbook"
              className="px-8 py-4 rounded-lg bg-[#D4FF00] text-slate-950 font-black text-sm hover:bg-[#bce400] transition-colors shadow-xl"
            >
              Buka Order Book
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-12 px-6 sm:px-12 bg-[#090D16] text-xs text-slate-500">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-6">
          <div className="flex flex-col gap-1 text-center sm:text-left">
            <span className="text-base font-black text-white">Fieble Protocol</span>
            <span>Fully Onchain Fixed-Rate Credit Market on Monad.</span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6 text-slate-400 font-medium">
            <Link href="/dashboard" className="hover:text-white transition-colors">
              Dashboard
            </Link>
            <Link href="/orderbook" className="hover:text-white transition-colors">
              Order Book
            </Link>
            <Link href="/positions" className="hover:text-white transition-colors">
              Posisi Aktif
            </Link>
            <Link href="/market-maker" className="hover:text-white transition-colors">
              Market Maker
            </Link>
            <a
              href="https://github.com/kikiexe/Fiable"
              target="_blank"
              rel="noreferrer"
              className="hover:text-white transition-colors"
            >
              GitHub
            </a>
          </div>
        </div>

        <div className="max-w-6xl mx-auto mt-8 pt-6 border-t border-slate-800/60 text-center text-[11px] text-slate-600">
          &copy; 2026 Fieble Protocol. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
