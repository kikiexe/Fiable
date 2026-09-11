// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {WashTradingGuard} from "../src/libraries/WashTradingGuard.sol";
import {FiebleTypes} from "../src/types/FiebleTypes.sol";

contract WashTradingGuardHarness {
    function calculateWeightedVolume(
        uint256 matchedAmount,
        uint256 executionRate,
        uint256 twapRateAtMatch,
        uint256 startTime,
        uint256 currentTime,
        FiebleTypes.TenorBucket tenor
    ) external pure returns (uint256) {
        return WashTradingGuard.calculateWeightedVolume(
            matchedAmount, executionRate, twapRateAtMatch, startTime, currentTime, tenor
        );
    }
}

contract WashTradingGuardTest is Test {
    WashTradingGuardHarness harness;

    uint256 constant AMOUNT = 10_000e6;
    uint256 constant BASE_RATE = 600; // 6.00%
    uint256 constant TWAP = 600; // 6.00%

    function setUp() public {
        harness = new WashTradingGuardHarness();
    }

    function test_HoldingPeriod_Thresholds() public view {
        uint256 start = 1000;

        // OneWeek: 7 days. 50% = 3.5 days = 302400s
        uint256 weekDuration = 7 days;
        uint256 minWeekHolding = weekDuration / 2;

        // Exactly 1 second before min holding -> 0
        uint256 volBefore = harness.calculateWeightedVolume(
            AMOUNT, BASE_RATE, TWAP, start, start + minWeekHolding - 1, FiebleTypes.TenorBucket.OneWeek
        );
        assertEq(volBefore, 0);

        // Exactly at min holding -> Full
        uint256 volAt = harness.calculateWeightedVolume(
            AMOUNT, BASE_RATE, TWAP, start, start + minWeekHolding, FiebleTypes.TenorBucket.OneWeek
        );
        assertEq(volAt, AMOUNT);

        // OneMonth: 30 days. 50% = 15 days
        uint256 monthDuration = 30 days;
        uint256 minMonthHolding = monthDuration / 2;
        assertEq(
            harness.calculateWeightedVolume(
                AMOUNT, BASE_RATE, TWAP, start, start + minMonthHolding - 1, FiebleTypes.TenorBucket.OneMonth
            ),
            0
        );
        assertEq(
            harness.calculateWeightedVolume(
                AMOUNT, BASE_RATE, TWAP, start, start + minMonthHolding, FiebleTypes.TenorBucket.OneMonth
            ),
            AMOUNT
        );
    }

    function test_SpreadDeviation_ZeroDeviation() public view {
        uint256 start = 1000;
        uint256 current = start + 4 days;

        uint256 vol = harness.calculateWeightedVolume(AMOUNT, 600, 600, start, current, FiebleTypes.TenorBucket.OneWeek);
        assertEq(vol, AMOUNT);
    }

    function test_SpreadDeviation_LinearTaper() public view {
        uint256 start = 1000;
        uint256 current = start + 4 days;

        // Deviation = 100 bps (MAX_DEVIATION_BPS is 500 bps) -> 400/500 = 80%
        uint256 vol100 =
            harness.calculateWeightedVolume(AMOUNT, 700, 600, start, current, FiebleTypes.TenorBucket.OneWeek);
        assertEq(vol100, (AMOUNT * 80) / 100);

        // Deviation = 250 bps -> 250/500 = 50%
        uint256 vol250 =
            harness.calculateWeightedVolume(AMOUNT, 350, 600, start, current, FiebleTypes.TenorBucket.OneWeek);
        assertEq(vol250, (AMOUNT * 50) / 100);

        // Deviation = 500 bps -> 0%
        uint256 vol500 =
            harness.calculateWeightedVolume(AMOUNT, 1100, 600, start, current, FiebleTypes.TenorBucket.OneWeek);
        assertEq(vol500, 0);

        // Deviation > 500 bps -> 0%
        uint256 vol600 =
            harness.calculateWeightedVolume(AMOUNT, 1300, 600, start, current, FiebleTypes.TenorBucket.OneWeek);
        assertEq(vol600, 0);
    }

    function test_ZeroTWAP_GivesFullWeight() public view {
        uint256 start = 1000;
        uint256 current = start + 4 days;

        uint256 vol = harness.calculateWeightedVolume(AMOUNT, 900, 0, start, current, FiebleTypes.TenorBucket.OneWeek);
        assertEq(vol, AMOUNT);
    }

    function test_EdgeCases() public view {
        uint256 start = 1000;

        // currentTime < startTime
        assertEq(
            harness.calculateWeightedVolume(
                AMOUNT, BASE_RATE, TWAP, start, start - 10, FiebleTypes.TenorBucket.OneWeek
            ),
            0
        );

        // matchedAmount == 0
        assertEq(
            harness.calculateWeightedVolume(0, BASE_RATE, TWAP, start, start + 4 days, FiebleTypes.TenorBucket.OneWeek),
            0
        );
    }
}
