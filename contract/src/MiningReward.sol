// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {WashTradingGuard} from "./libraries/WashTradingGuard.sol";
import {FiebleTypes} from "./types/FiebleTypes.sol";
import {IAMMFallback} from "./interfaces/IAMMFallback.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title MiningReward
/// @notice Mencatat setiap match organik dari CLOBEngine dan menghitung weighted volume
/// untuk Matched-Volume Mining, dibobot oleh WashTradingGuard (holding period + spread weighting).
/// @dev Tidak mint token asli, hanya tracking weighted volume onchain untuk dashboard/leaderboard.
contract MiningReward is Ownable {
    // ============================================================
    //                      STRUCTS
    // ============================================================

    struct MatchRecord {
        uint256 positionId;
        address lender;
        address borrower;
        FiebleTypes.TenorBucket tenor;
        uint256 matchedAmount;
        uint256 executionRate;
        uint256 twapRateAtMatch;
        uint256 startTime;
        bool claimedLender;
        bool claimedBorrower;
    }

    // ============================================================
    //                      STATE VARIABLES
    // ============================================================

    address public clobEngine;
    IAMMFallback public ammFallback;

    mapping(uint256 positionId => MatchRecord) public matchRecords;
    mapping(address participant => uint256) public totalWeightedVolume;

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
    //                      MODIFIERS
    // ============================================================

    modifier onlyCLOBEngine() {
        if (msg.sender != clobEngine) revert Unauthorized();
        _;
    }

    // ============================================================
    //                      CONSTRUCTOR
    // ============================================================

    constructor(address clobEngine_, address ammFallback_) Ownable(msg.sender) {
        if (clobEngine_ == address(0) || ammFallback_ == address(0)) revert ZeroAddress();
        clobEngine = clobEngine_;
        ammFallback = IAMMFallback(ammFallback_);
    }

    // ============================================================
    //                      ADMIN
    // ============================================================

    function setCLOBEngine(address newEngine) external onlyOwner {
        if (newEngine == address(0)) revert ZeroAddress();
        address old = clobEngine;
        clobEngine = newEngine;
        emit CLOBEngineSet(old, newEngine);
    }

    // ============================================================
    //                      RECORDING (dipanggil CLOBEngine)
    // ============================================================

    /// @notice Dipanggil oleh CLOBEngine setiap kali order berhasil matched secara organik (CLOB, bukan AMM fallback).
    /// @dev AMM fallback match sengaja TIDAK dicatat di sini, karena counterparty-nya adalah pool pasif,
    ///      bukan market maker organik yang perlu diinsentif oleh Matched-Volume Mining.
    function recordMatch(
        uint256 positionId,
        address lender,
        address borrower,
        FiebleTypes.TenorBucket tenor,
        uint256 matchedAmount,
        uint256 executionRate
    ) external onlyCLOBEngine {
        uint256 twap = ammFallback.getTWAP(tenor);

        matchRecords[positionId] = MatchRecord({
            positionId: positionId,
            lender: lender,
            borrower: borrower,
            tenor: tenor,
            matchedAmount: matchedAmount,
            executionRate: executionRate,
            twapRateAtMatch: twap,
            startTime: block.timestamp,
            claimedLender: false,
            claimedBorrower: false
        });

        emit MatchRecorded(positionId, lender, borrower, matchedAmount, executionRate, twap);
    }

    // ============================================================
    //                      CLAIM (dipanggil user)
    // ============================================================

    /// @notice Klaim weighted volume untuk satu sisi (lender atau borrower) dari sebuah posisi.
    /// @dev Hanya bisa diklaim sekali per sisi. WashTradingGuard menentukan berapa weighted volume
    ///      yang valid berdasarkan holding period dan kedekatan rate ke TWAP saat match terjadi.
    function claimWeightedVolume(uint256 positionId, bool asLender) external {
        MatchRecord storage rec = matchRecords[positionId];
        if (rec.startTime == 0) revert RecordNotFound();

        address participant = asLender ? rec.lender : rec.borrower;
        if (msg.sender != participant) revert Unauthorized();

        if (asLender) {
            if (rec.claimedLender) revert AlreadyClaimed();
            rec.claimedLender = true;
        } else {
            if (rec.claimedBorrower) revert AlreadyClaimed();
            rec.claimedBorrower = true;
        }

        uint256 weighted = WashTradingGuard.calculateWeightedVolume(
            rec.matchedAmount, rec.executionRate, rec.twapRateAtMatch, rec.startTime, block.timestamp, rec.tenor
        );

        totalWeightedVolume[participant] += weighted;
        emit RewardAccrued(positionId, participant, weighted);
    }

    // ============================================================
    //                      VIEW
    // ============================================================

    function getMatchRecord(uint256 positionId) external view returns (MatchRecord memory) {
        return matchRecords[positionId];
    }

    /// @notice Preview weighted volume tanpa mengubah state, untuk ditampilkan di frontend sebelum klaim.
    function previewWeightedVolume(uint256 positionId) external view returns (uint256) {
        MatchRecord storage rec = matchRecords[positionId];
        if (rec.startTime == 0) return 0;
        return WashTradingGuard.calculateWeightedVolume(
            rec.matchedAmount, rec.executionRate, rec.twapRateAtMatch, rec.startTime, block.timestamp, rec.tenor
        );
    }
}
