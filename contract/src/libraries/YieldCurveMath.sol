// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {FiebleTypes} from "../types/FiebleTypes.sol";

library YieldCurveMath {
    // ============================================================
    //                      CONSTANTS (BPS)
    // ============================================================

    uint256 internal constant BPS_SCALE = 10_000;

    // Default Curve Parameters:
    // Base Rate: 500 bps = 5.00%
    uint256 internal constant DEFAULT_BASE_RATE = 500;
    // Optimal Utilization (Kink): 8000 bps = 80.00%
    uint256 internal constant DEFAULT_OPTIMAL_UTILIZATION = 8_000;
    // Slope 1: 400 bps = 4.00% (Rate pada kink = 500 + 400 = 900 bps / 9.00%)
    uint256 internal constant DEFAULT_SLOPE_1 = 400;
    // Slope 2: 3000 bps = 30.00% (Rate pada 100% utilisasi = 900 + 3000 = 3900 bps / 39.00%)
    uint256 internal constant DEFAULT_SLOPE_2 = 3_000;
    // Fallback Spread: 150 bps = 1.50%
    uint256 internal constant DEFAULT_SPREAD_BPS = 150;

    // ============================================================
    //                      STRUCTS
    // ============================================================

    struct CurveConfig {
        uint256 baseRate;
        uint256 optimalUtilization;
        uint256 slope1;
        uint256 slope2;
        uint256 spreadBps;
    }

    // ============================================================
    //                      CALCULATION FUNCTIONS
    // ============================================================

    /// @notice Menghitung tingkat utilisasi pool dalam basis points.
    function calculateUtilization(uint256 totalLiquidity, uint256 borrowedLiquidity)
        internal
        pure
        returns (uint256 utilizationBps)
    {
        if (totalLiquidity == 0) return 0;
        if (borrowedLiquidity >= totalLiquidity) return BPS_SCALE;
        return (borrowedLiquidity * BPS_SCALE) / totalLiquidity;
    }

    /// @notice Menghitung base rate kurva berdasarkan utilisasi saat ini.
    function calculateCurveRate(uint256 utilizationBps, CurveConfig memory config) internal pure returns (uint256) {
        if (utilizationBps <= config.optimalUtilization) {
            uint256 variableRate = (utilizationBps * config.slope1) / config.optimalUtilization;
            return config.baseRate + variableRate;
        } else {
            uint256 excessUtilization = utilizationBps - config.optimalUtilization;
            uint256 excessFactorDenominator = BPS_SCALE - config.optimalUtilization;
            uint256 variableRate = (excessUtilization * config.slope2) / excessFactorDenominator;
            return config.baseRate + config.slope1 + variableRate;
        }
    }

    /// @notice Menghitung suku bunga akhir untuk taker dengan memperhitungkan spread.
    /// @dev Borrower dikenakan markup (rate + spread).
    ///      Lender dikenakan markdown (rate - spread).
    function applySpread(uint256 curveRate, bool isBorrow, uint256 spreadBps)
        internal
        pure
        returns (uint256 effectiveRate)
    {
        if (isBorrow) {
            uint256 rate = curveRate + spreadBps;
            return rate > FiebleTypes.MAX_RATE_BPS ? FiebleTypes.MAX_RATE_BPS : rate;
        } else {
            if (curveRate <= spreadBps) {
                return 10; // Floor rate 0.10% untuk mencegah rate nol
            }
            return curveRate - spreadBps;
        }
    }

    /// @notice Konfigurasi kurva default siap pakai.
    function getDefaultConfig() internal pure returns (CurveConfig memory) {
        return CurveConfig({
            baseRate: DEFAULT_BASE_RATE,
            optimalUtilization: DEFAULT_OPTIMAL_UTILIZATION,
            slope1: DEFAULT_SLOPE_1,
            slope2: DEFAULT_SLOPE_2,
            spreadBps: DEFAULT_SPREAD_BPS
        });
    }
}
