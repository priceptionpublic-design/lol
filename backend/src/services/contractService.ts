import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

// Contract ABI (only the functions we need)
const DEPOSIT_CONTRACT_ABI = [
  'function getTotalDeposited(address user) external view returns (uint256)',
  'function getDepositCount(address user) external view returns (uint256)',
  'function getUserDeposits(address user) external view returns (uint256[] memory amounts, uint256[] memory timestamps)',
  'function hasDeposited(address user, uint256 amount) external view returns (bool)',
  'function getDepositByIndex(uint256 index) external view returns (address user, uint256 amount, uint256 timestamp)',
  'function getTotalDepositCount() external view returns (uint256)',
  'event DepositMade(address indexed user, uint256 amount, uint256 timestamp, uint256 depositIndex)'
];

// Configuration
const DEPOSIT_CONTRACT_ADDRESS = process.env.DEPOSIT_CONTRACT_ADDRESS || '';
const BSC_RPC_URL = process.env.BSC_RPC_URL || 'https://bsc-dataseed.binance.org/';
const BSC_TESTNET_RPC_URL = process.env.BSC_TESTNET_RPC_URL || 'https://data-seed-prebsc-1-s1.binance.org:8545/';
const USE_TESTNET = process.env.USE_TESTNET === 'true';

if (!DEPOSIT_CONTRACT_ADDRESS) {
  console.warn('⚠️ DEPOSIT_CONTRACT_ADDRESS is not configured. Deposit verification will fail.');
}

// Get provider
function getProvider(): ethers.JsonRpcProvider {
  const rpcUrl = USE_TESTNET ? BSC_TESTNET_RPC_URL : BSC_RPC_URL;
  return new ethers.JsonRpcProvider(rpcUrl);
}

// Get contract instance
function getContract(): ethers.Contract {
  if (!DEPOSIT_CONTRACT_ADDRESS) {
    throw new Error('DEPOSIT_CONTRACT_ADDRESS not configured');
  }
  const provider = getProvider();
  return new ethers.Contract(DEPOSIT_CONTRACT_ADDRESS, DEPOSIT_CONTRACT_ABI, provider);
}

/**
 * Get total amount deposited by a user
 */
export async function getTotalDeposited(userAddress: string): Promise<string> {
  const contract = getContract();
  const amount = await contract.getTotalDeposited(userAddress);
  return ethers.formatEther(amount);
}

/**
 * Get number of deposits by a user
 */
export async function getDepositCount(userAddress: string): Promise<number> {
  const contract = getContract();
  const count = await contract.getDepositCount(userAddress);
  return Number(count);
}

/**
 * Get all deposits made by a user
 */
export async function getUserDeposits(userAddress: string): Promise<{
  amounts: string[];
  timestamps: number[];
}> {
  const contract = getContract();
  const [amounts, timestamps] = await contract.getUserDeposits(userAddress);
  
  return {
    amounts: amounts.map((a: bigint) => ethers.formatEther(a)),
    timestamps: timestamps.map((t: bigint) => Number(t))
  };
}

/**
 * Check if user has deposited at least a certain amount
 */
export async function hasDeposited(userAddress: string, amountInBNB: string): Promise<boolean> {
  const contract = getContract();
  const amountWei = ethers.parseEther(amountInBNB);
  return await contract.hasDeposited(userAddress, amountWei);
}

/**
 * Verify a deposit transaction
 */
export async function verifyDepositTransaction(
  txHash: string,
  expectedUser: string,
  expectedAmountBNB: string
): Promise<{
  verified: boolean;
  actualAmount?: string;
  blockNumber?: number;
  timestamp?: number;
  error?: string;
}> {
  try {
    const provider = getProvider();
    
    // Get transaction receipt
    const receipt = await provider.getTransactionReceipt(txHash);
    if (!receipt) {
      return { verified: false, error: 'Transaction not found or not confirmed' };
    }

    // Check if transaction was successful
    if (receipt.status !== 1) {
      return { verified: false, error: 'Transaction failed' };
    }

    // Check if transaction was to our contract
    if (receipt.to?.toLowerCase() !== DEPOSIT_CONTRACT_ADDRESS.toLowerCase()) {
      return { verified: false, error: 'Transaction was not to the deposit contract' };
    }

    // Parse logs to find DepositMade event
    const contract = getContract();
    const depositEventTopic = contract.interface.getEvent('DepositMade')?.topicHash;
    
    const depositLog = receipt.logs.find(log => 
      log.topics[0] === depositEventTopic
    );

    if (!depositLog) {
      return { verified: false, error: 'No deposit event found in transaction' };
    }

    // Decode the event
    const decodedLog = contract.interface.parseLog({
      topics: depositLog.topics as string[],
      data: depositLog.data
    });

    if (!decodedLog) {
      return { verified: false, error: 'Could not decode deposit event' };
    }

    const eventUser = decodedLog.args.user.toLowerCase();
    const eventAmount = ethers.formatEther(decodedLog.args.amount);
    const eventTimestamp = Number(decodedLog.args.timestamp);

    // Verify user address matches
    if (eventUser !== expectedUser.toLowerCase()) {
      return { verified: false, error: 'Deposit was made by a different address' };
    }

    // Get block for timestamp
    const block = await provider.getBlock(receipt.blockNumber);

    return {
      verified: true,
      actualAmount: eventAmount,
      blockNumber: receipt.blockNumber,
      timestamp: block?.timestamp || eventTimestamp
    };
  } catch (error: any) {
    console.error('[ContractService] Verification error:', error);
    return { verified: false, error: error.message };
  }
}

/**
 * Get all deposits from contract for a user (for syncing)
 */
export async function syncUserDepositsFromContract(userAddress: string): Promise<{
  totalDeposited: string;
  depositCount: number;
  deposits: { amount: string; timestamp: number }[];
}> {
  const [totalDeposited, depositCount, userDeposits] = await Promise.all([
    getTotalDeposited(userAddress),
    getDepositCount(userAddress),
    getUserDeposits(userAddress)
  ]);

  const deposits = userDeposits.amounts.map((amount, i) => ({
    amount,
    timestamp: userDeposits.timestamps[i]
  }));

  return {
    totalDeposited,
    depositCount,
    deposits
  };
}

/**
 * Get contract configuration
 */
export function getContractConfig() {
  return {
    contractAddress: DEPOSIT_CONTRACT_ADDRESS,
    network: USE_TESTNET ? 'BSC Testnet' : 'BSC Mainnet',
    rpcUrl: USE_TESTNET ? BSC_TESTNET_RPC_URL : BSC_RPC_URL,
    configured: !!DEPOSIT_CONTRACT_ADDRESS
  };
}

