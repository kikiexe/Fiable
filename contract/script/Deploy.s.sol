// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {MockERC20} from "../src/MockERC20.sol";
import {MockPriceFeed} from "../src/MockPriceFeed.sol";
import {CLOBEngine} from "../src/CLOBEngine.sol";
import {AMMFallback} from "../src/AMMFallback.sol";
import {FeeRewardController} from "../src/FeeRewardController.sol";
import {FiebleTypes} from "../src/types/FiebleTypes.sol";

contract DeployScript is Script {
    function run() external {
        vm.startBroadcast();

        // 1. Deploy Mock USDC
        MockERC20 usdc = new MockERC20("Mock USDC", "mUSDC", 6);
        console.log("MockERC20 deployed at:", address(usdc));

        // 2. Deploy Mock Price Feed ($1.00 initial reward token price)
        MockPriceFeed priceFeed = new MockPriceFeed("REWARD / USD", 1e8);
        console.log("MockPriceFeed deployed at:", address(priceFeed));

        // 3. Deploy AMMFallback
        AMMFallback amm = new AMMFallback(address(usdc));
        console.log("AMMFallback deployed at:", address(amm));

        // 4. Deploy FeeRewardController (1 hour interval)
        FeeRewardController controller = new FeeRewardController(
            address(priceFeed),
            address(amm),
            3600
        );
        console.log("FeeRewardController deployed at:", address(controller));

        // 5. Deploy CLOBEngine
        CLOBEngine engine = new CLOBEngine(address(usdc));
        console.log("CLOBEngine deployed at:", address(engine));

        // 6. Cross-Contract Linking
        engine.setAMMFallback(address(amm));
        engine.setFeeRewardController(address(controller));
        engine.setTreasury(msg.sender);
        amm.setCLOBEngine(address(engine));
        console.log("Cross-contract wiring completed.");

        // 7. Seed initial fallback liquidity (100,000 mUSDC per bucket)
        uint256 seedPerBucket = 100_000e6;
        usdc.mint(msg.sender, seedPerBucket * 4);
        usdc.approve(address(amm), type(uint256).max);

        amm.addLiquidity(FiebleTypes.TenorBucket.OneWeek, seedPerBucket);
        amm.addLiquidity(FiebleTypes.TenorBucket.OneMonth, seedPerBucket);
        amm.addLiquidity(FiebleTypes.TenorBucket.ThreeMonths, seedPerBucket);
        amm.addLiquidity(FiebleTypes.TenorBucket.OneYear, seedPerBucket);
        console.log("Seeded initial fallback liquidity.");

        vm.stopBroadcast();
    }
}
