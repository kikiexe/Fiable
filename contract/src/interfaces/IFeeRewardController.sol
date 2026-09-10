// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {FiebleTypes} from "../types/FiebleTypes.sol";

interface IFeeRewardController {
    // ============================================================
    //                      EVENTS
    // ============================================================

    event ProtocolFeeUpdated(uint256 oldFeeBps, uint256 newFeeBps, uint256 rewardTokenPriceUSD, uint256 timestamp);

    event OracleFeedUpdated(address indexed previousFeed, address indexed newFeed);

    event CircuitBreakerTriggered(uint256 attemptedFeeBps, uint256 clampedFeeBps);

    event EmergencyModeToggled(bool isEmergencyMode, uint256 manualFeeBps);

    // ============================================================
    //                      ERRORS
    // ============================================================

    error ZeroAddress();
    error InvalidFeeConfiguration(uint256 feeBps, uint256 minAllowed, uint256 maxAllowed);
    error StaleOraclePrice(uint256 updatedAt, uint256 maxDelay);
    error InvalidOraclePrice(int256 price);
    error UpkeepNotNeeded();
    error EmergencyModeActive();

    // ============================================================
    //                      CHAINLINK AUTOMATION
    // ============================================================

    /// @notice Mengecek apakah upkeep dibutuhkan oleh Chainlink Keeper.
    /// @param checkData Data masukan opsional dari Chainlink node.
    /// @return upkeepNeeded True jika interval waktu tercapai atau deviasi harga melampaui batas.
    /// @return performData Payload data yang dikirim ke performUpkeep.
    function checkUpkeep(bytes calldata checkData) external view returns (bool upkeepNeeded, bytes memory performData);

    /// @notice Mengeksekusi penyesuaian fee yang dipicu oleh Chainlink Keeper.
    /// @param performData Payload hasil verifikasi dari checkUpkeep.
    function performUpkeep(bytes calldata performData) external;

    // ============================================================
    //                      VIEW FUNCTIONS
    // ============================================================

    /// @notice Mengambil suku bunga fee protokol saat ini untuk bucket tenor tertentu.
    /// @param tenor Bucket tenor target.
    /// @return feeBps Biaya protokol dalam basis points (misal: 25 = 0.25%).
    function getProtocolFeeBps(FiebleTypes.TenorBucket tenor) external view returns (uint256 feeBps);

    /// @notice Menghitung proyeksi fee baru berdasarkan input harga token reward dan TWAP.
    function calculateProjectedFee(uint256 rewardTokenPriceUSD, uint256 twapRate)
        external
        view
        returns (uint256 projectedFeeBps);

    /// @notice Mengambil status parameter operasional controller.
    function getControllerStatus()
        external
        view
        returns (uint256 currentFeeBps, uint256 lastUpkeepTime, uint256 lastRecordedPrice, bool emergencyActive);
}
