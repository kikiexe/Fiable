// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

library FiebleTypes {
    // ============================================================
    //                      ENUMS
    // ============================================================

    /// @notice 4 tenor bucket yang diizinkan sistem.
    /// Nilai uint8: OneWeek=0, OneMonth=1, ThreeMonths=2, OneYear=3
    enum TenorBucket {
        OneWeek, // 7 hari
        OneMonth, // 30 hari
        ThreeMonths, // 90 hari
        OneYear // 365 hari
    }

    /// @notice Sisi order: Lend (supply) atau Borrow (demand).
    enum OrderSide {
        Lend,
        Borrow
    }

    /// @notice Status lifecycle sebuah order.
    enum OrderStatus {
        Open, // Belum matched, bisa di-cancel
        Filled, // Sudah fully matched
        Cancelled // Dibatalkan oleh owner
    }

    // ============================================================
    //                      STRUCTS
    // ============================================================

    /// @notice Representasi satu order di order book.
    struct Order {
        uint256 id; // ID unik, auto-increment
        address maker; // Alamat pembuat order
        OrderSide side; // Lend atau Borrow
        TenorBucket tenor; // Bucket tenor
        uint256 rate; // Suku bunga dalam basis points (1 bp = 0.01%). Contoh: 500 = 5.00%
        uint256 amount; // Jumlah principal dalam token unit (wei)
        uint256 filledAmount; // Jumlah yang sudah ter-match
        uint256 createdAt; // block.timestamp saat order dibuat
        OrderStatus status; // Status order saat ini
    }

    /// @notice Representasi posisi kredit yang sudah matched.
    struct Position {
        uint256 id; // ID unik posisi
        uint256 lendOrderId; // Reference ke order lender
        uint256 borrowOrderId; // Reference ke order borrower
        address lender; // Alamat lender
        address borrower; // Alamat borrower
        TenorBucket tenor; // Bucket tenor
        uint256 rate; // Rate yang disepakati (basis points)
        uint256 amount; // Jumlah principal
        uint256 startTime; // Kapan posisi mulai
        uint256 maturityTime; // Kapan posisi jatuh tempo
        bool settled; // Apakah sudah di-settle
    }

    // ============================================================
    //                      CONSTANTS
    // ============================================================

    /// @notice Durasi setiap tenor bucket dalam detik.
    uint256 constant TENOR_ONE_WEEK = 7 days;
    uint256 constant TENOR_ONE_MONTH = 30 days;
    uint256 constant TENOR_THREE_MONTHS = 90 days;
    uint256 constant TENOR_ONE_YEAR = 365 days;

    /// @notice Basis point denominator. 10_000 = 100.00%
    uint256 constant BPS_DENOMINATOR = 10_000;

    /// @notice Maximum rate yang diizinkan (50% = 5000 bps).
    uint256 constant MAX_RATE_BPS = 5_000;

    /// @notice Minimum order amount (0.01 token untuk token 6 decimals seperti USDC).
    uint256 constant MIN_ORDER_AMOUNT = 1e4;

    // ============================================================
    //                      ERRORS
    // ============================================================

    error InvalidTenor();

    // ============================================================
    //                      HELPER FUNCTIONS
    // ============================================================

    /// @notice Mengkonversi TenorBucket enum ke durasi dalam detik.
    function tenorToDuration(TenorBucket tenor) internal pure returns (uint256) {
        if (tenor == TenorBucket.OneWeek) return TENOR_ONE_WEEK;
        if (tenor == TenorBucket.OneMonth) return TENOR_ONE_MONTH;
        if (tenor == TenorBucket.ThreeMonths) return TENOR_THREE_MONTHS;
        if (tenor == TenorBucket.OneYear) return TENOR_ONE_YEAR;
        revert InvalidTenor();
    }
}
