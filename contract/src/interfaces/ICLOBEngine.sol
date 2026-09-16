// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {FiebleTypes} from "../types/FiebleTypes.sol";

interface ICLOBEngine {
    // ============================================================
    //                      EVENTS
    // ============================================================

    event OrderPlaced(
        uint256 indexed orderId,
        address indexed maker,
        FiebleTypes.OrderSide side,
        FiebleTypes.TenorBucket tenor,
        uint256 rate,
        uint256 amount
    );

    event OrderCancelled(uint256 indexed orderId, address indexed maker);

    /// @notice Di-emit saat pesanan berhasil dicocokkan (baik via CLOB organik maupun AMM fallback).
    /// @dev CATATAN ARSITEKTUR:
    ///      `matchedAmount` mencerminkan nilai bruto (gross) matching terhadap buku pesanan/pool
    ///      agar sinkron dengan perubahan order.filledAmount.
    ///      Posisi kredit yang tercipta (_positions[positionId].amount) menyimpan nilai neto (net amount)
    ///      setelah dikurangi protocol fee agar peminjam hanya membayar bunga atas dana yang diterima.
    ///      Rincian pemotongan fee protokol di-emit secara terpisah melalui event `ProtocolFeeCharged`.
    event OrderMatched(
        uint256 indexed positionId,
        uint256 indexed lendOrderId,
        uint256 indexed borrowOrderId,
        uint256 matchedAmount,
        uint256 rate,
        FiebleTypes.TenorBucket tenor
    );

    event MarketOrderExecuted(
        uint256 indexed positionId,
        address indexed taker,
        FiebleTypes.OrderSide side,
        FiebleTypes.TenorBucket tenor,
        uint256 totalAmount,
        uint256 clobMatchedAmount,
        uint256 ammMatchedAmount,
        uint256 effectiveRate
    );

    event AMMFallbackSet(address indexed previousAddress, address indexed newAddress);

    event ProtocolFeeCharged(uint256 indexed positionId, address indexed payer, uint256 feeAmount);
    event FeeRewardControllerSet(address indexed previousController, address indexed newController);
    event MiningRewardSet(address indexed previousAddress, address indexed newAddress);

    event PositionSettled(uint256 indexed positionId, uint256 totalRepayment);

    // ============================================================
    //                      ERRORS
    // ============================================================

    error ZeroAddress();
    error InvalidRate(uint256 rate);
    error InvalidAmount(uint256 amount);
    error OrderNotFound(uint256 orderId);
    error NotOrderOwner(uint256 orderId, address caller);
    error OrderNotOpen(uint256 orderId);
    error InsufficientBalance(address account, uint256 required, uint256 actual);
    error NoMatchingOrder();
    error SelfMatchNotAllowed();
    error AMMFallbackNotConfigured();
    error SlippageExceeded(uint256 actualRate, uint256 maxSlippageRate);
    error PositionNotFound(uint256 positionId);
    error PositionAlreadySettled(uint256 positionId);
    error PositionNotMatured(uint256 positionId, uint256 maturityTime, uint256 currentTime);

    // ============================================================
    //                      FUNCTIONS
    // ============================================================

    /// @notice Pasang limit order baru.
    /// @param side Lend atau Borrow
    /// @param tenor Bucket tenor yang dipilih
    /// @param rate Suku bunga dalam basis points
    /// @param amount Jumlah principal dalam token unit
    /// @return orderId ID order yang baru dibuat
    function placeOrder(FiebleTypes.OrderSide side, FiebleTypes.TenorBucket tenor, uint256 rate, uint256 amount)
        external
        returns (uint256 orderId);

    /// @notice Batalkan order yang masih open.
    /// @param orderId ID order yang akan dibatalkan
    function cancelOrder(uint256 orderId) external;

    /// @notice Cocokkan order lend dan borrow terbaik di bucket tertentu.
    /// @param tenor Bucket tenor yang akan di-match
    /// @return positionId ID posisi kredit baru, 0 jika tidak ada match
    function matchOrders(FiebleTypes.TenorBucket tenor) external returns (uint256 positionId);

    /// @notice Eksekusi order market taker secara instan: menghabiskan CLOB dulu, sisa diarahkan ke AMM Fallback.
    /// @param side Sisi taker (Lend atau Borrow).
    /// @param tenor Bucket tenor.
    /// @param amount Total principal yang ingin dieksekusi.
    /// @param maxSlippageRate Toleransi rate maksimum (borrower) atau minimum (lender).
    /// @return positionId ID posisi kredit baru yang tercatat.
    function executeMarketOrder(
        FiebleTypes.OrderSide side,
        FiebleTypes.TenorBucket tenor,
        uint256 amount,
        uint256 maxSlippageRate
    ) external returns (uint256 positionId);

    /// @notice Mengatur alamat kontrak AMMFallback resmi.
    function setAMMFallback(address ammFallbackAddress) external;

    /// @notice Mengambil alamat kontrak AMMFallback saat ini.
    function getAMMFallback() external view returns (address);

    /// @notice Mengatur alamat kontrak FeeRewardController resmi.
    function setFeeRewardController(address controllerAddress) external;

    /// @notice Mengambil alamat kontrak FeeRewardController saat ini.
    function getFeeRewardController() external view returns (address);

    /// @notice Mengatur alamat kontrak MiningReward resmi.
    function setMiningReward(address miningRewardAddress) external;

    /// @notice Mengambil alamat kontrak MiningReward saat ini.
    function getMiningReward() external view returns (address);

    /// @notice Baca detail order by ID.
    function getOrder(uint256 orderId) external view returns (FiebleTypes.Order memory);

    /// @notice Baca detail posisi by ID.
    function getPosition(uint256 positionId) external view returns (FiebleTypes.Position memory);

    /// @notice Ambil jumlah order aktif saat ini di bucket tertentu.
    function getOrderCount(FiebleTypes.TenorBucket tenor, FiebleTypes.OrderSide side) external view returns (uint256);

    /// @notice Ambil jumlah total order historis di bucket tertentu.
    function getTotalOrderCount(FiebleTypes.TenorBucket tenor, FiebleTypes.OrderSide side)
        external
        view
        returns (uint256);

    /// @notice Settle pinjaman yang jatuh tempo: transfer pokok + bunga dari borrower ke lender.
    /// @param positionId ID posisi kredit yang akan diselesaikan.
    function settlePosition(uint256 positionId) external;
}
