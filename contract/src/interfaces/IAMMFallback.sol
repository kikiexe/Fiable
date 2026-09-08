// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {FiebleTypes} from "../types/FiebleTypes.sol";

interface IAMMFallback {
    // ============================================================
    //                      EVENTS
    // ============================================================

    event LiquidityAdded(
        address indexed provider, FiebleTypes.TenorBucket indexed tenor, uint256 amount, uint256 sharesMinted
    );

    event LiquidityRemoved(
        address indexed provider, FiebleTypes.TenorBucket indexed tenor, uint256 amount, uint256 sharesBurned
    );

    event AMMSwapped(
        address indexed user,
        FiebleTypes.OrderSide indexed side,
        FiebleTypes.TenorBucket indexed tenor,
        uint256 amount,
        uint256 executionRate
    );

    event RateModelUpdated(
        uint256 baseRate, uint256 optimalUtilization, uint256 slope1, uint256 slope2, uint256 spreadBps
    );

    event AMMBorrowRepaid(FiebleTypes.TenorBucket indexed tenor, uint256 principalAmount, uint256 interestAmount);

    event AMMLenderRepaid(
        FiebleTypes.TenorBucket indexed tenor, address indexed lender, uint256 principalAmount, uint256 interestAmount
    );

    // ============================================================
    //                      ERRORS
    // ============================================================

    error ZeroAmount();
    error ZeroAddress();
    error InsufficientPoolLiquidity(uint256 requested, uint256 available);
    error InsufficientShares(uint256 requested, uint256 available);
    error SlippageLimitExceeded(uint256 actualRate, uint256 maxSlippageRate);
    error OnlyCLOBEngineAllowed(address caller, address authorizedCLOB);
    error InvalidOptimalUtilization(uint256 optimalUtilization);
    error RateExceedsMax(uint256 totalRate, uint256 maxRate);

    // ============================================================
    //                      FUNCTIONS
    // ============================================================

    /// @notice Menyediakan likuiditas pasif ke dalam bucket tenor tertentu.
    /// @param tenor Bucket tenor target.
    /// @param amount Jumlah token principal yang didepositkan.
    /// @return sharesMinted Jumlah share LP yang diterbitkan.
    function addLiquidity(FiebleTypes.TenorBucket tenor, uint256 amount) external returns (uint256 sharesMinted);

    /// @notice Menarik likuiditas pasif beserta akumulasi yield dari bucket tenor.
    /// @param tenor Bucket tenor target.
    /// @param shares Jumlah share LP yang dibakar.
    /// @return amountReturned Jumlah token principal yang dikembalikan.
    function removeLiquidity(FiebleTypes.TenorBucket tenor, uint256 shares) external returns (uint256 amountReturned);

    /// @notice Eksekusi swap instan taker melawan AMM pool.
    /// @param side Lend (user setor dana) atau Borrow (user tarik pinjaman).
    /// @param tenor Bucket tenor yang dipilih.
    /// @param amount Jumlah pokok pinjaman/penyertaan.
    /// @param maxSlippageRate Batas toleransi rate taker dalam basis points.
    /// @param recipient Penerima dana principal.
    /// @return executionRate Suku bunga efektif hasil eksekusi dalam basis points.
    function swap(
        FiebleTypes.OrderSide side,
        FiebleTypes.TenorBucket tenor,
        uint256 amount,
        uint256 maxSlippageRate,
        address recipient
    ) external returns (uint256 executionRate);

    /// @notice Menghitung estimasi rate eksekusi AMM saat ini untuk simulasi.
    /// @param tenor Bucket tenor.
    /// @param side Sisi order taker (Lend atau Borrow).
    /// @param amount Jumlah nominal order.
    /// @return rate Suku bunga estimasi dalam basis points.
    function getQuoteRate(FiebleTypes.TenorBucket tenor, FiebleTypes.OrderSide side, uint256 amount)
        external
        view
        returns (uint256 rate);

    /// @notice Mengambil data statistik likuiditas pool per bucket tenor.
    function getPoolInfo(FiebleTypes.TenorBucket tenor)
        external
        view
        returns (
            uint256 totalLiquidity,
            uint256 borrowedLiquidity,
            uint256 totalShares,
            uint256 utilizationBps,
            uint256 currentRateBps
        );

    /// @notice Mengambil harga rate rata-rata terbobot waktu (TWAP) per bucket tenor.
    function getTWAP(FiebleTypes.TenorBucket tenor) external view returns (uint256 twapRate);

    /// @notice Pelunasan pinjaman borrower ke AMM pool saat maturity.
    /// @param tenor Bucket tenor pinjaman.
    /// @param principalAmount Pokok pinjaman yang dikembalikan.
    /// @param interestAmount Bunga pinjaman yang dialokasikan ke pool LP.
    function repayBorrow(FiebleTypes.TenorBucket tenor, uint256 principalAmount, uint256 interestAmount) external;

    /// @notice Pencairan pokok dan bunga oleh AMM ke taker lender saat maturity.
    /// @param tenor Bucket tenor penempatan.
    /// @param lender Alamat penerima dana (lender).
    /// @param principalAmount Pokok yang dicairkan dari takerLentLiquidity.
    /// @param interestAmount Bunga yang dibayarkan dari cadangan LP.
    function repayLender(FiebleTypes.TenorBucket tenor, address lender, uint256 principalAmount, uint256 interestAmount)
        external;
}
