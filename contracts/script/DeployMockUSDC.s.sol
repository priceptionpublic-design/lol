// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {Script, console} from "forge-std/Script.sol";
import {MockUSDC} from "../test/MockUSDC.sol";

/**
 * Deploy a mock USDC contract for testing
 * This gives you full control to mint testnet USDC
 */
contract DeployMockUSDCScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        vm.startBroadcast(deployerPrivateKey);
        
        // Deploy mock USDC
        MockUSDC usdc = new MockUSDC();
        
        // Mint 1,000,000 USDC to deployer for testing
        usdc.mint(deployer, 1_000_000 * 10**6); // 1M USDC
        
        vm.stopBroadcast();
        
        console.log("=== MOCK USDC DEPLOYED ===");
        console.log("MockUSDC Address:", address(usdc));
        console.log("Deployer:", deployer);
        console.log("Initial Balance: 1,000,000 USDC");
        console.log("");
        console.log("To mint more USDC, run:");
        console.log("cast send <USDC_ADDRESS> 'mint(address,uint256)' <YOUR_ADDRESS> 1000000000000 --rpc-url $BSC_TESTNET_RPC --private-key $PRIVATE_KEY");
    }
}

