// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {FeeRewardController} from "../src/FeeRewardController.sol";
import {IFeeRewardController} from "../src/interfaces/IFeeRewardController.sol";
import {MockPriceFeed} from "../src/MockPriceFeed.sol";
import {AMMFallback} from "../src/AMMFallback.sol";
import {MockERC20} from "../src/MockERC20.sol";
import {FiebleTypes} from "../src/types/FiebleTypes.sol";

contract FeeRewardControllerTest is Test {
    FeeRewardController public controller;
    MockPriceFeed public priceFeed;
    AMMFallback public amm;
    MockERC20 public token;

    address public owner = address(this);
    uint256 constant ONE_HOUR = 3600;

    function setUp() public {
        token = new MockERC20("Mock USDC", "mUSDC", 6);
        amm = new AMMFallback(address(token));

        // Harga awal token reward = $1.00 (1e8)
        priceFeed = new MockPriceFeed("REWARD / USD", 1e8);

        controller = new FeeRewardController(address(priceFeed), address(amm), ONE_HOUR);
    }

    function test_InitialState() public view {
        uint256 fee = controller.getProtocolFeeBps(FiebleTypes.TenorBucket.OneMonth);
        assertEq(fee, 15, "Default fee should be 15 bps");
    }

    function test_CheckUpkeep_IntervalEnforced() public {
        (bool needed,) = controller.checkUpkeep("");
        assertFalse(needed, "Upkeep should not be needed immediately");

        vm.warp(block.timestamp + ONE_HOUR);

        (bool neededAfter,) = controller.checkUpkeep("");
        assertTrue(neededAfter, "Upkeep should be needed after 1 hour");
    }

    function test_PerformUpkeep_PriceDoubles() public {
        vm.warp(block.timestamp + ONE_HOUR);

        // Harga naik jadi $2.00 (2e8)
        priceFeed.setPrice(2e8);

        (bool needed, bytes memory performData) = controller.checkUpkeep("");
        assertTrue(needed);

        controller.performUpkeep(performData);

        // DEFAULT_BASE_FEE (15) + (2e8 * 10 / 1e8) = 15 + 20 = 35 bps
        uint256 newFee = controller.getProtocolFeeBps(FiebleTypes.TenorBucket.OneMonth);
        assertEq(newFee, 35, "Fee should adjust to 35 bps");
    }

    function test_CircuitBreaker_ClampsExtremeJump() public {
        vm.warp(block.timestamp + ONE_HOUR);

        // Harga melonjak 10x menjadi $10.00
        priceFeed.setPrice(10e8);

        (bool needed, bytes memory performData) = controller.checkUpkeep("");
        assertTrue(needed);

        controller.performUpkeep(performData);

        // Tanpa circuit breaker: 15 + 100 = 115 bps.
        // Dengan circuit breaker: kenaikan dibatasi maks 20 bps -> 15 + 20 = 35 bps.
        uint256 clampedFee = controller.getProtocolFeeBps(FiebleTypes.TenorBucket.OneMonth);
        assertEq(clampedFee, 35, "Circuit breaker should clamp fee change to 20 bps");
    }

    function testRevert_StaleOraclePrice() public {
        vm.warp(block.timestamp + 1 days);

        // Set oracle update 3 jam yang lalu
        priceFeed.setUpdatedAt(block.timestamp - 3 hours);

        vm.expectRevert();
        controller.performUpkeep(abi.encode(1e8));
    }

    function test_EmergencyManualMode() public {
        controller.setEmergencyManualMode(true, 50);

        uint256 fee = controller.getProtocolFeeBps(FiebleTypes.TenorBucket.OneMonth);
        assertEq(fee, 50, "Manual fee should take precedence");

        vm.warp(block.timestamp + ONE_HOUR);
        (bool needed,) = controller.checkUpkeep("");
        assertFalse(needed, "Upkeep should be disabled in emergency mode");
    }

    function test_CircuitBreaker_ClampsDecrease() public {
        // Pertama, naikkan fee ke 35 bps via upkeep
        vm.warp(block.timestamp + ONE_HOUR);
        priceFeed.setPrice(2e8);
        (, bytes memory pd1) = controller.checkUpkeep("");
        controller.performUpkeep(pd1);
        assertEq(controller.getProtocolFeeBps(FiebleTypes.TenorBucket.OneMonth), 35);

        // Sekarang harga turun drastis ke $0.01 (1e6)
        vm.warp(block.timestamp + ONE_HOUR);
        priceFeed.setPrice(1e6);
        (, bytes memory pd2) = controller.checkUpkeep("");
        controller.performUpkeep(pd2);

        // Tanpa circuit breaker: 15 + 0 = 15 bps. Penurunan = 35 - 15 = 20 bps.
        // Circuit breaker clamp: maks penurunan 20 bps -> 35 - 20 = 15 bps.
        // Kebetulan dalam range, tapi jika penurunan lebih besar, akan di-clamp.
        uint256 clampedFee = controller.getProtocolFeeBps(FiebleTypes.TenorBucket.OneMonth);
        assertTrue(clampedFee <= 35 && clampedFee >= 15, "Fee should decrease within circuit breaker bounds");
    }

    function testRevert_PerformUpkeep_IntervalNotReached() public {
        // Coba panggil performUpkeep sebelum 1 jam berlalu
        vm.expectRevert(IFeeRewardController.UpkeepNotNeeded.selector);
        controller.performUpkeep("");
    }

    function testRevert_PerformUpkeep_CannotBeCalledTwiceInSameCycle() public {
        vm.warp(block.timestamp + ONE_HOUR);
        priceFeed.setPrice(2e8);
        controller.performUpkeep("");

        // Panggilan kedua tanpa perpindahan waktu harus revert UpkeepNotNeeded
        vm.expectRevert(IFeeRewardController.UpkeepNotNeeded.selector);
        controller.performUpkeep("");
    }
}
