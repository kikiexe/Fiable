// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ICLOBEngine} from "./interfaces/ICLOBEngine.sol";
import {IAMMFallback} from "./interfaces/IAMMFallback.sol";
import {FiebleTypes} from "./types/FiebleTypes.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract CLOBEngine is ICLOBEngine, ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    // ============================================================
    //                      STATE VARIABLES
    // ============================================================

    /// @notice Token yang digunakan sebagai principal (misal USDC).
    IERC20 public immutable token;

    /// @notice Alamat kontrak AMMFallback resmi.
    address public ammFallback;

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
    /// @dev KNOWN LIMITATION: O(n) scan with unbounded array growth. Not production viable. Planned migration to doubly-linked list or sorted red-black tree.
    mapping(bytes32 bucketKey => uint256[]) private _bucketOrderIds;

    /// @notice Jumlah order berstatus Open per bucket.
    mapping(bytes32 bucketKey => uint256) private _activeOrderCount;

    // ============================================================
    //                      CONSTRUCTOR
    // ============================================================

    /// @param token_ Alamat token ERC20 yang digunakan sebagai principal.
    constructor(address token_) Ownable(msg.sender) {
        if (token_ == address(0)) revert ZeroAddress();
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
        _activeOrderCount[key]++;

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
        bytes32 key = _bucketKey(order.tenor, order.side);
        if (_activeOrderCount[key] > 0) {
            _activeOrderCount[key]--;
        }

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
        uint256 bestLendId = _findBestOrder(tenor, FiebleTypes.OrderSide.Lend, true, address(0));
        if (bestLendId == 0) revert NoMatchingOrder();

        // Cari best borrow order (rate tertinggi, time paling awal)
        uint256 bestBorrowId = _findBestOrder(tenor, FiebleTypes.OrderSide.Borrow, false, address(0));
        if (bestBorrowId == 0) revert NoMatchingOrder();

        FiebleTypes.Order storage lendOrder = _orders[bestLendId];
        FiebleTypes.Order storage borrowOrder = _orders[bestBorrowId];

        // Self-match handling: jika top order memiliki maker yang sama, coba cari alternatif yang bersilangan
        if (lendOrder.maker == borrowOrder.maker) {
            uint256 altBorrowId = _findBestOrder(tenor, FiebleTypes.OrderSide.Borrow, false, lendOrder.maker);
            uint256 altLendId = _findBestOrder(tenor, FiebleTypes.OrderSide.Lend, true, borrowOrder.maker);

            bool canAltBorrow = (altBorrowId != 0 && lendOrder.rate <= _orders[altBorrowId].rate);
            bool canAltLend = (altLendId != 0 && _orders[altLendId].rate <= borrowOrder.rate);

            if (canAltBorrow && canAltLend) {
                uint256 surplusBorrow = _orders[altBorrowId].rate - lendOrder.rate;
                uint256 surplusLend = borrowOrder.rate - _orders[altLendId].rate;
                if (surplusBorrow >= surplusLend) {
                    bestBorrowId = altBorrowId;
                    borrowOrder = _orders[bestBorrowId];
                } else {
                    bestLendId = altLendId;
                    lendOrder = _orders[bestLendId];
                }
            } else if (canAltBorrow) {
                bestBorrowId = altBorrowId;
                borrowOrder = _orders[bestBorrowId];
            } else if (canAltLend) {
                bestLendId = altLendId;
                lendOrder = _orders[bestLendId];
            } else {
                revert SelfMatchNotAllowed();
            }
        }

        // Rate lend harus <= rate borrow untuk match
        if (lendOrder.rate > borrowOrder.rate) revert NoMatchingOrder();

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
            bytes32 lendKey = _bucketKey(tenor, FiebleTypes.OrderSide.Lend);
            if (_activeOrderCount[lendKey] > 0) {
                _activeOrderCount[lendKey]--;
            }
        }
        if (borrowOrder.filledAmount == borrowOrder.amount) {
            borrowOrder.status = FiebleTypes.OrderStatus.Filled;
            bytes32 borrowKey = _bucketKey(tenor, FiebleTypes.OrderSide.Borrow);
            if (_activeOrderCount[borrowKey] > 0) {
                _activeOrderCount[borrowKey]--;
            }
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

    /// @inheritdoc ICLOBEngine
    function executeMarketOrder(
        FiebleTypes.OrderSide side,
        FiebleTypes.TenorBucket tenor,
        uint256 amount,
        uint256 maxSlippageRate
    ) external nonReentrant returns (uint256 positionId) {
        if (amount < FiebleTypes.MIN_ORDER_AMOUNT) {
            revert InvalidAmount(amount);
        }
        if (ammFallback == address(0)) {
            revert AMMFallbackNotConfigured();
        }

        uint256 remainingAmount = amount;
        uint256 clobMatchedAmount = 0;
        uint256 weightedRateSum = 0;
        uint256 lastPositionId = 0;

        FiebleTypes.OrderSide oppositeSide =
            (side == FiebleTypes.OrderSide.Lend) ? FiebleTypes.OrderSide.Borrow : FiebleTypes.OrderSide.Lend;

        // === TAHAP 1: MATCHING CLOB ORGANIK TERLEBIH DAHULU ===
        while (remainingAmount > 0) {
            bool isAscending = (oppositeSide == FiebleTypes.OrderSide.Lend);
            uint256 bestOrderId = _findBestOrder(tenor, oppositeSide, isAscending, msg.sender);
            if (bestOrderId == 0) break;

            FiebleTypes.Order storage makerOrder = _orders[bestOrderId];

            // Validasi batas rate toleransi taker
            if (side == FiebleTypes.OrderSide.Borrow && makerOrder.rate > maxSlippageRate && maxSlippageRate > 0) {
                break;
            }
            if (side == FiebleTypes.OrderSide.Lend && makerOrder.rate < maxSlippageRate && maxSlippageRate > 0) {
                break;
            }

            uint256 availableInOrder = makerOrder.amount - makerOrder.filledAmount;
            uint256 fillAmount = remainingAmount < availableInOrder ? remainingAmount : availableInOrder;

            makerOrder.filledAmount += fillAmount;
            if (makerOrder.filledAmount == makerOrder.amount) {
                makerOrder.status = FiebleTypes.OrderStatus.Filled;
                bytes32 makerKey = _bucketKey(tenor, oppositeSide);
                if (_activeOrderCount[makerKey] > 0) {
                    _activeOrderCount[makerKey]--;
                }
            }

            weightedRateSum += fillAmount * makerOrder.rate;
            clobMatchedAmount += fillAmount;
            remainingAmount -= fillAmount;

            lastPositionId =
                _recordMarketCLOBFill(side, tenor, bestOrderId, makerOrder.maker, fillAmount, makerOrder.rate);
        }

        // === TAHAP 2: RESIDUAL ROUTING KE AMM FALLBACK ===
        uint256 ammMatchedAmount = 0;

        if (remainingAmount > 0) {
            ammMatchedAmount = remainingAmount;
            uint256 ammRate;

            if (side == FiebleTypes.OrderSide.Lend) {
                token.safeTransferFrom(msg.sender, address(this), remainingAmount);
                token.forceApprove(ammFallback, remainingAmount);
                ammRate = IAMMFallback(ammFallback).swap(side, tenor, remainingAmount, maxSlippageRate, address(this));
            } else {
                ammRate = IAMMFallback(ammFallback).swap(side, tenor, remainingAmount, maxSlippageRate, msg.sender);
            }

            weightedRateSum += remainingAmount * ammRate;

            lastPositionId = _recordAMMPosition(side, tenor, remainingAmount, ammRate);
            remainingAmount = 0;
        }

        uint256 effectiveRate = weightedRateSum / amount;

        emit MarketOrderExecuted(
            lastPositionId, msg.sender, side, tenor, amount, clobMatchedAmount, ammMatchedAmount, effectiveRate
        );

        return lastPositionId;
    }

    // ============================================================
    //                      ADMIN FUNCTIONS
    // ============================================================

    /// @inheritdoc ICLOBEngine
    function setAMMFallback(address ammFallbackAddress) external onlyOwner {
        if (ammFallbackAddress == address(0)) revert AMMFallbackNotConfigured();
        address previous = ammFallback;
        ammFallback = ammFallbackAddress;
        emit AMMFallbackSet(previous, ammFallbackAddress);
    }

    /// @inheritdoc ICLOBEngine
    function getAMMFallback() external view returns (address) {
        return ammFallback;
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
        return _activeOrderCount[_bucketKey(tenor, side)];
    }

    /// @inheritdoc ICLOBEngine
    function getTotalOrderCount(FiebleTypes.TenorBucket tenor, FiebleTypes.OrderSide side)
        external
        view
        returns (uint256)
    {
        return _bucketOrderIds[_bucketKey(tenor, side)].length;
    }

    /// @inheritdoc ICLOBEngine
    function settlePosition(uint256 positionId) external nonReentrant {
        FiebleTypes.Position storage pos = _positions[positionId];
        if (pos.id == 0) revert PositionNotFound(positionId);
        if (pos.settled) revert PositionAlreadySettled(positionId);
        if (block.timestamp < pos.maturityTime) {
            revert PositionNotMatured(positionId, pos.maturityTime, block.timestamp);
        }

        pos.settled = true;
        uint256 duration = FiebleTypes.tenorToDuration(pos.tenor);
        uint256 interest = (pos.amount * pos.rate * duration) / (FiebleTypes.BPS_DENOMINATOR * 365 days);
        uint256 totalRepayment = pos.amount + interest;

        if (pos.lender == ammFallback) {
            // Borrower melunasi pinjaman ke AMM: transfer token ke AMM dan catat pelunasan
            token.safeTransferFrom(pos.borrower, ammFallback, totalRepayment);
            IAMMFallback(ammFallback).repayBorrow(pos.tenor, pos.amount, interest);
        } else if (pos.borrower == ammFallback) {
            // Lender mencairkan dana dari AMM: AMM mencairkan pokok + bunga langsung ke lender
            IAMMFallback(ammFallback).repayLender(pos.tenor, pos.lender, pos.amount, interest);
        } else {
            // Posisi kredit P2P CLOB organik antar pengguna
            token.safeTransferFrom(pos.borrower, pos.lender, totalRepayment);
        }

        emit PositionSettled(positionId, totalRepayment);
    }

    // ============================================================
    //                      INTERNAL FUNCTIONS
    // ============================================================

    /// @notice Catat posisi kredit untuk fill organik CLOB dan kirim token.
    function _recordMarketCLOBFill(
        FiebleTypes.OrderSide side,
        FiebleTypes.TenorBucket tenor,
        uint256 bestOrderId,
        address maker,
        uint256 fillAmount,
        uint256 rate
    ) internal returns (uint256 posId) {
        posId = _nextPositionId++;
        uint256 lendOrderId = (side == FiebleTypes.OrderSide.Lend) ? 0 : bestOrderId;
        uint256 borrowOrderId = (side == FiebleTypes.OrderSide.Borrow) ? 0 : bestOrderId;

        _positions[posId] = FiebleTypes.Position({
            id: posId,
            lendOrderId: lendOrderId,
            borrowOrderId: borrowOrderId,
            lender: (side == FiebleTypes.OrderSide.Lend) ? msg.sender : maker,
            borrower: (side == FiebleTypes.OrderSide.Borrow) ? msg.sender : maker,
            tenor: tenor,
            rate: rate,
            amount: fillAmount,
            startTime: block.timestamp,
            maturityTime: block.timestamp + FiebleTypes.tenorToDuration(tenor),
            settled: false
        });

        if (side == FiebleTypes.OrderSide.Lend) {
            token.safeTransferFrom(msg.sender, maker, fillAmount);
        } else {
            token.safeTransfer(msg.sender, fillAmount);
        }

        emit OrderMatched(posId, lendOrderId, borrowOrderId, fillAmount, rate, tenor);
    }

    /// @notice Catat posisi kredit untuk residual AMM Fallback.
    function _recordAMMPosition(FiebleTypes.OrderSide side, FiebleTypes.TenorBucket tenor, uint256 amount, uint256 rate)
        internal
        returns (uint256 posId)
    {
        posId = _nextPositionId++;
        _positions[posId] = FiebleTypes.Position({
            id: posId,
            lendOrderId: 0,
            borrowOrderId: 0,
            lender: (side == FiebleTypes.OrderSide.Lend) ? msg.sender : ammFallback,
            borrower: (side == FiebleTypes.OrderSide.Borrow) ? msg.sender : ammFallback,
            tenor: tenor,
            rate: rate,
            amount: amount,
            startTime: block.timestamp,
            maturityTime: block.timestamp + FiebleTypes.tenorToDuration(tenor),
            settled: false
        });

        // Emit OrderMatched dengan orderId=0 untuk memudahkan tracking subgraphs/indexers
        emit OrderMatched(posId, 0, 0, amount, rate, tenor);
    }

    /// @notice Cari order terbaik di bucket.
    /// @param ascending true = cari rate terendah (untuk lend), false = cari rate tertinggi (untuk borrow)
    /// @param excludeMaker Alamat maker yang diabaikan (untuk mencegah self-trade saat market order)
    function _findBestOrder(
        FiebleTypes.TenorBucket tenor,
        FiebleTypes.OrderSide side,
        bool ascending,
        address excludeMaker
    ) internal view returns (uint256 bestOrderId) {
        bytes32 key = _bucketKey(tenor, side);
        uint256[] storage orderIds = _bucketOrderIds[key];

        uint256 bestRate = ascending ? type(uint256).max : 0;
        uint256 bestTime = type(uint256).max;

        for (uint256 i = 0; i < orderIds.length; i++) {
            FiebleTypes.Order storage order = _orders[orderIds[i]];

            // Skip order yang bukan Open atau sudah fully filled
            if (order.status != FiebleTypes.OrderStatus.Open) continue;
            if (order.filledAmount >= order.amount) continue;
            if (excludeMaker != address(0) && order.maker == excludeMaker) continue;

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
