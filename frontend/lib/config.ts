// Smart Contract Address for deposits (REQUIRED)
export const DEPOSIT_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_DEPOSIT_CONTRACT_ADDRESS || '';

if (!DEPOSIT_CONTRACT_ADDRESS && typeof window !== 'undefined') {
  console.warn('⚠️ DEPOSIT_CONTRACT_ADDRESS is not configured. Deposits will not work.');
}

// Backend API URL
export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// Mobile app download link for landing CTA
export const APP_DOWNLOAD_URL = process.env.NEXT_PUBLIC_APP_DOWNLOAD_URL || '';

// BSC Network configuration
export const BSC_CHAIN_ID = 56; // Mainnet
export const BSC_TESTNET_CHAIN_ID = 97; // Testnet

// Use testnet for development
export const USE_TESTNET = process.env.NEXT_PUBLIC_USE_TESTNET === 'true';

export const CURRENT_CHAIN_ID = USE_TESTNET ? BSC_TESTNET_CHAIN_ID : BSC_CHAIN_ID;

// Smart contract ABI for deposits
export const DEPOSIT_CONTRACT_ABI = [
  'function deposit() external payable',
  'function getTotalDeposited(address user) external view returns (uint256)',
  'function getDepositCount(address user) external view returns (uint256)',
  'function getUserDeposits(address user) external view returns (uint256[] memory amounts, uint256[] memory timestamps)',
  'event DepositMade(address indexed user, uint256 amount, uint256 timestamp, uint256 depositIndex)'
];
