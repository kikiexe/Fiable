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

    event OrderMatched(
        uint256 indexed positionId,
        uint256 indexed lendOrderId,
        uint256 indexed borrowOrderId,
        uint256 matchedAmount,
        uint256 rate,
        FiebleTypes.TenorBucket tenor
    );

    // ============================================================
    //                      ERRORS
    // ============================================================

    error InvalidRate(uint256 rate);
    error InvalidAmount(uint256 amount);
    error OrderNotFound(uint256 orderId);
    error NotOrderOwner(uint256 orderId, address caller);
    error OrderNotOpen(uint256 orderId);
    error InsufficientBalance(address account, uint256 required, uint256 actual);
    error NoMatchingOrder();
    error SelfMatchNotAllowed();

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

    /// @notice Baca detail order by ID.
    function getOrder(uint256 orderId) external view returns (FiebleTypes.Order memory);

    /// @notice Baca detail posisi by ID.
    function getPosition(uint256 positionId) external view returns (FiebleTypes.Position memory);

    /// @notice Ambil jumlah total order aktif di bucket tertentu.
    function getOrderCount(FiebleTypes.TenorBucket tenor, FiebleTypes.OrderSide side) external view returns (uint256);
}
