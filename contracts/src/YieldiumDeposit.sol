// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IERC20 {
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    function transfer(address recipient, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

/**
 * @title YieldiumDeposit
 * @dev Smart contract for handling USDC deposits with event monitoring
 */
contract YieldiumDeposit {
    struct Deposit {
        address user;
        uint256 amount;
        uint256 timestamp;
        uint256 depositIndex;
    }

    // USDC token contract address
    IERC20 public immutable usdcToken;
    
    // Owner of the contract (can withdraw funds)
    address public owner;
    
    // Mapping from user address to their total deposited amount
    mapping(address => uint256) public userTotalDeposits;
    
    // Mapping from user address to their deposit count
    mapping(address => uint256) public userDepositCount;
    
    // Mapping from user address to array of deposit timestamps
    mapping(address => uint256[]) public userDepositTimestamps;
    
    // Mapping from user address to array of deposit amounts
    mapping(address => uint256[]) public userDepositAmounts;
    
    // All deposits array for iteration
    Deposit[] public allDeposits;
    
    // Events
    event DepositMade(
        address indexed user, 
        uint256 amount, 
        uint256 timestamp, 
        uint256 depositIndex
    );
    event Withdrawal(address indexed to, uint256 amount);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    modifier onlyOwner() {
        _checkOwner();
        _;
    }

    function _checkOwner() internal view {
        require(msg.sender == owner, "Only owner can call this function");
    }

    /**
     * @dev Constructor sets the USDC token address
     * @param _usdcToken Address of the USDC token contract
     */
    constructor(address _usdcToken) {
        require(_usdcToken != address(0), "Invalid USDC token address");
        owner = msg.sender;
        usdcToken = IERC20(_usdcToken);
    }

    /**
     * @dev Allows users to deposit USDC into the contract
     * @param amount Amount of USDC to deposit (in USDC's smallest unit, 6 decimals)
     * 
     * NOTE: User must approve this contract to spend USDC before calling this function
     */
    function deposit(uint256 amount) external {
        require(amount > 0, "Deposit amount must be greater than 0");
        
        // Transfer USDC from user to this contract
        bool success = usdcToken.transferFrom(msg.sender, address(this), amount);
        require(success, "USDC transfer failed");
        
        uint256 depositIndex = allDeposits.length;
        
        // Record the deposit
        allDeposits.push(Deposit({
            user: msg.sender,
            amount: amount,
            timestamp: block.timestamp,
            depositIndex: depositIndex
        }));
        
        // Update user's records
        userTotalDeposits[msg.sender] += amount;
        userDepositCount[msg.sender]++;
        userDepositTimestamps[msg.sender].push(block.timestamp);
        userDepositAmounts[msg.sender].push(amount);
        
        emit DepositMade(msg.sender, amount, block.timestamp, depositIndex);
    }

    /**
     * @dev Get total amount deposited by a user
     * @param user Address of the user
     * @return Total amount deposited (USDC with 6 decimals)
     */
    function getTotalDeposited(address user) external view returns (uint256) {
        return userTotalDeposits[user];
    }

    /**
     * @dev Get number of deposits made by a user
     * @param user Address of the user
     * @return Number of deposits
     */
    function getDepositCount(address user) external view returns (uint256) {
        return userDepositCount[user];
    }

    /**
     * @dev Get all deposits made by a user
     * @param user Address of the user
     * @return amounts Array of deposit amounts
     * @return timestamps Array of deposit timestamps
     */
    function getUserDeposits(address user) external view returns (
        uint256[] memory amounts,
        uint256[] memory timestamps
    ) {
        return (userDepositAmounts[user], userDepositTimestamps[user]);
    }

    /**
     * @dev Get deposit details at a specific index
     * @param index Index of the deposit
     * @return user Address of the depositor
     * @return amount Amount deposited
     * @return timestamp Time of deposit
     */
    function getDepositByIndex(uint256 index) external view returns (
        address user,
        uint256 amount,
        uint256 timestamp
    ) {
        require(index < allDeposits.length, "Index out of bounds");
        Deposit storage d = allDeposits[index];
        return (d.user, d.amount, d.timestamp);
    }

    /**
     * @dev Get total number of all deposits
     * @return Total number of deposits
     */
    function getTotalDepositCount() external view returns (uint256) {
        return allDeposits.length;
    }

    /**
     * @dev Get contract USDC balance
     * @return Contract balance (USDC with 6 decimals)
     */
    function getContractBalance() external view returns (uint256) {
        return usdcToken.balanceOf(address(this));
    }

    /**
     * @dev Verify if a user has deposited at least a certain amount
     * @param user Address of the user
     * @param amount Minimum amount to check
     * @return True if user has deposited at least the specified amount
     */
    function hasDeposited(address user, uint256 amount) external view returns (bool) {
        return userTotalDeposits[user] >= amount;
    }

    /**
     * @dev Owner can withdraw USDC from the contract
     * @param to Address to send USDC to
     * @param amount Amount to withdraw
     */
    function withdraw(address to, uint256 amount) external onlyOwner {
        require(to != address(0), "Invalid address");
        require(amount <= usdcToken.balanceOf(address(this)), "Insufficient balance");
        
        bool success = usdcToken.transfer(to, amount);
        require(success, "USDC transfer failed");
        
        emit Withdrawal(to, amount);
    }

    /**
     * @dev Transfer ownership of the contract
     * @param newOwner Address of the new owner
     */
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid address");
        address oldOwner = owner;
        owner = newOwner;
        emit OwnershipTransferred(oldOwner, newOwner);
    }
}
