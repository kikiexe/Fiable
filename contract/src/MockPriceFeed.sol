// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// MOCK: Feed ini hanya untuk testing dan simulasi Chainlink Price Feed di Monad Testnet.

contract MockPriceFeed {
    uint8 public constant decimals = 8;
    string public description;
    uint256 public constant version = 1;

    int256 private _price;
    uint256 private _updatedAt;
    uint80 private _roundId = 1;

    constructor(string memory description_, int256 initialPrice_) {
        description = description_;
        _price = initialPrice_;
        _updatedAt = block.timestamp;
    }

    /// @notice Mengatur harga baru untuk simulasi pasar.
    function setPrice(int256 newPrice) external {
        _price = newPrice;
        _updatedAt = block.timestamp;
        _roundId++;
    }

    /// @notice Mengatur timestamp manual untuk menguji skenario data kadaluarsa (stale).
    function setUpdatedAt(uint256 newTimestamp) external {
        _updatedAt = newTimestamp;
    }

    function latestRoundData()
        external
        view
        returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        )
    {
        return (_roundId, _price, _updatedAt, _updatedAt, _roundId);
    }
}
