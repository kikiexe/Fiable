// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {CLOBEngine} from "../src/CLOBEngine.sol";
import {AMMFallback} from "../src/AMMFallback.sol";
import {MockERC20} from "../src/MockERC20.sol";
import {FiebleTypes} from "../src/types/FiebleTypes.sol";

contract CLOBWithAMMTest is Test {
    CLOBEngine public engine;
    AMMFallback public amm;
    MockERC20 public token;

    address public lp = address(0xAAA);
    address public makerLender = address(0xBBB);
    address public takerBorrower = address(0xCCC);
    address public takerLender = address(0xDDD);

    function setUp() public {
        token = new MockERC20("Mock USDC", "mUSDC", 6);
        engine = new CLOBEngine(address(token));
        amm = new AMMFallback(address(token));

        engine.setAMMFallback(address(amm));
        amm.setCLOBEngine(address(engine));

        token.mint(lp, 1_000_000e6);
        token.mint(makerLender, 100_000e6);
        token.mint(takerBorrower, 100_000e6);
        token.mint(takerLender, 100_000e6);

        // Seed liquidity ke AMM Fallback
        vm.startPrank(lp);
        token.approve(address(amm), type(uint256).max);
        amm.addLiquidity(FiebleTypes.TenorBucket.OneWeek, 500_000e6);
        vm.stopPrank();

        vm.prank(makerLender);
        token.approve(address(engine), type(uint256).max);

        vm.prank(takerBorrower);
        token.approve(address(engine), type(uint256).max);

        vm.prank(takerLender);
        token.approve(address(engine), type(uint256).max);
    }

    function test_InstantExecution_WhenOrderBookEmpty() public {
        uint256 borrowAmount = 25_000e6;
        uint256 balanceBefore = token.balanceOf(takerBorrower);

        vm.prank(takerBorrower);
        uint256 posId = engine.executeMarketOrder(
            FiebleTypes.OrderSide.Borrow,
            FiebleTypes.TenorBucket.OneWeek,
            borrowAmount,
            1_500 // Max rate 15%
        );

        assertTrue(posId > 0);
        assertEq(token.balanceOf(takerBorrower), balanceBefore + borrowAmount);

        FiebleTypes.Position memory pos = engine.getPosition(posId);
        assertEq(pos.borrower, takerBorrower);
        assertEq(pos.lender, address(amm), "Lender counterparty should be AMM fallback");
        assertEq(pos.amount, borrowAmount);
    }

    function test_InstantExecution_PartialFill() public {
        // Maker lender memasang order 10,000 mUSDC pada rate 600 bps (6.00%)
        vm.prank(makerLender);
        engine.placeOrder(FiebleTypes.OrderSide.Lend, FiebleTypes.TenorBucket.OneWeek, 600, 10_000e6);

        // Taker borrower meminta 25,000 mUSDC:
        // 10,000 harus diambil dari CLOB, 15,000 dari AMM Fallback
        uint256 borrowAmount = 25_000e6;
        uint256 balanceBefore = token.balanceOf(takerBorrower);

        vm.prank(takerBorrower);
        uint256 posId = engine.executeMarketOrder(
            FiebleTypes.OrderSide.Borrow, FiebleTypes.TenorBucket.OneWeek, borrowAmount, 2_000
        );

        assertTrue(posId > 0);
        assertEq(token.balanceOf(takerBorrower), balanceBefore + borrowAmount);

        // Order maker lender sekarang harus fully filled
        FiebleTypes.Order memory order = engine.getOrder(1);
        assertEq(uint256(order.status), uint256(FiebleTypes.OrderStatus.Filled));

        // Verifikasi posisi 1: milik Maker Lender (CLOB)
        FiebleTypes.Position memory clobPos = engine.getPosition(1);
        assertEq(clobPos.lender, makerLender, "CLOB position lender MUST be maker lender");
        assertEq(clobPos.borrower, takerBorrower, "CLOB position borrower must be taker");
        assertEq(clobPos.amount, 10_000e6, "CLOB position amount must be 10,000");
        assertEq(clobPos.rate, 600, "CLOB position rate must match maker rate 600 bps");

        // Verifikasi posisi 2: milik AMM Fallback (residual)
        FiebleTypes.Position memory ammPos = engine.getPosition(2);
        assertEq(ammPos.lender, address(amm), "AMM position lender MUST be AMM fallback");
        assertEq(ammPos.borrower, takerBorrower, "AMM position borrower must be taker");
        assertEq(ammPos.amount, 15_000e6, "AMM position amount must be residual 15,000");
    }

    function test_InstantExecution_FullCLOBFill() public {
        // Maker lender memasang order 50,000 mUSDC pada rate 600 bps (6.00%)
        vm.prank(makerLender);
        engine.placeOrder(FiebleTypes.OrderSide.Lend, FiebleTypes.TenorBucket.OneWeek, 600, 50_000e6);

        uint256 borrowAmount = 25_000e6;
        uint256 balanceBefore = token.balanceOf(takerBorrower);

        (uint256 totalLiqBefore, uint256 borrowedBefore,,,) = amm.getPoolInfo(FiebleTypes.TenorBucket.OneWeek);

        vm.prank(takerBorrower);
        uint256 posId = engine.executeMarketOrder(
            FiebleTypes.OrderSide.Borrow, FiebleTypes.TenorBucket.OneWeek, borrowAmount, 1_000
        );

        assertTrue(posId > 0);
        assertEq(token.balanceOf(takerBorrower), balanceBefore + borrowAmount);

        // Verify AMM was untouched
        (uint256 totalLiqAfter, uint256 borrowedAfter,,,) = amm.getPoolInfo(FiebleTypes.TenorBucket.OneWeek);
        assertEq(totalLiqBefore, totalLiqAfter, "AMM liquidity unchanged");
        assertEq(borrowedBefore, borrowedAfter, "AMM borrowed liquidity unchanged");

        // Order maker lender partially filled (25,000 filled)
        FiebleTypes.Order memory order = engine.getOrder(1);
        assertEq(order.filledAmount, 25_000e6);
        assertEq(uint256(order.status), uint256(FiebleTypes.OrderStatus.Open));

        // Verifikasi counterparty adalah Maker Lender, bukan AMM
        FiebleTypes.Position memory pos = engine.getPosition(posId);
        assertEq(pos.lender, makerLender, "Full CLOB fill position lender MUST be maker lender");
        assertEq(pos.borrower, takerBorrower);
        assertEq(pos.amount, borrowAmount);
    }

    function test_InstantExecution_SkipSelfTrade() public {
        // Taker sendiri memasang order Lend pada rate 500 bps (best rate)
        vm.prank(takerBorrower);
        engine.placeOrder(FiebleTypes.OrderSide.Lend, FiebleTypes.TenorBucket.OneWeek, 500, 10_000e6);

        // Maker lain memasang order Lend pada rate 650 bps
        vm.prank(makerLender);
        engine.placeOrder(FiebleTypes.OrderSide.Lend, FiebleTypes.TenorBucket.OneWeek, 650, 10_000e6);

        // Taker borrower mengeksekusi market order borrow 10,000 mUSDC
        // Harus melewati order sendiri (500 bps) dan match dengan order makerLender (650 bps)
        vm.prank(takerBorrower);
        uint256 posId =
            engine.executeMarketOrder(FiebleTypes.OrderSide.Borrow, FiebleTypes.TenorBucket.OneWeek, 10_000e6, 1_000);

        assertTrue(posId > 0);
        FiebleTypes.Position memory pos = engine.getPosition(posId);
        assertEq(pos.lender, makerLender, "Position should be matched with other maker, skipping self-trade");
        assertEq(pos.rate, 650);

        // Order sendiri tetap Open dan tidak tersentuh
        FiebleTypes.Order memory selfOrder = engine.getOrder(1);
        assertEq(uint256(selfOrder.status), uint256(FiebleTypes.OrderStatus.Open));
        assertEq(selfOrder.filledAmount, 0);
    }

    function test_SettlePosition_AMMBorrow_Success() public {
        uint256 borrowAmount = 20_000e6;
        vm.prank(takerBorrower);
        uint256 posId = engine.executeMarketOrder(
            FiebleTypes.OrderSide.Borrow, FiebleTypes.TenorBucket.OneWeek, borrowAmount, 1_000
        );

        FiebleTypes.Position memory pos = engine.getPosition(posId);
        assertEq(pos.lender, address(amm), "Counterparty must be AMM for borrow");
        assertEq(pos.borrower, takerBorrower);

        (uint256 totalLiqBefore, uint256 borrowedBefore,,,) = amm.getPoolInfo(FiebleTypes.TenorBucket.OneWeek);
        assertEq(borrowedBefore, borrowAmount);

        uint256 duration = FiebleTypes.tenorToDuration(pos.tenor);
        uint256 interest = (pos.amount * pos.rate * duration) / (FiebleTypes.BPS_DENOMINATOR * 365 days);
        uint256 totalRepayment = pos.amount + interest;

        token.mint(takerBorrower, interest);
        vm.prank(takerBorrower);
        token.approve(address(engine), totalRepayment);

        vm.warp(pos.maturityTime + 1);

        engine.settlePosition(posId);

        FiebleTypes.Position memory settledPos = engine.getPosition(posId);
        assertTrue(settledPos.settled);

        (uint256 totalLiqAfter, uint256 borrowedAfter,,,) = amm.getPoolInfo(FiebleTypes.TenorBucket.OneWeek);
        assertEq(borrowedAfter, 0, "AMM borrowed liquidity should be cleared back to 0");
        assertEq(totalLiqAfter, totalLiqBefore + interest, "LP pool liquidity should accrue earned interest yield");
    }

    function test_SettlePosition_AMMLend_Success() public {
        uint256 lendAmount = 20_000e6;
        vm.prank(takerLender);
        uint256 posId =
            engine.executeMarketOrder(FiebleTypes.OrderSide.Lend, FiebleTypes.TenorBucket.OneWeek, lendAmount, 0);

        FiebleTypes.Position memory pos = engine.getPosition(posId);
        assertEq(pos.lender, takerLender);
        assertEq(pos.borrower, address(amm), "Counterparty must be AMM for lend");

        uint256 duration = FiebleTypes.tenorToDuration(pos.tenor);
        uint256 interest = (pos.amount * pos.rate * duration) / (FiebleTypes.BPS_DENOMINATOR * 365 days);
        uint256 expectedPayout = pos.amount + interest;

        uint256 lenderBalanceBefore = token.balanceOf(takerLender);

        vm.warp(pos.maturityTime + 1);

        engine.settlePosition(posId);

        FiebleTypes.Position memory settledPos = engine.getPosition(posId);
        assertTrue(settledPos.settled);

        assertEq(
            token.balanceOf(takerLender),
            lenderBalanceBefore + expectedPayout,
            "Lender must receive principal + interest from AMM"
        );
    }
}
