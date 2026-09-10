// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IFeeRewardController} from "./interfaces/IFeeRewardController.sol";
import {IAMMFallback} from "./interfaces/IAMMFallback.sol";
import {FiebleTypes} from "./types/FiebleTypes.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

interface IAggregatorV3 {
    function latestRoundData()
        external
        view
        returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound);
}

contract FeeRewardController is IFeeRewardController, Ownable {
    // ============================================================
    //                      CONSTANTS
    // ============================================================

    uint256 public constant BPS_SCALE = 10_000;
    uint256 public constant ORACLE_PRICE_SCALE = 1e8; // 8 desimal Chainlink USD
    uint256 public constant MAX_ORACLE_DELAY = 2 hours;

    // Batas pengaman nilai fee protokol
    uint256 public constant MIN_FEE_BPS = 5; // 0.05%
    uint256 public constant MAX_FEE_BPS = 200; // 2.00%
    uint256 public constant DEFAULT_BASE_FEE = 15; // 0.15%

    // Circuit Breaker: maksimum kenaikan/penurunan fee per siklus upkeep
    uint256 public constant MAX_FEE_CHANGE_PER_CYCLE = 20; // 0.20%

    // ============================================================
    //                      STATE VARIABLES
    // ============================================================

    IAggregatorV3 public priceFeed;
    IAMMFallback public ammFallback;

    uint256 public protocolFeeBps;
    uint256 public lastUpkeepTimestamp;
    uint256 public upkeepInterval;

    // Parameter sensitivitas fee terhadap harga token reward
    // Target: jika harga token reward = 1.00 USD (1e8), kenaikan fee = 10 bps
    uint256 public feeSensitivityFactor = 10;

    // Bucket tenor sumber TWAP rate untuk baseline pasar (configurable)
    FiebleTypes.TenorBucket public twapSourceBucket = FiebleTypes.TenorBucket.OneMonth;

    // Emergency Manual Mode
    bool public emergencyManualMode;
    uint256 public manualFeeBps;

    // ============================================================
    //                      CONSTRUCTOR
    // ============================================================

    constructor(address priceFeedAddress, address ammFallbackAddress, uint256 initialUpkeepInterval)
        Ownable(msg.sender)
    {
        if (priceFeedAddress == address(0) || ammFallbackAddress == address(0)) {
            revert ZeroAddress();
        }

        priceFeed = IAggregatorV3(priceFeedAddress);
        ammFallback = IAMMFallback(ammFallbackAddress);

        protocolFeeBps = DEFAULT_BASE_FEE;
        upkeepInterval = initialUpkeepInterval;
        lastUpkeepTimestamp = block.timestamp;
    }

    // ============================================================
    //                      ADMIN SETTERS
    // ============================================================

    function setPriceFeed(address newFeed) external onlyOwner {
        if (newFeed == address(0)) revert ZeroAddress();
        address old = address(priceFeed);
        priceFeed = IAggregatorV3(newFeed);
        emit OracleFeedUpdated(old, newFeed);
    }

    function setUpkeepInterval(uint256 newInterval) external onlyOwner {
        upkeepInterval = newInterval;
    }

    function setSensitivityFactor(uint256 newFactor) external onlyOwner {
        feeSensitivityFactor = newFactor;
    }

    function setAMMFallback(address newAMM) external onlyOwner {
        if (newAMM == address(0)) revert ZeroAddress();
        ammFallback = IAMMFallback(newAMM);
    }

    function setTwapSourceBucket(FiebleTypes.TenorBucket newBucket) external onlyOwner {
        twapSourceBucket = newBucket;
    }

    function setEmergencyManualMode(bool active, uint256 fixedFeeBps) external onlyOwner {
        if (active && (fixedFeeBps < MIN_FEE_BPS || fixedFeeBps > MAX_FEE_BPS)) {
            revert InvalidFeeConfiguration(fixedFeeBps, MIN_FEE_BPS, MAX_FEE_BPS);
        }
        emergencyManualMode = active;
        manualFeeBps = fixedFeeBps;
        emit EmergencyModeToggled(active, fixedFeeBps);
    }

    // ============================================================
    //                      CHAINLINK AUTOMATION
    // ============================================================

    function checkUpkeep(bytes calldata) external view override returns (bool upkeepNeeded, bytes memory performData) {
        if (emergencyManualMode) {
            return (false, "");
        }

        bool timePassed = (block.timestamp - lastUpkeepTimestamp) >= upkeepInterval;

        (, int256 price,, uint256 updatedAt,) = priceFeed.latestRoundData();
        bool validOracle = (price > 0 && (block.timestamp - updatedAt) <= MAX_ORACLE_DELAY);

        if (timePassed && validOracle) {
            upkeepNeeded = true;
            performData = ""; // performUpkeep re-queries oracle secara independen
        }
    }

    function performUpkeep(
        bytes calldata /* performData */
    )
        external
        override
    {
        if (emergencyManualMode) revert EmergencyModeActive();
        if (block.timestamp - lastUpkeepTimestamp < upkeepInterval) {
            revert UpkeepNotNeeded();
        }

        (, int256 rawPrice,, uint256 updatedAt,) = priceFeed.latestRoundData();
        if (rawPrice <= 0) revert InvalidOraclePrice(rawPrice);
        if (block.timestamp - updatedAt > MAX_ORACLE_DELAY) {
            revert StaleOraclePrice(updatedAt, MAX_ORACLE_DELAY);
        }

        uint256 priceUSD = uint256(rawPrice);

        // Ambil TWAP dari bucket tenor yang dikonfigurasi sebagai baseline pasar
        uint256 twapRate = ammFallback.getTWAP(twapSourceBucket);

        uint256 targetFee = _computeDynamicFee(priceUSD, twapRate);
        uint256 clampedFee = _applyCircuitBreaker(targetFee);

        uint256 oldFee = protocolFeeBps;
        protocolFeeBps = clampedFee;
        lastUpkeepTimestamp = block.timestamp;

        emit ProtocolFeeUpdated(oldFee, clampedFee, priceUSD, block.timestamp);
    }

    // ============================================================
    //                      VIEW & CALCULATION
    // ============================================================

    /// @notice Fee protokol saat ini berlaku seragam untuk semua tenor.
    /// Parameter tenor diterima untuk forward-compatibility interface per-tenor di masa depan.
    function getProtocolFeeBps(
        FiebleTypes.TenorBucket /* tenor */
    )
        external
        view
        override
        returns (uint256)
    {
        if (emergencyManualMode) {
            return manualFeeBps;
        }
        return protocolFeeBps;
    }

    function calculateProjectedFee(uint256 rewardTokenPriceUSD, uint256 twapRate)
        external
        view
        override
        returns (uint256)
    {
        uint256 rawFee = _computeDynamicFee(rewardTokenPriceUSD, twapRate);
        return _applyCircuitBreaker(rawFee);
    }

    function getControllerStatus()
        external
        view
        override
        returns (uint256 currentFeeBps, uint256 lastUpkeepTime, uint256 lastRecordedPrice, bool emergencyActive)
    {
        (, int256 price,,,) = priceFeed.latestRoundData();
        return (
            emergencyManualMode ? manualFeeBps : protocolFeeBps,
            lastUpkeepTimestamp,
            price > 0 ? uint256(price) : 0,
            emergencyManualMode
        );
    }

    // ============================================================
    //                      INTERNAL FORMULAS
    // ============================================================

    function _computeDynamicFee(uint256 priceUSD, uint256 twapRate) internal view returns (uint256) {
        // Komponen harga: kenaikan harga token reward mendorong fee naik proporsional
        uint256 priceComponent = (priceUSD * feeSensitivityFactor) / ORACLE_PRICE_SCALE;

        // Komponen TWAP: deviasi rate pasar dari baseline menandakan anomali volume
        // Setiap 100 bps deviasi di atas baseline menambah 1 bps fee
        uint256 twapComponent = 0;
        if (twapRate > DEFAULT_BASE_FEE) {
            twapComponent = (twapRate - DEFAULT_BASE_FEE) / 100;
        }

        uint256 calculated = DEFAULT_BASE_FEE + priceComponent + twapComponent;

        if (calculated < MIN_FEE_BPS) return MIN_FEE_BPS;
        if (calculated > MAX_FEE_BPS) return MAX_FEE_BPS;
        return calculated;
    }

    function _applyCircuitBreaker(uint256 targetFee) internal view returns (uint256) {
        if (targetFee > protocolFeeBps) {
            uint256 increase = targetFee - protocolFeeBps;
            if (increase > MAX_FEE_CHANGE_PER_CYCLE) {
                return protocolFeeBps + MAX_FEE_CHANGE_PER_CYCLE;
            }
        } else {
            uint256 decrease = protocolFeeBps - targetFee;
            if (decrease > MAX_FEE_CHANGE_PER_CYCLE) {
                return protocolFeeBps - MAX_FEE_CHANGE_PER_CYCLE;
            }
        }
        return targetFee;
    }
}
