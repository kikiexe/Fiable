// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {CLOBEngine} from "../src/CLOBEngine.sol";
import {AMMFallback} from "../src/AMMFallback.sol";
import {FeeRewardController} from "../src/FeeRewardController.sol";
import {MockPriceFeed} from "../src/MockPriceFeed.sol";
import {MockERC20} from "../src/MockERC20.sol";
import {FiebleTypes} from "../src/types/FiebleTypes.sol";

contract CLOBWithFeeTest is Test {
    CLOBEngine public engine;
    AMMFallback public amm;
    FeeRewardController public controller;
    MockPriceFeed public priceFeed;
    MockERC20 public token;

    address public treasury = address(0x999);
    address public makerLender = address(0xAAA);
    address public takerBorrower = address(0xBBB);
    address public lp = address(0xCCC);

    function setUp() public {
        token = new MockERC20("Mock USDC", "mUSDC", 6);
        engine = new CLOBEngine(address(token));
        amm = new AMMFallback(address(token));

        priceFeed = new MockPriceFeed("REWARD / USD", 1e8);
        controller = new FeeRewardController(address(priceFeed), address(amm), 3600);

        engine.setAMMFallback(address(amm));
        engine.setFeeRewardController(address(controller));
        engine.setTreasury(treasury);

        amm.setCLOBEngine(address(engine));

        token.mint(makerLender, 100_000e6);
        token.mint(takerBorrower, 100_000e6);
        token.mint(lp, 500_000e6);

        vm.prank(lp);
        token.approve(address(amm), type(uint256).max);
        vm.prank(lp);
        amm.addLiquidity(FiebleTypes.TenorBucket.OneWeek, 100_000e6);

        vm.prank(makerLender);
        token.approve(address(engine), type(uint256).max);

        vm.prank(takerBorrower);
        token.approve(address(engine), type(uint256).max);
    }

    function test_FeeDeduction_OnOrganicMatch() public {
        uint256 principal = 10_000e6;

        vm.prank(makerLender);
        engine.placeOrder(FiebleTypes.OrderSide.Lend, FiebleTypes.TenorBucket.OneWeek, 500, principal);

        vm.prank(takerBorrower);
        engine.placeOrder(FiebleTypes.OrderSide.Borrow, FiebleTypes.TenorBucket.OneWeek, 500, principal);

        uint256 balanceBefore = token.balanceOf(takerBorrower);
        uint256 treasuryBefore = token.balanceOf(treasury);

        engine.matchOrders(FiebleTypes.TenorBucket.OneWeek);

        // Fee default 15 bps = 0.15% dari 10,000 = 15 mUSDC
        uint256 expectedFee = (principal * 15) / 10_000;
        uint256 expectedNet = principal - expectedFee;

        assertEq(token.balanceOf(treasury), treasuryBefore + expectedFee, "Treasury should receive protocol fee");
        assertEq(token.balanceOf(takerBorrower), balanceBefore + expectedNet, "Borrower should receive net principal");

        FiebleTypes.Position memory pos = engine.getPosition(1);
        assertEq(pos.amount, expectedNet, "Position amount should record net amount after fee deduction");
    }

    function test_FeeDeduction_OnAMMFallback() public {
        uint256 borrowAmount = 20_000e6;
        uint256 balanceBefore = token.balanceOf(takerBorrower);
        uint256 treasuryBefore = token.balanceOf(treasury);

        vm.prank(takerBorrower);
        uint256 posId = engine.executeMarketOrder(
            FiebleTypes.OrderSide.Borrow, FiebleTypes.TenorBucket.OneWeek, borrowAmount, 1_000
        );

        // Fee default 15 bps = 0.15% dari 20,000 = 30 mUSDC
        uint256 expectedFee = (borrowAmount * 15) / 10_000;
        uint256 expectedNet = borrowAmount - expectedFee;

        assertEq(token.balanceOf(treasury), treasuryBefore + expectedFee, "Treasury should receive AMM fee");
        assertEq(token.balanceOf(takerBorrower), balanceBefore + expectedNet, "Borrower should receive net from AMM");

        FiebleTypes.Position memory ammPos = engine.getPosition(posId);
        assertEq(ammPos.amount, expectedNet, "AMM borrow position amount should record net amount after fee deduction");
    }
}
