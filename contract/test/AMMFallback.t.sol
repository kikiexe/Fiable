// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {AMMFallback} from "../src/AMMFallback.sol";
import {MockERC20} from "../src/MockERC20.sol";
import {FiebleTypes} from "../src/types/FiebleTypes.sol";
import {IAMMFallback} from "../src/interfaces/IAMMFallback.sol";

contract AMMFallbackTest is Test {
    AMMFallback public amm;
    MockERC20 public token;

    address public owner = address(this);
    address public lpProvider = address(0x111);
    address public takerBorrower = address(0x222);
    address public takerLender = address(0x333);

    uint256 constant INITIAL_MINT = 1_000_000e6; // 1 Juta mUSDC (6 decimals)

    function setUp() public {
        token = new MockERC20("Mock USDC", "mUSDC", 6);
        amm = new AMMFallback(address(token));

        token.mint(lpProvider, INITIAL_MINT);
        token.mint(takerLender, INITIAL_MINT);
        token.mint(takerBorrower, INITIAL_MINT);

        vm.prank(lpProvider);
        token.approve(address(amm), type(uint256).max);

        vm.prank(takerLender);
        token.approve(address(amm), type(uint256).max);
    }

    function test_AddAndRemoveLiquidity() public {
        uint256 depositAmount = 100_000e6;

        vm.prank(lpProvider);
        uint256 shares = amm.addLiquidity(FiebleTypes.TenorBucket.OneMonth, depositAmount);
        assertEq(shares, depositAmount, "First deposit shares should equal amount");

        (uint256 totalLiq, uint256 borrowedLiq, uint256 totalShares,,) =
            amm.getPoolInfo(FiebleTypes.TenorBucket.OneMonth);

        assertEq(totalLiq, depositAmount);
        assertEq(borrowedLiq, 0);
        assertEq(totalShares, shares);

        vm.prank(lpProvider);
        uint256 returned = amm.removeLiquidity(FiebleTypes.TenorBucket.OneMonth, shares);
        assertEq(returned, depositAmount, "Returned amount should equal deposit");
    }

    function test_YieldCurve_KinkTransitions() public {
        uint256 depositAmount = 100_000e6;
        vm.prank(lpProvider);
        amm.addLiquidity(FiebleTypes.TenorBucket.OneMonth, depositAmount);

        // 0% utilisasi -> Base Rate = 500 bps
        uint256 quote0 = amm.getQuoteRate(FiebleTypes.TenorBucket.OneMonth, FiebleTypes.OrderSide.Borrow, 0);
        // Base rate 500 + spread 150 = 650 bps
        assertEq(quote0, 650);

        // Borrow 40,000 (40% utilisasi -> di bawah kink)
        uint256 quote40 = amm.getQuoteRate(FiebleTypes.TenorBucket.OneMonth, FiebleTypes.OrderSide.Borrow, 40_000e6);
        assertTrue(quote40 > quote0, "Rate should increase with utilization");

        // Borrow 90,000 (90% utilisasi -> di atas kink 80%)
        uint256 quote90 = amm.getQuoteRate(FiebleTypes.TenorBucket.OneMonth, FiebleTypes.OrderSide.Borrow, 90_000e6);
        assertTrue(quote90 > quote40, "Rate above kink should sharply increase");
    }

    function test_SpreadApplication() public {
        uint256 depositAmount = 100_000e6;
        vm.prank(lpProvider);
        amm.addLiquidity(FiebleTypes.TenorBucket.OneMonth, depositAmount);

        uint256 borrowQuote = amm.getQuoteRate(FiebleTypes.TenorBucket.OneMonth, FiebleTypes.OrderSide.Borrow, 0);
        uint256 lendQuote = amm.getQuoteRate(FiebleTypes.TenorBucket.OneMonth, FiebleTypes.OrderSide.Lend, 0);

        assertEq(borrowQuote, 650, "Borrow rate must include markup");
        assertEq(lendQuote, 350, "Lend rate must include markdown");
        assertTrue(borrowQuote > lendQuote, "Borrow rate must exceed lend rate");
    }

    function test_Swap_BorrowSuccess() public {
        uint256 poolFund = 100_000e6;
        vm.prank(lpProvider);
        amm.addLiquidity(FiebleTypes.TenorBucket.OneMonth, poolFund);

        uint256 borrowAmount = 20_000e6;
        uint256 balanceBefore = token.balanceOf(takerBorrower);

        vm.prank(owner); // Owner berperan sebagai authorized router untuk testing unit
        uint256 rate = amm.swap(
            FiebleTypes.OrderSide.Borrow,
            FiebleTypes.TenorBucket.OneMonth,
            borrowAmount,
            1_000, // Max rate 10.00%
            takerBorrower
        );

        assertTrue(rate > 0);
        assertEq(token.balanceOf(takerBorrower), balanceBefore + borrowAmount);

        (, uint256 borrowed,,,) = amm.getPoolInfo(FiebleTypes.TenorBucket.OneMonth);
        assertEq(borrowed, borrowAmount);
    }

    function test_Swap_LendSuccess() public {
        uint256 poolFund = 100_000e6;
        vm.prank(lpProvider);
        amm.addLiquidity(FiebleTypes.TenorBucket.OneMonth, poolFund);

        uint256 lendAmount = 25_000e6;
        (uint256 totalLiqBefore,,,,) = amm.getPoolInfo(FiebleTypes.TenorBucket.OneMonth);

        token.mint(owner, lendAmount);
        token.approve(address(amm), lendAmount);

        // owner is already address(this), no prank needed
        uint256 rate = amm.swap(
            FiebleTypes.OrderSide.Lend,
            FiebleTypes.TenorBucket.OneMonth,
            lendAmount,
            300, // Min rate 3.00%
            owner
        );

        assertTrue(rate > 0);
        (uint256 totalLiqAfter,,,,) = amm.getPoolInfo(FiebleTypes.TenorBucket.OneMonth);
        assertEq(totalLiqAfter, totalLiqBefore + lendAmount, "Pool liquidity should increase after lend swap");
    }

    function testRevert_SetRateModel_InvalidUtilization() public {
        // optimalUtilization = 0
        vm.expectRevert(abi.encodeWithSelector(IAMMFallback.InvalidOptimalUtilization.selector, 0));
        amm.setRateModel(500, 0, 400, 3000, 150);

        // optimalUtilization = 10000 (BPS_SCALE)
        vm.expectRevert(abi.encodeWithSelector(IAMMFallback.InvalidOptimalUtilization.selector, 10_000));
        amm.setRateModel(500, 10_000, 400, 3000, 150);
    }

    function testRevert_SetRateModel_RateExceedsMax() public {
        // baseRate (2000) + slope1 (1500) + slope2 (2000) + spread (150) = 5650 > MAX_RATE_BPS (5000)
        vm.expectRevert(abi.encodeWithSelector(IAMMFallback.RateExceedsMax.selector, 5650, FiebleTypes.MAX_RATE_BPS));
        amm.setRateModel(2000, 8000, 1500, 2000, 150);

        // N3: base (2000) + slope1 (1500) + slope2 (1450) = 4950 <= 5000, but + spread (200) = 5150 > 5000
        vm.expectRevert(abi.encodeWithSelector(IAMMFallback.RateExceedsMax.selector, 5150, FiebleTypes.MAX_RATE_BPS));
        amm.setRateModel(2000, 5000, 1500, 1450, 200);
    }

    function test_Swap_BorrowCannotDrainTakerLendLiquidity() public {
        uint256 lpDeposit = 10_000e6;
        vm.prank(lpProvider);
        amm.addLiquidity(FiebleTypes.TenorBucket.OneMonth, lpDeposit);

        // Taker lends 10_000 USDC
        uint256 takerLendAmount = 10_000e6;
        token.mint(owner, takerLendAmount);
        token.approve(address(amm), takerLendAmount);
        amm.swap(FiebleTypes.OrderSide.Lend, FiebleTypes.TenorBucket.OneMonth, takerLendAmount, 0, owner);

        // Borrower tries to borrow 15_000 USDC.
        // Total tokens in AMM contract is 20_000 USDC, but only LP deposit (10_000 USDC) is available to borrow.
        vm.expectRevert(abi.encodeWithSelector(IAMMFallback.InsufficientPoolLiquidity.selector, 15_000e6, 10_000e6));
        amm.swap(FiebleTypes.OrderSide.Borrow, FiebleTypes.TenorBucket.OneMonth, 15_000e6, 0, takerBorrower);
    }

    function testRevert_SlippageExceeded() public {
        uint256 poolFund = 100_000e6;
        vm.prank(lpProvider);
        amm.addLiquidity(FiebleTypes.TenorBucket.OneMonth, poolFund);

        // Borrower memberi maxSlippageRate 500 bps padahal quote rate minimal 650 bps
        vm.expectRevert();
        amm.swap(FiebleTypes.OrderSide.Borrow, FiebleTypes.TenorBucket.OneMonth, 10_000e6, 500, takerBorrower);
    }

    function test_TWAPUpdate() public {
        uint256 poolFund = 100_000e6;
        vm.prank(lpProvider);
        amm.addLiquidity(FiebleTypes.TenorBucket.OneMonth, poolFund);

        uint256 twapInitial = amm.getTWAP(FiebleTypes.TenorBucket.OneMonth);
        assertTrue(twapInitial > 0);

        vm.warp(block.timestamp + 1 days);

        amm.swap(FiebleTypes.OrderSide.Borrow, FiebleTypes.TenorBucket.OneMonth, 30_000e6, 2_000, takerBorrower);

        uint256 twapUpdated = amm.getTWAP(FiebleTypes.TenorBucket.OneMonth);
        assertTrue(twapUpdated > 0);
    }

    function test_Prevent_LPTheft_OnTakerLend() public {
        uint256 lpDeposit = 10_000e6;
        vm.prank(lpProvider);
        uint256 shares = amm.addLiquidity(FiebleTypes.TenorBucket.OneMonth, lpDeposit);

        // Taker lends 10,000 USDC
        uint256 takerLendAmount = 10_000e6;
        token.mint(owner, takerLendAmount);
        token.approve(address(amm), takerLendAmount);

        amm.swap(FiebleTypes.OrderSide.Lend, FiebleTypes.TenorBucket.OneMonth, takerLendAmount, 0, owner);

        // LP attempts to withdraw all shares to steal taker funds
        uint256 lpBalanceBefore = token.balanceOf(lpProvider);
        vm.prank(lpProvider);
        uint256 returned = amm.removeLiquidity(FiebleTypes.TenorBucket.OneMonth, shares);

        // LP MUST only receive their own initial deposit, NOT taker's deposit
        assertEq(returned, lpDeposit, "LP must only receive their deposited principal, not taker principal");
        assertEq(token.balanceOf(lpProvider), lpBalanceBefore + lpDeposit);

        // Taker's funds remain in the AMM contract
        assertEq(token.balanceOf(address(amm)), takerLendAmount, "Taker funds must remain intact in AMM");
    }
}
