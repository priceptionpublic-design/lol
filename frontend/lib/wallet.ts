import { ethers } from 'ethers';
import { DEPOSIT_CONTRACT_ADDRESS, DEPOSIT_CONTRACT_ABI } from './config';

declare global {
  interface Window {
    ethereum?: any;
  }
}

export async function connectWallet(): Promise<string> {
  if (typeof window === 'undefined' || !window.ethereum) {
    throw new Error('MetaMask is not installed');
  }

  try {
    const provider = new ethers.BrowserProvider(window.ethereum);
    const accounts = await provider.send('eth_requestAccounts', []);
    return accounts[0];
  } catch (error) {
    console.error('Error connecting wallet:', error);
    throw error;
  }
}

export async function getWalletAddress(): Promise<string | null> {
  if (typeof window === 'undefined' || !window.ethereum) {
    return null;
  }

  try {
    const provider = new ethers.BrowserProvider(window.ethereum);
    const accounts = await provider.listAccounts();
    return accounts.length > 0 ? accounts[0].address : null;
  } catch (error) {
    console.error('Error getting wallet address:', error);
    return null;
  }
}

/**
 * Deposit to smart contract (preferred method)
 */
export async function depositToContract(
  amount: string,
  onTransactionHash?: (hash: string) => void
): Promise<string> {
  if (typeof window === 'undefined' || !window.ethereum) {
    throw new Error('MetaMask is not installed');
  }

  if (!DEPOSIT_CONTRACT_ADDRESS) {
    throw new Error('Deposit contract address not configured');
  }

  try {
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    
    const contract = new ethers.Contract(
      DEPOSIT_CONTRACT_ADDRESS,
      DEPOSIT_CONTRACT_ABI,
      signer
    );

    const tx = await contract.deposit({
      value: ethers.parseEther(amount)
    });

    if (onTransactionHash) {
      onTransactionHash(tx.hash);
    }

    const receipt = await tx.wait();
    return receipt?.hash || tx.hash;
  } catch (error: any) {
    console.error('Error depositing to contract:', error);
    if (error.code === 4001) {
      throw new Error('Transaction rejected by user');
    }
    throw error;
  }
}


/**
 * Get user's total deposited amount from contract
 */
export async function getContractDepositBalance(userAddress: string): Promise<string> {
  if (typeof window === 'undefined' || !window.ethereum) {
    throw new Error('MetaMask is not installed');
  }

  if (!DEPOSIT_CONTRACT_ADDRESS) {
    return '0';
  }

  try {
    const provider = new ethers.BrowserProvider(window.ethereum);
    const contract = new ethers.Contract(
      DEPOSIT_CONTRACT_ADDRESS,
      DEPOSIT_CONTRACT_ABI,
      provider
    );

    const totalDeposited = await contract.getTotalDeposited(userAddress);
    return ethers.formatEther(totalDeposited);
  } catch (error) {
    console.error('Error getting contract balance:', error);
    return '0';
  }
}

export async function checkTransactionStatus(txHash: string): Promise<{
  confirmed: boolean;
  blockNumber?: number;
}> {
  if (typeof window === 'undefined' || !window.ethereum) {
    throw new Error('MetaMask is not installed');
  }

  try {
    const provider = new ethers.BrowserProvider(window.ethereum);
    const receipt = await provider.getTransactionReceipt(txHash);
    
    return {
      confirmed: receipt !== null,
      blockNumber: receipt?.blockNumber,
    };
  } catch (error) {
    console.error('Error checking transaction:', error);
    return { confirmed: false };
  }
}

export function formatAddress(address: string): string {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * Check if contract is configured
 */
export function isContractConfigured(): boolean {
  return !!DEPOSIT_CONTRACT_ADDRESS;
}

/**
 * Get the deposit contract address
 */
export function getDepositContractAddress(): string {
  if (!DEPOSIT_CONTRACT_ADDRESS) {
    throw new Error('Deposit contract address not configured');
  }
  return DEPOSIT_CONTRACT_ADDRESS;
}
