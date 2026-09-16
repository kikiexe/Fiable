// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {MiningReward} from "../src/MiningReward.sol";
import {CLOBEngine} from "../src/CLOBEngine.sol";
import {AMMFallback} from "../src/AMMFallback.sol";
import {MockERC20} from "../src/MockERC20.sol";
import {FiebleTypes} from "../src/types/FiebleTypes.sol";
import {ICLOBEngine} from "../src/interfaces/ICLOBEngine.sol";

contract MockAMMForTWAP {
    uint256 public twap = 500; // 5.00%

    function setTWAP(uint256 newTwap) external {
        twap = newTwap;
    }

    function getTWAP(FiebleTypes.TenorBucket) external view returns (uint256) {
        return twap;
    }
}

contract MiningRewardTest is Test {
    MiningReward reward;
    MockAMMForTWAP mockAmm;
    address clobEngine = address(0xC0B);
    address lender = address(0x1);
    address borrower = address(0x2);

    uint256 constant DEFAULT_AMOUNT = 100_000e6;
    uint256 constant DEFAULT_RATE = 500; // 5.00%
    uint256 constant POSITION_ID = 1;

    function setUp() public {
        mockAmm = new MockAMMForTWAP();
        reward = new MiningReward(clobEngine, address(mockAmm));
    }

    // ============================================================
    //                      CONSTRUCTOR & ADMIN
    // ============================================================

    function testRevert_Constructor_ZeroAddress() public {
        vm.expectRevert(MiningReward.ZeroAddress.selector);
        new MiningReward(address(0), address(mockAmm));

        vm.expectRevert(MiningReward.ZeroAddress.selector);
        new MiningReward(clobEngine, address(0));
    }

    function test_SetCLOBEngine_Success() public {
        address newEngine = address(0x999);
        reward.setCLOBEngine(newEngine);
        assertEq(reward.clobEngine(), newEngine);
    }

    function testRevert_SetCLOBEngine_ZeroAddress() public {
        vm.expectRevert(MiningReward.ZeroAddress.selector);
        reward.setCLOBEngine(address(0));
    }

    function testRevert_SetCLOBEngine_NotOwner() public {
        vm.prank(address(0xBAD));
        vm.expectRevert();
        reward.setCLOBEngine(address(0x999));
    }

    // ============================================================
    //                      RECORD MATCH
    // ============================================================

    function test_RecordMatch_OnlyCLOBEngine() public {
        vm.prank(address(0xBAD));
        vm.expectRevert(MiningReward.Unauthorized.selector);
        reward.recordMatch(POSITION_ID, lender, borrower, FiebleTypes.TenorBucket.OneWeek, DEFAULT_AMOUNT, DEFAULT_RATE);
    }

    function test_RecordMatch_Success() public {
        vm.prank(clobEngine);
        reward.recordMatch(POSITION_ID, lender, borrower, FiebleTypes.TenorBucket.OneWeek, DEFAULT_AMOUNT, DEFAULT_RATE);

        MiningReward.MatchRecord memory rec = reward.getMatchRecord(POSITION_ID);
        assertEq(rec.positionId, POSITION_ID);
        assertEq(rec.lender, lender);
        assertEq(rec.borrower, borrower);
        assertEq(rec.matchedAmount, DEFAULT_AMOUNT);
        assertEq(rec.executionRate, DEFAULT_RATE);
        assertEq(rec.twapRateAtMatch, 500);
        assertEq(rec.startTime, block.timestamp);
        assertFalse(rec.claimedLender);
        assertFalse(rec.claimedBorrower);
    }

    // ============================================================
    //                      CLAIM WEIGHTED VOLUME
    // ============================================================

    function test_ClaimWeightedVolume_HoldingNotMet() public {
        vm.prank(clobEngine);
        reward.recordMatch(POSITION_ID, lender, borrower, FiebleTypes.TenorBucket.OneWeek, DEFAULT_AMOUNT, DEFAULT_RATE);

        // OneWeek = 7 days -> min holding is 3.5 days. Warp 1 day only.
        vm.warp(block.timestamp + 1 days);
        vm.prank(lender);
        reward.claimWeightedVolume(POSITION_ID, true);

        assertEq(reward.totalWeightedVolume(lender), 0, "Belum lewat holding period, weighted volume harus 0");
    }

    function test_ClaimWeightedVolume_FullReward() public {
        vm.prank(clobEngine);
        reward.recordMatch(POSITION_ID, lender, borrower, FiebleTypes.TenorBucket.OneWeek, DEFAULT_AMOUNT, DEFAULT_RATE);

        // Warp 4 days (> 3.5 days min holding), rate == TWAP
        vm.warp(block.timestamp + 4 days);
        vm.prank(lender);
        reward.claimWeightedVolume(POSITION_ID, true);

        assertEq(
            reward.totalWeightedVolume(lender), DEFAULT_AMOUNT, "Full weighted volume saat holding met dan rate = TWAP"
        );
    }

    function test_ClaimWeightedVolume_RevertIfAlreadyClaimed() public {
        vm.prank(clobEngine);
        reward.recordMatch(POSITION_ID, lender, borrower, FiebleTypes.TenorBucket.OneWeek, DEFAULT_AMOUNT, DEFAULT_RATE);

        vm.warp(block.timestamp + 4 days);
        vm.prank(lender);
        reward.claimWeightedVolume(POSITION_ID, true);

        vm.prank(lender);
        vm.expectRevert(MiningReward.AlreadyClaimed.selector);
        reward.claimWeightedVolume(POSITION_ID, true);
    }

    function test_ClaimWeightedVolume_RevertIfNotParticipant() public {
        vm.prank(clobEngine);
        reward.recordMatch(POSITION_ID, lender, borrower, FiebleTypes.TenorBucket.OneWeek, DEFAULT_AMOUNT, DEFAULT_RATE);

        vm.warp(block.timestamp + 4 days);
        vm.prank(address(0xBAD));
        vm.expectRevert(MiningReward.Unauthorized.selector);
        reward.claimWeightedVolume(POSITION_ID, true);
    }

    function test_ClaimWeightedVolume_RecordNotFound() public {
        vm.expectRevert(MiningReward.RecordNotFound.selector);
        reward.claimWeightedVolume(999, true);
    }

    function test_BorrowerCanClaimIndependently() public {
        vm.prank(clobEngine);
        reward.recordMatch(POSITION_ID, lender, borrower, FiebleTypes.TenorBucket.OneWeek, DEFAULT_AMOUNT, DEFAULT_RATE);

        vm.warp(block.timestamp + 4 days);
        vm.prank(borrower);
        reward.claimWeightedVolume(POSITION_ID, false);

        assertEq(reward.totalWeightedVolume(borrower), DEFAULT_AMOUNT);
        assertEq(reward.totalWeightedVolume(lender), 0, "Lender belum klaim, volume-nya masih 0");

        // Now lender claims
        vm.prank(lender);
        reward.claimWeightedVolume(POSITION_ID, true);
        assertEq(reward.totalWeightedVolume(lender), DEFAULT_AMOUNT);
    }

    function test_PreviewWeightedVolume() public {
        // Non-existent record returns 0
        assertEq(reward.previewWeightedVolume(999), 0);

        vm.prank(clobEngine);
        reward.recordMatch(POSITION_ID, lender, borrower, FiebleTypes.TenorBucket.OneWeek, DEFAULT_AMOUNT, DEFAULT_RATE);

        // Before holding period
        assertEq(reward.previewWeightedVolume(POSITION_ID), 0);

        // After holding period
        vm.warp(block.timestamp + 4 days);
        assertEq(reward.previewWeightedVolume(POSITION_ID), DEFAULT_AMOUNT);
    }

    function test_SpreadDeviationTapering() public {
        // TWAP is 500 bps. If execution rate is 750 bps (deviation = 250 bps out of 500 bps max):
        // Weight should be 50%
        vm.prank(clobEngine);
        reward.recordMatch(POSITION_ID, lender, borrower, FiebleTypes.TenorBucket.OneWeek, DEFAULT_AMOUNT, 750);

        vm.warp(block.timestamp + 4 days);
        vm.prank(lender);
        reward.claimWeightedVolume(POSITION_ID, true);

        // 50% of 100_000e6 = 50_000e6
        assertEq(reward.totalWeightedVolume(lender), 50_000e6);
    }

    // ============================================================
    //                  CLOBENGINE INTEGRATION
    // ============================================================

    function test_CLOBEngine_SetMiningReward_Admin() public {
        MockERC20 token = new MockERC20("Test USDC", "TUSDC", 6);
        CLOBEngine engine = new CLOBEngine(address(token));

        assertEq(engine.getMiningReward(), address(0));

        engine.setMiningReward(address(reward));
        assertEq(engine.getMiningReward(), address(reward));

        // Zero address revert
        vm.expectRevert(ICLOBEngine.ZeroAddress.selector);
        engine.setMiningReward(address(0));

        // Non-owner revert
        vm.prank(address(0xBAD));
        vm.expectRevert();
        engine.setMiningReward(address(reward));
    }

    function test_CLOBEngine_MatchOrders_HooksMiningReward() public {
        MockERC20 token = new MockERC20("Test USDC", "TUSDC", 6);
        CLOBEngine engine = new CLOBEngine(address(token));

        // Deploy reward instance pointing to this real engine
        MiningReward liveReward = new MiningReward(address(engine), address(mockAmm));
        engine.setMiningReward(address(liveReward));

        // Mint token and approve
        token.mint(lender, 1_000_000e6);
        vm.prank(lender);
        token.approve(address(engine), type(uint256).max);

        // Place lend order at 500 bps (5.00%)
        vm.prank(lender);
        engine.placeOrder(FiebleTypes.OrderSide.Lend, FiebleTypes.TenorBucket.OneWeek, 500, 10_000e6);

        // Place borrow order at 500 bps (5.00%)
        vm.prank(borrower);
        engine.placeOrder(FiebleTypes.OrderSide.Borrow, FiebleTypes.TenorBucket.OneWeek, 500, 10_000e6);

        // Match orders
        uint256 posId = engine.matchOrders(FiebleTypes.TenorBucket.OneWeek);
        assertGt(posId, 0);

        // Check match record in liveReward
        MiningReward.MatchRecord memory rec = liveReward.getMatchRecord(posId);
        assertEq(rec.lender, lender);
        assertEq(rec.borrower, borrower);
        assertEq(rec.matchedAmount, 10_000e6);
        assertEq(rec.executionRate, 500);
        assertEq(rec.twapRateAtMatch, 500);

        // Advance past holding period and claim
        vm.warp(block.timestamp + 4 days);
        vm.prank(lender);
        liveReward.claimWeightedVolume(posId, true);
        assertEq(liveReward.totalWeightedVolume(lender), 10_000e6);
    }
}
