// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {Script, console} from "forge-std/Script.sol";
import {YieldiumDeposit} from "../src/YieldiumDeposit.sol";

contract DeployScript is Script {
    function run() external {
        // Read private key from environment
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        
        // BSC Mainnet USDC: 0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d
        // BSC Testnet USDC: 0x64544969ed7EBf5f083679233325356EbE738930
        address usdcAddress = vm.envAddress("USDC_TOKEN_ADDRESS");
        
        require(usdcAddress != address(0), "USDC_TOKEN_ADDRESS not set");
        
        vm.startBroadcast(deployerPrivateKey);
        
        YieldiumDeposit depositContract = new YieldiumDeposit(usdcAddress);
        
        vm.stopBroadcast();
        
        console.log("YieldiumDeposit deployed at:", address(depositContract));
        console.log("USDC Token Address:", usdcAddress);
        console.log("Owner:", depositContract.owner());
    }
}

contract DeployTestnetScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        
        // Get USDC address from .env (Sepolia USDC)
        address usdcTestnet = vm.envAddress("USDC_TOKEN_ADDRESS");
        require(usdcTestnet != address(0), "USDC_TOKEN_ADDRESS not set in .env");
        
        vm.startBroadcast(deployerPrivateKey);
        
        YieldiumDeposit depositContract = new YieldiumDeposit(usdcTestnet);
        
        vm.stopBroadcast();
        
        console.log("=== SEPOLIA TESTNET DEPLOYMENT ===");
        console.log("YieldiumDeposit:", address(depositContract));
        console.log("USDC Token:", usdcTestnet);
        console.log("Owner:", depositContract.owner());
    }
}

contract DeployMainnetScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        
        // Ethereum Mainnet USDC: 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48
        address usdcMainnet = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;
        
        vm.startBroadcast(deployerPrivateKey);
        
        YieldiumDeposit depositContract = new YieldiumDeposit(usdcMainnet);
        
        vm.stopBroadcast();
        
        console.log("=== ETHEREUM MAINNET DEPLOYMENT ===");
        console.log("YieldiumDeposit:", address(depositContract));
        console.log("USDC Token:", usdcMainnet);
        console.log("Owner:", depositContract.owner());
    }
}
