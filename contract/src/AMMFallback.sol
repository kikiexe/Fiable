// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IAMMFallback} from "./interfaces/IAMMFallback.sol";
import {FiebleTypes} from "./types/FiebleTypes.sol";
import {YieldCurveMath} from "./libraries/YieldCurveMath.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract AMMFallback is IAMMFallback, ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;
    using YieldCurveMath for YieldCurveMath.CurveConfig;

    // ============================================================
    //                      STATE VARIABLES
    // ============================================================

    IERC20 public immutable token;
    address public clobEngine;

    YieldCurveMath.CurveConfig public curveConfig;

    struct BucketPool {
        uint256 totalLiquidity; // Modal pasif LP
        uint256 borrowedLiquidity; // Likuiditas yang dipinjam taker
        uint256 totalShares; // Total LP shares
        uint256 cumulativeRate; // Akumulasi rate * waktu
        uint256 lastUpdateTimestamp;
        uint256 lastRecordedRate;
        uint256 creationTimestamp; // Timestamp inisialisasi pool
        uint256 takerLentLiquidity; // Pokok penempatan taker (terpisah agar LP tidak mencuri dana)
        mapping(address => uint256) shares;
    }

    mapping(FiebleTypes.TenorBucket => BucketPool) private _pools;

    // ============================================================
    //                      MODIFIERS
    // ============================================================

    modifier onlyAuthorizedRouter() {
        if (msg.sender != clobEngine && msg.sender != owner()) {
            revert OnlyCLOBEngineAllowed(msg.sender, clobEngine);
        }
        _;
    }

    // ============================================================
    //                      CONSTRUCTOR
    // ============================================================

    constructor(address tokenAddress) Ownable(msg.sender) {
        if (tokenAddress == address(0)) revert ZeroAddress();
        token = IERC20(tokenAddress);
        curveConfig = YieldCurveMath.getDefaultConfig();
    }

    // ============================================================
    //                      ADMIN FUNCTIONS
    // ============================================================

    function setCLOBEngine(address clobEngineAddress) external onlyOwner {
        if (clobEngineAddress == address(0)) revert ZeroAddress();
        clobEngine = clobEngineAddress;
    }

    function setRateModel(
        uint256 baseRate,
        uint256 optimalUtilization,
        uint256 slope1,
        uint256 slope2,
        uint256 spreadBps
    ) external onlyOwner {
        curveConfig = YieldCurveMath.CurveConfig({
            baseRate: baseRate,
            optimalUtilization: optimalUtilization,
            slope1: slope1,
            slope2: slope2,
            spreadBps: spreadBps
        });

        emit RateModelUpdated(baseRate, optimalUtilization, slope1, slope2, spreadBps);
    }

    // ============================================================
    //                      LP FUNCTIONS
    // ============================================================

    function addLiquidity(FiebleTypes.TenorBucket tenor, uint256 amount)
        external
        nonReentrant
        returns (uint256 sharesMinted)
    {
        if (amount == 0) revert ZeroAmount();

        BucketPool storage pool = _pools[tenor];

        if (pool.creationTimestamp == 0) {
            pool.creationTimestamp = block.timestamp;
        }

        if (pool.totalShares == 0 || pool.totalLiquidity == 0) {
            sharesMinted = amount;
        } else {
            sharesMinted = (amount * pool.totalShares) / pool.totalLiquidity;
        }

        pool.shares[msg.sender] += sharesMinted;
        pool.totalShares += sharesMinted;
        pool.totalLiquidity += amount;

        _updateTWAP(tenor);

        token.safeTransferFrom(msg.sender, address(this), amount);

        emit LiquidityAdded(msg.sender, tenor, amount, sharesMinted);
    }

    function removeLiquidity(FiebleTypes.TenorBucket tenor, uint256 shares)
        external
        nonReentrant
        returns (uint256 amountReturned)
    {
        if (shares == 0) revert ZeroAmount();

        BucketPool storage pool = _pools[tenor];
        uint256 userShares = pool.shares[msg.sender];
        if (userShares < shares) {
            revert InsufficientShares(shares, userShares);
        }

        // Nilai share LP dihitung murni dari modal LP (totalLiquidity), bukan dari takerLentLiquidity
        amountReturned = (shares * pool.totalLiquidity) / pool.totalShares;

        uint256 availableLPLiquidity =
            pool.totalLiquidity > pool.borrowedLiquidity ? pool.totalLiquidity - pool.borrowedLiquidity : 0;

        if (amountReturned > availableLPLiquidity) {
            revert InsufficientPoolLiquidity(amountReturned, availableLPLiquidity);
        }

        pool.shares[msg.sender] -= shares;
        pool.totalShares -= shares;
        pool.totalLiquidity -= amountReturned;

        _updateTWAP(tenor);

        token.safeTransfer(msg.sender, amountReturned);

        emit LiquidityRemoved(msg.sender, tenor, amountReturned, shares);
    }

    // ============================================================
    //                      SWAP EXECUTION
    // ============================================================

    function swap(
        FiebleTypes.OrderSide side,
        FiebleTypes.TenorBucket tenor,
        uint256 amount,
        uint256 maxSlippageRate,
        address recipient
    ) external nonReentrant onlyAuthorizedRouter returns (uint256 executionRate) {
        if (amount == 0) revert ZeroAmount();
        if (recipient == address(0)) revert ZeroAddress();

        BucketPool storage pool = _pools[tenor];

        bool isBorrow = (side == FiebleTypes.OrderSide.Borrow);

        // Utilisasi marginal pasca-order (konsisten dengan getQuoteRate)
        uint256 poolTotal = pool.totalLiquidity + pool.takerLentLiquidity;
        uint256 nextBorrowed = isBorrow ? pool.borrowedLiquidity + amount : pool.borrowedLiquidity;
        uint256 nextTotal = isBorrow ? poolTotal : poolTotal + amount;
        uint256 util = YieldCurveMath.calculateUtilization(nextTotal, nextBorrowed);
        uint256 baseCurveRate = YieldCurveMath.calculateCurveRate(util, curveConfig);
        executionRate = YieldCurveMath.applySpread(baseCurveRate, isBorrow, curveConfig.spreadBps);

        if (isBorrow) {
            // Borrower ingin rate serendah mungkin; jangan melebihi maxSlippageRate
            if (maxSlippageRate > 0 && executionRate > maxSlippageRate) {
                revert SlippageLimitExceeded(executionRate, maxSlippageRate);
            }

            uint256 available = poolTotal > pool.borrowedLiquidity ? poolTotal - pool.borrowedLiquidity : 0;
            if (amount > available) {
                revert InsufficientPoolLiquidity(amount, available);
            }

            pool.borrowedLiquidity += amount;
            token.safeTransfer(recipient, amount);
        } else {
            // Lender ingin rate setinggi mungkin; jangan lebih rendah dari maxSlippageRate
            if (maxSlippageRate > 0 && executionRate < maxSlippageRate) {
                revert SlippageLimitExceeded(executionRate, maxSlippageRate);
            }

            // Simpan likuiditas taker secara terpisah agar LP tidak mencuri pokok taker
            pool.takerLentLiquidity += amount;
            token.safeTransferFrom(msg.sender, address(this), amount);
        }

        _updateTWAPWithRate(tenor, executionRate);

        emit AMMSwapped(recipient, side, tenor, amount, executionRate);
    }

    // ============================================================
    //                      VIEW FUNCTIONS
    // ============================================================

    function getQuoteRate(FiebleTypes.TenorBucket tenor, FiebleTypes.OrderSide side, uint256 amount)
        external
        view
        returns (uint256)
    {
        BucketPool storage pool = _pools[tenor];
        bool isBorrow = (side == FiebleTypes.OrderSide.Borrow);

        uint256 poolTotal = pool.totalLiquidity + pool.takerLentLiquidity;
        uint256 prospectiveBorrowed = isBorrow ? pool.borrowedLiquidity + amount : pool.borrowedLiquidity;
        uint256 prospectiveTotal = isBorrow ? poolTotal : poolTotal + amount;

        uint256 util = YieldCurveMath.calculateUtilization(prospectiveTotal, prospectiveBorrowed);
        uint256 curveRate = YieldCurveMath.calculateCurveRate(util, curveConfig);
        return YieldCurveMath.applySpread(curveRate, isBorrow, curveConfig.spreadBps);
    }

    function getPoolInfo(FiebleTypes.TenorBucket tenor)
        external
        view
        returns (
            uint256 totalLiquidity,
            uint256 borrowedLiquidity,
            uint256 totalShares,
            uint256 utilizationBps,
            uint256 currentRateBps
        )
    {
        BucketPool storage pool = _pools[tenor];
        totalLiquidity = pool.totalLiquidity + pool.takerLentLiquidity;
        borrowedLiquidity = pool.borrowedLiquidity;
        totalShares = pool.totalShares;
        utilizationBps = YieldCurveMath.calculateUtilization(totalLiquidity, borrowedLiquidity);
        uint256 baseRate = YieldCurveMath.calculateCurveRate(utilizationBps, curveConfig);
        currentRateBps = baseRate;
    }

    function getTWAP(FiebleTypes.TenorBucket tenor) external view returns (uint256) {
        BucketPool storage pool = _pools[tenor];
        if (pool.lastUpdateTimestamp == 0) {
            return curveConfig.baseRate;
        }

        uint256 timeElapsed = block.timestamp - pool.lastUpdateTimestamp;
        if (timeElapsed == 0 && pool.cumulativeRate == 0) {
            return pool.lastRecordedRate;
        }

        uint256 totalCumulative = pool.cumulativeRate + (pool.lastRecordedRate * timeElapsed);
        uint256 totalDuration = block.timestamp - pool.creationTimestamp;
        if (totalDuration == 0) {
            return pool.lastRecordedRate;
        }
        return totalCumulative / totalDuration;
    }

    function getUserShares(FiebleTypes.TenorBucket tenor, address user) external view returns (uint256) {
        return _pools[tenor].shares[user];
    }

    // ============================================================
    //                      INTERNAL FUNCTIONS
    // ============================================================

    function _updateTWAP(FiebleTypes.TenorBucket tenor) internal {
        BucketPool storage pool = _pools[tenor];
        uint256 poolTotal = pool.totalLiquidity + pool.takerLentLiquidity;
        uint256 util = YieldCurveMath.calculateUtilization(poolTotal, pool.borrowedLiquidity);
        uint256 currentRate = YieldCurveMath.calculateCurveRate(util, curveConfig);
        _updateTWAPWithRate(tenor, currentRate);
    }

    function _updateTWAPWithRate(FiebleTypes.TenorBucket tenor, uint256 currentRate) internal {
        BucketPool storage pool = _pools[tenor];
        if (pool.creationTimestamp == 0) {
            pool.creationTimestamp = block.timestamp;
        }
        if (pool.lastUpdateTimestamp == 0) {
            pool.lastUpdateTimestamp = block.timestamp;
            pool.lastRecordedRate = currentRate;
            return;
        }

        uint256 timeElapsed = block.timestamp - pool.lastUpdateTimestamp;
        if (timeElapsed > 0) {
            pool.cumulativeRate += pool.lastRecordedRate * timeElapsed;
            pool.lastUpdateTimestamp = block.timestamp;
            pool.lastRecordedRate = currentRate;
        }
    }
}
