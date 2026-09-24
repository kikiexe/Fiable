# Fieble Protocol

> Fully onchain fixed-rate credit market built on Monad.
> Set your rate. Choose your tenor. Instant match or fallback liquidity.

***

## 1. Overview

Fieble adalah protokol pasar kredit berjangka suku bunga tetap (fixed-rate term credit) yang berjalan 100% onchain di atas Monad. Protokol ini menggabungkan Central Limit Order Book (CLOB) berbasis prioritas harga dan waktu dengan Automated Market Maker (AMM) Fallback untuk menjamin kepastian likuiditas eksekusi bagi peminjam dan pemberi pinjaman.

### Masalah Utama Pasar Kredit DeFi Saat Ini
* **Suku Bunga Mengambang (Floating-Rate Volatility)**: Protokol lending konvensional (Aave/Compound) menggunakan model pool utilitas variabel. Peminjam dan institusi tidak dapat memprediksi beban biaya bunga untuk jangka waktu tertentu.
* **Likuiditas Order Book Lambat di EVM Konvensional**: Order book onchain membutuhkan latensi rendah dan throughput tinggi agar matching order tidak memakan gas mahal atau terhambat block time yang lambat.
* **Wash Trading pada Program Mining**: Distribusi token insentif volume konvensional rentan dimanipulasi oleh transaksi berputar (self-matching / wash trading).

### Solusi Fieble di Monad
* **Fixed-Rate Term Credit**: Kepastian suku bunga (APY tetap) hingga tanggal jatuh tempo (maturity) untuk 4 bucket tenor standar.
* **Hybrid Execution (CLOB + AMM Fallback)**: Taker mendapatkan eksekusi instan. Jika likuiditas buku order CLOB belum mencukupi atau spread melebihi batas slippage, porsi sisa otomatis dipenuhi oleh AMM Fallback pool.
* **Mekanisme Matched-Volume Mining Anti-Wash Trading**: Dilengkapi library WashTradingGuard yang mewajibkan holding period minimal 50% dari durasi tenor dan menerapkan diskon kuadratik terhadap deviasi spread dari TWAP pasar wajar.
* **Dynamic Fee Tuning via Chainlink**: Protokol fee disesuaikan otomatis oleh FeeRewardController berdasarkan volatilitas harga oracle dengan pengaman circuit breaker.
* **UX Web3 Mulus via Privy & Envio**: Login tanpa repot via email/sosial/wallet dengan embedded wallet Privy, didukung backend query GraphQL real-time bertenaga Envio HyperIndex.

***

## 2. Deployed Contracts (Monad Testnet)

* **Network**: Monad Testnet
* **Chain ID**: 10143
* **RPC URL**: `https://testnet-rpc.monad.xyz`
* **Block Explorer**: `https://testnet.monadexplorer.com`

| Kontrak | Alamat Onchain | Fungsi Utama |
| :--- | :--- | :--- |
| **CLOBEngine** | `0x9Ef5459216E8Bf1f12618cb3FA795C71a4cC6BCE` | Core matching engine, order storage, settlement P2P |
| **AMMFallback** | `0xE1D063B8Ef992dB7CDDEb77E9a6592844E75aBc3` | Pool likuiditas cadangan dengan model kurva suku bunga |
| **FeeRewardController** | `0xAE5CD607f92bED8482422c10B7e85245eFc7f79E` | Penyesuaian protocol fee dinamis berbasis Chainlink |
| **MiningReward** | `0x131692bF40Fb489494A9b3D5982816DD5C67B589` | Pencatatan volume terbobot untuk liquidity mining |
| **MockPriceFeed** | `0xD89Cb0453557C4BC8bf918B21432eB97C71Ba2e9` | Mock oracle Chainlink feed ($1.00 base price) |
| **MockERC20 (mUSDC)** | `0x7A13F0709937a85037028DBff016Fd2A73122F70` | Principal token 6 desimal dengan fungsi open mint faucet |

***

## 3. Arsitektur Sistem

```text
[ User / Web3 Client ]
         |
         | (1) Login & Sign Tx via Privy Embedded Wallet / Wagmi
         v
  [ CLOBEngine.sol ] <=================> [ AMMFallback.sol ]
         |                                      ^
         | (2) Match Organik                    | (3) Taker Residual Swap
         v                                      |
  [ MiningReward.sol ]                          v
         |                              [ AMM TWAP Oracle ]
         | (4) Validasi Bobot
         v
  [ WashTradingGuard ]
   * Holding Period >= 50% Tenor
   * Quadratic TWAP Spread Decay

  [ FeeRewardController.sol ] <===> [ Chainlink Automation & Feed ]
   * Dynamic Fee Tuning (10 - 50 bps)
   * Volatility Circuit Breaker

         |
         v (5) Emitted Events (OrderPlaced, OrderMatched, PositionSettled, RewardAccrued)
  [ Envio HyperIndex Indexer ]
         |
         v (6) GraphQL API Endpoint
  [ Frontend React Hooks (usePositions, useMiningReward, useProtocolFee) ]
```

***

## 4. Bucket Tenor Kredit

Protokol membagi pinjaman ke dalam 4 tenor bucket terstandarisasi untuk mengonsentrasikan likuiditas:

1. **Bucket 0: 1 Minggu (Short)** - Durasi 7 hari, holding period proteksi 3.5 hari.
2. **Bucket 1: 1 Bulan (Medium)** - Durasi 30 hari, holding period proteksi 15 hari.
3. **Bucket 2: 3 Bulan (Long)** - Durasi 90 hari, holding period proteksi 45 hari.
4. **Bucket 3: 1 Tahun (Extended)** - Durasi 365 hari, holding period proteksi 182.5 hari.

