// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {CLOBEngine} from "../src/CLOBEngine.sol";
import {MockERC20} from "../src/MockERC20.sol";

contract DeployScript is Script {
    function run() public {
        vm.startBroadcast();

        // Deploy mock USDC (6 decimals seperti USDC asli)
        MockERC20 usdc = new MockERC20("Mock USDC", "mUSDC", 6);
        console.log("MockERC20 deployed at:", address(usdc));

        // Deploy CLOBEngine dengan mock USDC
        CLOBEngine engine = new CLOBEngine(address(usdc));
        console.log("CLOBEngine deployed at:", address(engine));

        vm.stopBroadcast();
    }
}
