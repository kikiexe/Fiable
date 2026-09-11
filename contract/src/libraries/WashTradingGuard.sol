// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {FiebleTypes} from "../types/FiebleTypes.sol";

/// @title WashTradingGuard
/// @notice Menghitung weighted volume untuk Matched-Volume Mining dengan mitigasi wash trading:
///         1. Minimum Holding Period: Posisi harus di-hold minimal 50% durasi tenor sebelum berhak reward.
///         2. Spread-Based Weighting: Volume dibobot berdasarkan deviasi eksekusi rate terhadap TWAP rate saat match.
library WashTradingGuard {
    /// @notice Rasio holding period minimum terhadap total durasi tenor (50% = 5_000 bps)
    uint256 internal constant MIN_HOLDING_RATIO_BPS = 5_000;

    /// @notice Batas maksimum deviasi rate terhadap TWAP sebelum bobot reward menjadi 0 (500 bps = 5.00%)
    uint256 internal constant MAX_DEVIATION_BPS = 500;

    /// @notice Basis points scale (100.00% = 10_000 bps)
    uint256 internal constant BPS_SCALE = 10_000;

    /// @notice Menghitung volume terbobot berdasarkan holding period dan deviasi rate terhadap TWAP.
    /// @param matchedAmount Nominal principal match
    /// @param executionRate Suku bunga eksekusi match (dalam bps)
    /// @param twapRateAtMatch Nilai TWAP saat match terjadi (dalam bps)
    /// @param startTime Timestamp match dibuat
    /// @param currentTime Timestamp saat klaim
    /// @param tenor Tenor bucket posisi
    /// @return weightedVolume Volume yang diakui untuk mining reward
    function calculateWeightedVolume(
        uint256 matchedAmount,
        uint256 executionRate,
        uint256 twapRateAtMatch,
        uint256 startTime,
        uint256 currentTime,
        FiebleTypes.TenorBucket tenor
    ) internal pure returns (uint256) {
        if (currentTime < startTime || matchedAmount == 0) {
            return 0;
        }

        uint256 tenorDuration = FiebleTypes.tenorToDuration(tenor);
        uint256 minHolding = (tenorDuration * MIN_HOLDING_RATIO_BPS) / BPS_SCALE;

        // Mitigasi Lapis 1: Holding period minimum (50% tenor)
        if (currentTime - startTime < minHolding) {
            return 0;
        }

        // Jika TWAP tidak terdefinisi (0), berikan bobot penuh 100%
        if (twapRateAtMatch == 0) {
            return matchedAmount;
        }

        // Mitigasi Lapis 2: Spread-based weighting terhadap TWAP
        uint256 deviation =
            executionRate > twapRateAtMatch ? executionRate - twapRateAtMatch : twapRateAtMatch - executionRate;

        if (deviation >= MAX_DEVIATION_BPS) {
            return 0;
        }

        // Linear penalty: weightBps = (MAX_DEVIATION_BPS - deviation) * 10_000 / MAX_DEVIATION_BPS
        uint256 weightBps = ((MAX_DEVIATION_BPS - deviation) * BPS_SCALE) / MAX_DEVIATION_BPS;

        return (matchedAmount * weightBps) / BPS_SCALE;
    }
}
