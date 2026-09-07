// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test, console} from "forge-std/Test.sol";
import {CLOBEngine} from "../src/CLOBEngine.sol";
import {MockERC20} from "../src/MockERC20.sol";
import {FiebleTypes} from "../src/types/FiebleTypes.sol";
import {ICLOBEngine} from "../src/interfaces/ICLOBEngine.sol";

contract CLOBEngineTest is Test {
    CLOBEngine public engine;
    MockERC20 public usdc;

    address public lender = makeAddr("lender");
    address public borrower = makeAddr("borrower");

    uint256 constant INITIAL_BALANCE = 1_000_000e6; // 1M USDC (6 decimals)
    uint256 constant ORDER_AMOUNT = 10_000e6; // 10K USDC
    uint256 constant RATE_5_PERCENT = 500; // 5.00% dalam basis points

    function setUp() public {
        usdc = new MockERC20("USD Coin", "USDC", 6);
        engine = new CLOBEngine(address(usdc));

        // Mint token ke lender
        usdc.mint(lender, INITIAL_BALANCE);

        // Lender approve engine
        vm.prank(lender);
        usdc.approve(address(engine), type(uint256).max);
    }

    // ============================================================
    //                      placeOrder
    // ============================================================

    function test_PlaceOrder_Lend_Success() public {
        vm.prank(lender);
        uint256 orderId = engine.placeOrder(
            FiebleTypes.OrderSide.Lend, FiebleTypes.TenorBucket.OneMonth, RATE_5_PERCENT, ORDER_AMOUNT
        );

        assertEq(orderId, 1, "First order should have ID 1");

        FiebleTypes.Order memory order = engine.getOrder(orderId);
        assertEq(order.maker, lender);
        assertEq(uint8(order.side), uint8(FiebleTypes.OrderSide.Lend));
        assertEq(uint8(order.tenor), uint8(FiebleTypes.TenorBucket.OneMonth));
        assertEq(order.rate, RATE_5_PERCENT);
        assertEq(order.amount, ORDER_AMOUNT);
        assertEq(order.filledAmount, 0);
        assertEq(uint8(order.status), uint8(FiebleTypes.OrderStatus.Open));

        // Token harus sudah di-transfer ke engine
        assertEq(usdc.balanceOf(address(engine)), ORDER_AMOUNT);
        assertEq(usdc.balanceOf(lender), INITIAL_BALANCE - ORDER_AMOUNT);
    }

    function test_PlaceOrder_Borrow_Success() public {
        vm.prank(borrower);
        uint256 orderId = engine.placeOrder(
            FiebleTypes.OrderSide.Borrow, FiebleTypes.TenorBucket.OneWeek, RATE_5_PERCENT, ORDER_AMOUNT
        );

        assertEq(orderId, 1);
        // Borrower tidak transfer token saat placeOrder
        assertEq(usdc.balanceOf(address(engine)), 0);
    }

    function testRevert_PlaceOrder_InvalidRate_Zero() public {
        vm.prank(lender);
        vm.expectRevert(abi.encodeWithSelector(ICLOBEngine.InvalidRate.selector, 0));
        engine.placeOrder(FiebleTypes.OrderSide.Lend, FiebleTypes.TenorBucket.OneMonth, 0, ORDER_AMOUNT);
    }

    function testRevert_PlaceOrder_InvalidRate_TooHigh() public {
        vm.prank(lender);
        vm.expectRevert(abi.encodeWithSelector(ICLOBEngine.InvalidRate.selector, 5001));
        engine.placeOrder(FiebleTypes.OrderSide.Lend, FiebleTypes.TenorBucket.OneMonth, 5001, ORDER_AMOUNT);
    }

    function testRevert_PlaceOrder_InvalidAmount() public {
        vm.prank(lender);
        vm.expectRevert(abi.encodeWithSelector(ICLOBEngine.InvalidAmount.selector, 1e3));
        engine.placeOrder(
            FiebleTypes.OrderSide.Lend,
            FiebleTypes.TenorBucket.OneMonth,
            RATE_5_PERCENT,
            1e3 // Di bawah MIN_ORDER_AMOUNT (1e4 = 0.01 USDC)
        );
    }

    // ============================================================
    //                      cancelOrder
    // ============================================================

    function test_CancelOrder_Lend_RefundToken() public {
        vm.prank(lender);
        uint256 orderId = engine.placeOrder(
            FiebleTypes.OrderSide.Lend, FiebleTypes.TenorBucket.OneMonth, RATE_5_PERCENT, ORDER_AMOUNT
        );

        vm.prank(lender);
        engine.cancelOrder(orderId);

        FiebleTypes.Order memory order = engine.getOrder(orderId);
        assertEq(uint8(order.status), uint8(FiebleTypes.OrderStatus.Cancelled));

        // Token harus dikembalikan
        assertEq(usdc.balanceOf(lender), INITIAL_BALANCE);
        assertEq(usdc.balanceOf(address(engine)), 0);
    }

    function testRevert_CancelOrder_NotOwner() public {
        vm.prank(lender);
        uint256 orderId = engine.placeOrder(
            FiebleTypes.OrderSide.Lend, FiebleTypes.TenorBucket.OneMonth, RATE_5_PERCENT, ORDER_AMOUNT
        );

        vm.prank(borrower);
        vm.expectRevert(abi.encodeWithSelector(ICLOBEngine.NotOrderOwner.selector, orderId, borrower));
        engine.cancelOrder(orderId);
    }

    function testRevert_CancelOrder_AlreadyCancelled() public {
        vm.prank(lender);
        uint256 orderId = engine.placeOrder(
            FiebleTypes.OrderSide.Lend, FiebleTypes.TenorBucket.OneMonth, RATE_5_PERCENT, ORDER_AMOUNT
        );

        vm.prank(lender);
        engine.cancelOrder(orderId);

        vm.prank(lender);
        vm.expectRevert(abi.encodeWithSelector(ICLOBEngine.OrderNotOpen.selector, orderId));
        engine.cancelOrder(orderId);
    }

    // ============================================================
    //                      matchOrders
    // ============================================================

    function test_MatchOrders_BasicMatch() public {
        // Lender pasang order: mau lending di 5%
        vm.prank(lender);
        uint256 lendId = engine.placeOrder(
            FiebleTypes.OrderSide.Lend, FiebleTypes.TenorBucket.OneMonth, RATE_5_PERCENT, ORDER_AMOUNT
        );

        // Borrower pasang order: mau borrow di 6% (mau bayar sampai 6%)
        vm.prank(borrower);
        uint256 borrowId = engine.placeOrder(
            FiebleTypes.OrderSide.Borrow,
            FiebleTypes.TenorBucket.OneMonth,
            600, // 6%
            ORDER_AMOUNT
        );

        // Match!
        uint256 positionId = engine.matchOrders(FiebleTypes.TenorBucket.OneMonth);
        assertGt(positionId, 0, "Position should be created");

        // Verify position
        FiebleTypes.Position memory pos = engine.getPosition(positionId);
        assertEq(pos.lender, lender);
        assertEq(pos.borrower, borrower);
        assertEq(pos.amount, ORDER_AMOUNT);
        assertEq(pos.rate, RATE_5_PERCENT); // Lender masuk duluan, rate lender dipakai
        assertEq(pos.maturityTime, pos.startTime + 30 days);

        // Token sudah di-transfer ke borrower
        assertEq(usdc.balanceOf(borrower), ORDER_AMOUNT);
        assertEq(usdc.balanceOf(address(engine)), 0);

        // Kedua order sudah Filled
        assertEq(uint8(engine.getOrder(lendId).status), uint8(FiebleTypes.OrderStatus.Filled));
        assertEq(uint8(engine.getOrder(borrowId).status), uint8(FiebleTypes.OrderStatus.Filled));
    }

    function testRevert_MatchOrders_NoLendOrders() public {
        vm.prank(borrower);
        engine.placeOrder(FiebleTypes.OrderSide.Borrow, FiebleTypes.TenorBucket.OneMonth, RATE_5_PERCENT, ORDER_AMOUNT);

        vm.expectRevert(ICLOBEngine.NoMatchingOrder.selector);
        engine.matchOrders(FiebleTypes.TenorBucket.OneMonth);
    }

    function testRevert_MatchOrders_RatesDontCross() public {
        // Lender mau 8%
        vm.prank(lender);
        engine.placeOrder(FiebleTypes.OrderSide.Lend, FiebleTypes.TenorBucket.OneMonth, 800, ORDER_AMOUNT);

        // Borrower mau bayar max 5%
        vm.prank(borrower);
        engine.placeOrder(FiebleTypes.OrderSide.Borrow, FiebleTypes.TenorBucket.OneMonth, RATE_5_PERCENT, ORDER_AMOUNT);

        // Tidak match karena lend rate (8%) > borrow rate (5%)
        vm.expectRevert(ICLOBEngine.NoMatchingOrder.selector);
        engine.matchOrders(FiebleTypes.TenorBucket.OneMonth);
    }

    function testRevert_MatchOrders_SelfMatch() public {
        // Lender pasang order lend DAN borrow
        usdc.mint(lender, ORDER_AMOUNT); // Tambahan
        vm.startPrank(lender);
        engine.placeOrder(FiebleTypes.OrderSide.Lend, FiebleTypes.TenorBucket.OneMonth, RATE_5_PERCENT, ORDER_AMOUNT);
        engine.placeOrder(FiebleTypes.OrderSide.Borrow, FiebleTypes.TenorBucket.OneMonth, 600, ORDER_AMOUNT);
        vm.stopPrank();

        vm.expectRevert(ICLOBEngine.SelfMatchNotAllowed.selector);
        engine.matchOrders(FiebleTypes.TenorBucket.OneMonth);
    }

    // ============================================================
    //                      getOrderCount
    // ============================================================

    function test_GetOrderCount() public {
        vm.prank(lender);
        engine.placeOrder(FiebleTypes.OrderSide.Lend, FiebleTypes.TenorBucket.OneMonth, RATE_5_PERCENT, ORDER_AMOUNT);

        assertEq(engine.getOrderCount(FiebleTypes.TenorBucket.OneMonth, FiebleTypes.OrderSide.Lend), 1);
        assertEq(engine.getOrderCount(FiebleTypes.TenorBucket.OneMonth, FiebleTypes.OrderSide.Borrow), 0);
        assertEq(engine.getOrderCount(FiebleTypes.TenorBucket.OneWeek, FiebleTypes.OrderSide.Lend), 0);
    }
}