Rumus Bunga Suku Bunga Tetap:
```text
Interest = (Principal * RateBps * DurationSeconds) / (10,000 * 365 days)
Total Repayment = Principal + Interest
```

***

## 5. Mekanisme Unggulan

### A. Hybrid Order Matching
* **Limit Order**: Maker memasang order Lend atau Borrow pada suku bunga tertentu. Dana lender ditarik aman ke kontrak via transfer token saat order dipasang.
* **Market Order**: Taker mengeksekusi order lawan terbaik di buku order CLOB hingga batas slippage. Sisa nominal yang belum terisi langsung dieksekusi ke AMMFallback.
* **Settlement**: Saat posisi kredit melewati tanggal jatuh tempo, peminjam melunasi pokok + bunga, dan dana otomatis diteruskan ke lender atau AMM pool.

### B. Matched-Volume Mining dengan WashTradingGuard
MiningReward tidak membagikan reward berdasarkan volume kotor semata, melainkan volume terbobot:
1. **Holding Period Filter**: Posisi kredit yang ditutup sebelum 50% tenor durasi menghasilkan 0 weighted volume.
2. **Spread Deviation Decay**: Tingkat suku bunga transaksi dibandingkan dengan TWAP AMMFallback saat match terjadi. Semakin jauh deviasi suku bunga dari konsensus pasar, semakin besar penalti kuadratik yang memotong volume terhitung.

### C. Dynamic Fee Tuning
Biaya protokol dipantau berkala via Chainlink Automation:
* Pasar bergejolak: Fee dinaikkan terukur untuk memitigasi risiko kredit.
* Pasar stabil: Fee diturunkan untuk mendorong volume perdagangan.
* Circuit breaker: Melindungi pengguna dari lonjakan drastis dengan pembatasan perubahan maksimal 2x lipat atau minimal 0.5x lipat per siklus upkeep.

***

## 6. Struktur Monorepo

```text
Fiable/
├── contract/              # Smart contracts (Foundry framework)
│   ├── src/
│   │   ├── CLOBEngine.sol
│   │   ├── AMMFallback.sol
│   │   ├── FeeRewardController.sol
│   │   ├── MiningReward.sol
│   │   ├── MockERC20.sol
│   │   └── libraries/WashTradingGuard.sol
│   ├── script/Deploy.s.sol
│   └── test/              # 67 Unit & Integration test suite
│
├── frontend/              # Web application (Next.js 16 + Tailwind CSS 4)
│   ├── src/
│   │   ├── app/           # App Router (/orderbook, /positions, /market-maker)
│   │   ├── components/    # PositionCard, OrderPlacementForm, FaucetButton
│   │   ├── hooks/         # usePositions, useMiningReward, useProtocolFee
│   │   └── lib/           # contracts config, privy, wagmi, monad chain
│
├── envio/                 # Blockchain indexer (Envio HyperIndex 3.10)
│   ├── config.yaml        # Konfigurasi chain 10143 Monad testnet
│   ├── schema.graphql     # Schema entity (Order, Position, FeeCharge, MiningReward)
│   └── src/handlers/      # Handler event lifecycle CLOBEngine & MiningReward
│
└── md/                    # Dokumentasi arsitektur, sprint roadmap, dan blueprint
```

***

## 7. Keselarasan Bounty Hackathon

| Kategori Bounty | Implementasi di Fieble |
| :--- | :--- |
| **Privy** | Integrasi penuh PrivyProvider + embedded wallet auto-creation untuk user tanpa wallet. Menggunakan connector Wagmi resmi untuk menandatangani transaksi onchain asli (bukan sekadar login): ERC20 approve, placeOrder, settlePosition, claimWeightedVolume, dan mint faucet. |
| **Envio** | Menggunakan Envio HyperIndex v3 untuk mengindeks 7 event onchain protokol. Menyediakan query GraphQL multi-entity (Order, Position, FeeCharge, MatchRecord, MiningReward) yang terhubung langsung ke custom hooks frontend. Dilengkapi unit test simulasi in-memory (`createTestIndexer`). |
| **Chainlink (CRE)** | FeeRewardController terintegrasi dengan Price Feed oracle dan Chainlink Automation upkeep untuk dynamic fee tuning berkala serta pengaman circuit breaker. |
| **Monad** | Memanfaatkan performa parallel execution dan block time 1 detik Monad untuk menjalankan buku order limit CLOB sepenuhnya onchain dengan biaya gas minimal. |

***

## 8. Panduan Menjalankan Project

### Prasyarat
* Node.js v22+
* Bun v1.2+
* Foundry (`forge`, `cast`)
* Docker Desktop (opsional, untuk menjalankan Envio local PostgreSQL)

### A. Smart Contracts (Foundry)
```bash
cd contract
forge build
forge test
```

### B. Frontend (Next.js)
```bash
cd frontend
bun install
bun run dev
```
Buka `http://localhost:3000` pada browser. Gunakan tombol **Faucet +10k mUSDC** di header untuk mendapatkan saldo uji coba di Monad Testnet.

### C. Envio Indexer
```bash
cd envio
bun install
bun run test
envio dev
```
Endpoint GraphQL lokal akan tersedia di `http://localhost:8080/v1/graphql`.

***

## 9. Lisensi
Didistribusikan di bawah lisensi MIT.
