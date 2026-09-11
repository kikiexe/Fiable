// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {FiebleTypes} from "../types/FiebleTypes.sol";

interface IMiningReward {
    // ============================================================
    //                      EVENTS
    // ============================================================

    event MatchRecorded(
        uint256 indexed positionId,
        address indexed lender,
        address indexed borrower,
        uint256 matchedAmount,
        uint256 executionRate,
        uint256 twapRateAtMatch
    );

    event RewardAccrued(uint256 indexed positionId, address indexed participant, uint256 weightedVolume);

    event CLOBEngineSet(address indexed previousEngine, address indexed newEngine);

    // ============================================================
    //                      ERRORS
    // ============================================================

    error ZeroAddress();
    error Unauthorized();
    error AlreadyClaimed();
    error RecordNotFound();

    // ============================================================
    //                      FUNCTIONS
    // ============================================================

    function recordMatch(
        uint256 positionId,
        address lender,
        address borrower,
        FiebleTypes.TenorBucket tenor,
        uint256 matchedAmount,
        uint256 executionRate
    ) external;

    function claimWeightedVolume(uint256 positionId, bool asLender) external;

    function previewWeightedVolume(uint256 positionId) external view returns (uint256);
}
