// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ICLOBEngine} from "./interfaces/ICLOBEngine.sol";
import {FiebleTypes} from "./types/FiebleTypes.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract CLOBEngine is ICLOBEngine, ReentrancyGuard {
    using SafeERC20 for IERC20;
    using FiebleTypes for FiebleTypes.TenorBucket;

    // ============================================================
    //                      STATE VARIABLES
    // ============================================================

    /// @notice Token yang digunakan sebagai principal (misal USDC).
    IERC20 public immutable token;

    /// @notice Counter auto-increment untuk order ID.
    uint256 private _nextOrderId = 1;

    /// @notice Counter auto-increment untuk position ID.
    uint256 private _nextPositionId = 1;

    /// @notice Mapping dari orderId ke Order.
    mapping(uint256 orderId => FiebleTypes.Order) private _orders;

    /// @notice Mapping dari positionId ke Position.
    mapping(uint256 positionId => FiebleTypes.Position) private _positions;

    /// @notice Order IDs per (tenor, side), untuk iterasi saat matching.
    /// Key: keccak256(abi.encode(tenor, side)) => array of order IDs.
    mapping(bytes32 bucketKey => uint256[]) private _bucketOrderIds;

    // ============================================================
    //                      CONSTRUCTOR
    // ============================================================

    /// @param token_ Alamat token ERC20 yang digunakan sebagai principal.
    constructor(address token_) {
        require(token_ != address(0), "Token address cannot be zero");
        token = IERC20(token_);
    }

    // ============================================================
    //                      EXTERNAL FUNCTIONS
    // ============================================================

    /// @inheritdoc ICLOBEngine
    function placeOrder(FiebleTypes.OrderSide side, FiebleTypes.TenorBucket tenor, uint256 rate, uint256 amount)
        external
        nonReentrant
        returns (uint256 orderId)
    {
        // --- CHECKS ---
        if (rate == 0 || rate > FiebleTypes.MAX_RATE_BPS) {
            revert InvalidRate(rate);
        }
        if (amount < FiebleTypes.MIN_ORDER_AMOUNT) {
            revert InvalidAmount(amount);
        }

        // Lender harus deposit principal saat pasang order.
        // Borrower tidak deposit di sini (akan deposit collateral di versi selanjutnya).
        if (side == FiebleTypes.OrderSide.Lend) {
            uint256 balance = token.balanceOf(msg.sender);
            if (balance < amount) {
                revert InsufficientBalance(msg.sender, amount, balance);
            }
            token.safeTransferFrom(msg.sender, address(this), amount);
        }

        // --- EFFECTS ---
        orderId = _nextOrderId++;

        _orders[orderId] = FiebleTypes.Order({
            id: orderId,
            maker: msg.sender,
            side: side,
            tenor: tenor,
            rate: rate,
            amount: amount,
            filledAmount: 0,
            createdAt: block.timestamp,
            status: FiebleTypes.OrderStatus.Open
        });

        bytes32 key = _bucketKey(tenor, side);
        _bucketOrderIds[key].push(orderId);

        // --- EVENT ---
        emit OrderPlaced(orderId, msg.sender, side, tenor, rate, amount);
    }

    /// @inheritdoc ICLOBEngine
    function cancelOrder(uint256 orderId) external nonReentrant {
        FiebleTypes.Order storage order = _orders[orderId];

        // --- CHECKS ---
        if (order.maker == address(0)) revert OrderNotFound(orderId);
        if (order.maker != msg.sender) revert NotOrderOwner(orderId, msg.sender);
        if (order.status != FiebleTypes.OrderStatus.Open) revert OrderNotOpen(orderId);

        // --- EFFECTS ---
        order.status = FiebleTypes.OrderStatus.Cancelled;

        // --- INTERACTIONS ---
        // Kembalikan token ke lender jika ada deposit.
        if (order.side == FiebleTypes.OrderSide.Lend) {
            uint256 refundAmount = order.amount - order.filledAmount;
            if (refundAmount > 0) {
                token.safeTransfer(order.maker, refundAmount);
            }
        }

        emit OrderCancelled(orderId, msg.sender);
    }

    /// @inheritdoc ICLOBEngine
    function matchOrders(FiebleTypes.TenorBucket tenor) external nonReentrant returns (uint256 positionId) {
        // Cari best lend order (rate terendah, time paling awal)
        uint256 bestLendId = _findBestOrder(tenor, FiebleTypes.OrderSide.Lend, true);
        if (bestLendId == 0) revert NoMatchingOrder();

        // Cari best borrow order (rate tertinggi, time paling awal)
        uint256 bestBorrowId = _findBestOrder(tenor, FiebleTypes.OrderSide.Borrow, false);
        if (bestBorrowId == 0) revert NoMatchingOrder();

        FiebleTypes.Order storage lendOrder = _orders[bestLendId];
        FiebleTypes.Order storage borrowOrder = _orders[bestBorrowId];

        // Rate lend harus <= rate borrow untuk match
        if (lendOrder.rate > borrowOrder.rate) revert NoMatchingOrder();

        // Self-match prevention
        if (lendOrder.maker == borrowOrder.maker) revert SelfMatchNotAllowed();

        // Tentukan match amount
        uint256 matchAmount;
        {
            uint256 lendRemaining = lendOrder.amount - lendOrder.filledAmount;
            uint256 borrowRemaining = borrowOrder.amount - borrowOrder.filledAmount;
            matchAmount = lendRemaining < borrowRemaining ? lendRemaining : borrowRemaining;
        }

        // Execution rate: order yang masuk duluan menentukan harga (maker rate)
        uint256 executionRate = lendOrder.createdAt <= borrowOrder.createdAt ? lendOrder.rate : borrowOrder.rate;

        // --- EFFECTS ---
        lendOrder.filledAmount += matchAmount;
        borrowOrder.filledAmount += matchAmount;

        if (lendOrder.filledAmount == lendOrder.amount) {
            lendOrder.status = FiebleTypes.OrderStatus.Filled;
        }
        if (borrowOrder.filledAmount == borrowOrder.amount) {
            borrowOrder.status = FiebleTypes.OrderStatus.Filled;
        }

        // Buat posisi baru
        positionId = _nextPositionId++;

        _positions[positionId] = FiebleTypes.Position({
            id: positionId,
            lendOrderId: bestLendId,
            borrowOrderId: bestBorrowId,
            lender: lendOrder.maker,
            borrower: borrowOrder.maker,
            tenor: tenor,
            rate: executionRate,
            amount: matchAmount,
            startTime: block.timestamp,
            maturityTime: block.timestamp + FiebleTypes.tenorToDuration(tenor),
            settled: false
        });

        // --- INTERACTIONS ---
        // Transfer principal dari kontrak (sudah di-deposit lender) ke borrower
        token.safeTransfer(borrowOrder.maker, matchAmount);

        emit OrderMatched(positionId, bestLendId, bestBorrowId, matchAmount, executionRate, tenor);
    }

    // ============================================================
    //                      VIEW FUNCTIONS
    // ============================================================

    /// @inheritdoc ICLOBEngine
    function getOrder(uint256 orderId) external view returns (FiebleTypes.Order memory) {
        FiebleTypes.Order memory order = _orders[orderId];
        if (order.maker == address(0)) revert OrderNotFound(orderId);
        return order;
    }

    /// @inheritdoc ICLOBEngine
    function getPosition(uint256 positionId) external view returns (FiebleTypes.Position memory) {
        return _positions[positionId];
    }

    /// @inheritdoc ICLOBEngine
    function getOrderCount(FiebleTypes.TenorBucket tenor, FiebleTypes.OrderSide side) external view returns (uint256) {
        return _bucketOrderIds[_bucketKey(tenor, side)].length;
    }

    // ============================================================
    //                      INTERNAL FUNCTIONS
    // ============================================================

    /// @notice Cari order terbaik di bucket.
    /// @param ascending true = cari rate terendah (untuk lend), false = cari rate tertinggi (untuk borrow)
    function _findBestOrder(FiebleTypes.TenorBucket tenor, FiebleTypes.OrderSide side, bool ascending)
        internal
        view
        returns (uint256 bestOrderId)
    {
        bytes32 key = _bucketKey(tenor, side);
        uint256[] storage orderIds = _bucketOrderIds[key];

        uint256 bestRate = ascending ? type(uint256).max : 0;
        uint256 bestTime = type(uint256).max;

        for (uint256 i = 0; i < orderIds.length; i++) {
            FiebleTypes.Order storage order = _orders[orderIds[i]];

            // Skip order yang bukan Open atau sudah fully filled
            if (order.status != FiebleTypes.OrderStatus.Open) continue;
            if (order.filledAmount >= order.amount) continue;

            bool isBetter;
            if (ascending) {
                // Lend: cari rate terendah
                isBetter = order.rate < bestRate || (order.rate == bestRate && order.createdAt < bestTime);
            } else {
                // Borrow: cari rate tertinggi
                isBetter = order.rate > bestRate || (order.rate == bestRate && order.createdAt < bestTime);
            }

            if (isBetter) {
                bestRate = order.rate;
                bestTime = order.createdAt;
                bestOrderId = orderIds[i];
            }
        }
    }

    /// @notice Buat key unik untuk bucket (tenor + side).
    function _bucketKey(FiebleTypes.TenorBucket tenor, FiebleTypes.OrderSide side) internal pure returns (bytes32) {
        return keccak256(abi.encode(tenor, side));
    }
}
