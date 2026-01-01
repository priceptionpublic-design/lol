// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {Test} from "forge-std/Test.sol";
import {YieldiumDeposit} from "../src/YieldiumDeposit.sol";
import {MockUSDC} from "./MockUSDC.sol";

contract YieldiumDepositTest is Test {
    YieldiumDeposit public depositContract;
    MockUSDC public usdc;
    
    address public owner = address(this);
    address public user1 = address(0x1);
    address public user2 = address(0x2);
    address public user3 = address(0x3);
    
    uint256 constant USDC_AMOUNT = 1000 * 10**6; // 1000 USDC (6 decimals)

    event DepositMade(address indexed user, uint256 amount, uint256 timestamp, uint256 depositIndex);
    event Withdrawal(address indexed to, uint256 amount);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    function setUp() public {
        // Deploy mock USDC
        usdc = new MockUSDC();
        
        // Deploy deposit contract
        depositContract = new YieldiumDeposit(address(usdc));
        
        // Mint USDC to test users
        usdc.mint(user1, 10000 * 10**6); // 10,000 USDC
        usdc.mint(user2, 10000 * 10**6);
        usdc.mint(user3, 10000 * 10**6);
    }

    // ============ Constructor Tests ============

    function test_Constructor() public view {
        assertEq(depositContract.owner(), owner);
        assertEq(address(depositContract.usdcToken()), address(usdc));
    }
    
    function test_ConstructorRevertsWithZeroAddress() public {
        vm.expectRevert("Invalid USDC token address");
        new YieldiumDeposit(address(0));
    }

    // ============ Deposit Tests ============

    function test_Deposit() public {
        vm.startPrank(user1);
        usdc.approve(address(depositContract), USDC_AMOUNT);
        depositContract.deposit(USDC_AMOUNT);
        vm.stopPrank();

        assertEq(depositContract.getTotalDeposited(user1), USDC_AMOUNT);
        assertEq(depositContract.getDepositCount(user1), 1);
        assertEq(usdc.balanceOf(address(depositContract)), USDC_AMOUNT);
    }

    function test_DepositEmitsEvent() public {
        vm.startPrank(user1);
        usdc.approve(address(depositContract), USDC_AMOUNT);
        
        vm.expectEmit(true, false, false, true);
        emit DepositMade(user1, USDC_AMOUNT, block.timestamp, 0);
        
        depositContract.deposit(USDC_AMOUNT);
        vm.stopPrank();
    }

    function test_DepositRevertsWithZeroAmount() public {
        vm.prank(user1);
        vm.expectRevert("Deposit amount must be greater than 0");
        depositContract.deposit(0);
    }
    
    function test_DepositRevertsWithoutApproval() public {
        vm.prank(user1);
        vm.expectRevert("Insufficient allowance");
        depositContract.deposit(USDC_AMOUNT);
    }

    function test_MultipleDeposits() public {
        vm.startPrank(user1);
        usdc.approve(address(depositContract), USDC_AMOUNT * 3);
        
        depositContract.deposit(USDC_AMOUNT);
        depositContract.deposit(USDC_AMOUNT);
        depositContract.deposit(USDC_AMOUNT);
        vm.stopPrank();

        assertEq(depositContract.getTotalDeposited(user1), USDC_AMOUNT * 3);
        assertEq(depositContract.getDepositCount(user1), 3);
        assertEq(usdc.balanceOf(address(depositContract)), USDC_AMOUNT * 3);
    }

    function test_MultipleUsersDeposit() public {
        // User1 deposits
        vm.startPrank(user1);
        usdc.approve(address(depositContract), USDC_AMOUNT);
        depositContract.deposit(USDC_AMOUNT);
        vm.stopPrank();

        // User2 deposits
        vm.startPrank(user2);
        usdc.approve(address(depositContract), USDC_AMOUNT * 2);
        depositContract.deposit(USDC_AMOUNT * 2);
        vm.stopPrank();

        assertEq(depositContract.getTotalDeposited(user1), USDC_AMOUNT);
        assertEq(depositContract.getTotalDeposited(user2), USDC_AMOUNT * 2);
        assertEq(depositContract.getTotalDepositCount(), 2);
        assertEq(usdc.balanceOf(address(depositContract)), USDC_AMOUNT * 3);
    }

    // ============ Getter Function Tests ============

    function test_GetUserDeposits() public {
        vm.startPrank(user1);
        usdc.approve(address(depositContract), USDC_AMOUNT * 2);
        
        depositContract.deposit(USDC_AMOUNT);
        uint256 time1 = block.timestamp;
        
        vm.warp(block.timestamp + 3600); // Fast forward 1 hour
        
        depositContract.deposit(USDC_AMOUNT);
        uint256 time2 = block.timestamp;
        vm.stopPrank();

        (uint256[] memory amounts, uint256[] memory timestamps) = depositContract.getUserDeposits(user1);
        
        assertEq(amounts.length, 2);
        assertEq(timestamps.length, 2);
        assertEq(amounts[0], USDC_AMOUNT);
        assertEq(amounts[1], USDC_AMOUNT);
        assertEq(timestamps[0], time1);
        assertEq(timestamps[1], time2);
    }

    function test_GetDepositByIndex() public {
        vm.startPrank(user1);
        usdc.approve(address(depositContract), USDC_AMOUNT);
        depositContract.deposit(USDC_AMOUNT);
        vm.stopPrank();

        (address user, uint256 amount, uint256 timestamp) = depositContract.getDepositByIndex(0);
        
        assertEq(user, user1);
        assertEq(amount, USDC_AMOUNT);
        assertEq(timestamp, block.timestamp);
    }

    function test_GetDepositByIndexRevertsOutOfBounds() public {
        vm.expectRevert("Index out of bounds");
        depositContract.getDepositByIndex(0);
    }

    function test_GetContractBalance() public {
        vm.startPrank(user1);
        usdc.approve(address(depositContract), USDC_AMOUNT);
        depositContract.deposit(USDC_AMOUNT);
        vm.stopPrank();

        assertEq(depositContract.getContractBalance(), USDC_AMOUNT);
    }

    function test_HasDeposited() public {
        vm.startPrank(user1);
        usdc.approve(address(depositContract), USDC_AMOUNT);
        depositContract.deposit(USDC_AMOUNT);
        vm.stopPrank();

        assertTrue(depositContract.hasDeposited(user1, USDC_AMOUNT));
        assertTrue(depositContract.hasDeposited(user1, USDC_AMOUNT / 2));
        assertFalse(depositContract.hasDeposited(user1, USDC_AMOUNT * 2));
        assertFalse(depositContract.hasDeposited(user2, 1));
    }

    // ============ Withdrawal Tests ============

    function test_Withdraw() public {
        // User deposits first
        vm.startPrank(user1);
        usdc.approve(address(depositContract), USDC_AMOUNT);
        depositContract.deposit(USDC_AMOUNT);
        vm.stopPrank();

        uint256 initialBalance = usdc.balanceOf(owner);
        
        // Owner withdraws
        depositContract.withdraw(owner, USDC_AMOUNT / 2);

        assertEq(usdc.balanceOf(owner), initialBalance + USDC_AMOUNT / 2);
        assertEq(usdc.balanceOf(address(depositContract)), USDC_AMOUNT / 2);
    }

    function test_WithdrawEmitsEvent() public {
        // User deposits first
        vm.startPrank(user1);
        usdc.approve(address(depositContract), USDC_AMOUNT);
        depositContract.deposit(USDC_AMOUNT);
        vm.stopPrank();

        vm.expectEmit(true, false, false, true);
        emit Withdrawal(owner, USDC_AMOUNT);
        
        depositContract.withdraw(owner, USDC_AMOUNT);
    }

    function test_WithdrawRevertsNonOwner() public {
        vm.prank(user1);
        vm.expectRevert("Only owner can call this function");
        depositContract.withdraw(user1, USDC_AMOUNT);
    }

    function test_WithdrawRevertsInsufficientBalance() public {
        vm.expectRevert("Insufficient balance");
        depositContract.withdraw(owner, USDC_AMOUNT);
    }
    
    function test_WithdrawRevertsZeroAddress() public {
        vm.expectRevert("Invalid address");
        depositContract.withdraw(address(0), USDC_AMOUNT);
    }

    // ============ Ownership Tests ============

    function test_TransferOwnership() public {
        depositContract.transferOwnership(user1);
        assertEq(depositContract.owner(), user1);
    }

    function test_TransferOwnershipEmitsEvent() public {
        vm.expectEmit(true, true, false, false);
        emit OwnershipTransferred(owner, user1);
        
        depositContract.transferOwnership(user1);
    }

    function test_TransferOwnershipRevertsNonOwner() public {
        vm.prank(user1);
        vm.expectRevert("Only owner can call this function");
        depositContract.transferOwnership(user2);
    }
    
    function test_TransferOwnershipRevertsZeroAddress() public {
        vm.expectRevert("Invalid address");
        depositContract.transferOwnership(address(0));
    }

    // ============ Fuzz Tests ============

    function testFuzz_Deposit(uint256 amount) public {
        amount = bound(amount, 1, 1000000 * 10**6); // 1 USDC to 1M USDC
        
        usdc.mint(user1, amount);
        
        vm.startPrank(user1);
        usdc.approve(address(depositContract), amount);
        depositContract.deposit(amount);
        vm.stopPrank();

        assertEq(depositContract.getTotalDeposited(user1), amount);
        assertEq(usdc.balanceOf(address(depositContract)), amount);
    }
}
