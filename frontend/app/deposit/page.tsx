'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { ethers } from 'ethers';
import { ArrowLeft, History, ExternalLink, Clock, CheckCircle, Copy, CheckCircle2, QrCode, Wallet, AlertCircle } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

// Contract ABIs
const USDC_ABI = [
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function allowance(address owner, address spender) external view returns (uint256)',
  'function balanceOf(address account) external view returns (uint256)',
  'function decimals() external view returns (uint8)'
];

const DEPOSIT_CONTRACT_ABI = [
  'function deposit(uint256 amount) external',
  'function usdcToken() external view returns (address)'
];

export default function DepositPage() {
  const router = useRouter();
  const [depositHistory, setDepositHistory] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [contractAddresses, setContractAddresses] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);
  
  // Deposit method: 'manual' or 'wallet'
  const [depositMethod, setDepositMethod] = useState<'manual' | 'wallet'>('manual');
  
  // Web3 state for wallet connection
  const [walletAddress, setWalletAddress] = useState<string>('');
  const [isConnected, setIsConnected] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');
  const [usdcBalance, setUsdcBalance] = useState<string>('0');
  const [allowance, setAllowance] = useState<string>('0');
  const [isApproving, setIsApproving] = useState(false);
  const [isDepositing, setIsDepositing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
    loadContractInfo();
    checkWalletConnection();
    const interval = setInterval(loadData, 10000); // Refresh every 10 seconds
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (isConnected && walletAddress && contractAddresses) {
      loadUSDCBalance();
      loadAllowance();
    }
  }, [isConnected, walletAddress, contractAddresses]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [historyRes, statsRes] = await Promise.all([
        api.get('/deposits/my-history'),
        api.get('/deposits/my-stats')
      ]);
      
      setDepositHistory(historyRes.data.deposits || []);
      setStats(statsRes.data);
    } catch (err: any) {
      console.error('Failed to load deposit data:', err);
      setError(err.response?.data?.error || err.message || 'Failed to load deposit history');
    } finally {
      setLoading(false);
    }
  };

  const loadContractInfo = async () => {
    try {
      setError(null);
      const response = await api.get('/deposits/contract-info');
      setContractAddresses(response.data);
    } catch (err: any) {
      console.error('Failed to load contract info:', err);
      setError(err.response?.data?.error || err.message || 'Failed to load contract information');
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const checkWalletConnection = async () => {
    if (typeof window.ethereum !== 'undefined') {
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const accounts = await provider.listAccounts();
        if (accounts.length > 0) {
          setWalletAddress(accounts[0].address);
          setIsConnected(true);
        }
      } catch (error) {
        console.error('Error checking wallet:', error);
      }
    }
  };

  const connectWallet = async () => {
    if (typeof window.ethereum === 'undefined') {
      setError('Please install MetaMask or another EVM wallet');
      return;
    }

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await provider.send('eth_requestAccounts', []);
      setWalletAddress(accounts[0]);
      setIsConnected(true);
      setError(null);
    } catch (error: any) {
      setError(error.message || 'Failed to connect wallet');
    }
  };

  const loadUSDCBalance = async () => {
    if (!walletAddress || !contractAddresses) return;

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const usdcContract = new ethers.Contract(
        contractAddresses.usdcTokenAddress,
        USDC_ABI,
        provider
      );

      const balance = await usdcContract.balanceOf(walletAddress);
      setUsdcBalance(ethers.formatUnits(balance, 6)); // USDC has 6 decimals
    } catch (error) {
      console.error('Error loading USDC balance:', error);
    }
  };

  const loadAllowance = async () => {
    if (!walletAddress || !contractAddresses) return;

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const usdcContract = new ethers.Contract(
        contractAddresses.usdcTokenAddress,
        USDC_ABI,
        provider
      );

      const allowanceAmount = await usdcContract.allowance(
        walletAddress,
        contractAddresses.depositContractAddress
      );
      setAllowance(ethers.formatUnits(allowanceAmount, 6));
    } catch (error) {
      console.error('Error loading allowance:', error);
    }
  };

  const approveUSDC = async () => {
    if (!depositAmount || parseFloat(depositAmount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    try {
      setIsApproving(true);
      setError(null);

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const usdcContract = new ethers.Contract(
        contractAddresses.usdcTokenAddress,
        USDC_ABI,
        signer
      );

      const amount = ethers.parseUnits(depositAmount, 6);
      const tx = await usdcContract.approve(contractAddresses.depositContractAddress, amount);
      
      await tx.wait();
      await loadAllowance();
      
      alert('USDC approved! You can now deposit.');
    } catch (error: any) {
      setError(error.message || 'Approval failed');
    } finally {
      setIsApproving(false);
    }
  };

  const handleDeposit = async () => {
    if (!depositAmount || parseFloat(depositAmount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    if (parseFloat(allowance) < parseFloat(depositAmount)) {
      setError('Please approve USDC first');
      return;
    }

    try {
      setIsDepositing(true);
      setError(null);

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const depositContract = new ethers.Contract(
        contractAddresses.depositContractAddress,
        DEPOSIT_CONTRACT_ABI,
        signer
      );

      const amount = ethers.parseUnits(depositAmount, 6);
      const tx = await depositContract.deposit(amount);
      
      await tx.wait();
      
      // Refresh data
      await Promise.all([loadData(), loadUSDCBalance(), loadAllowance()]);
      
      setDepositAmount('');
      alert(`Successfully deposited ${depositAmount} USDC!`);
    } catch (error: any) {
      setError(error.message || 'Deposit failed');
    } finally {
      setIsDepositing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[400px] h-[400px] bg-blue-600/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] bg-emerald-600/10 rounded-full blur-[120px]" />
      </div>

      <div className="max-w-4xl mx-auto relative z-10">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>

        {/* Header */}
        <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-2xl p-6 sm:p-8 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center">
              <History className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">USDC Deposit</h1>
              <p className="text-slate-400 text-sm">Send USDC to the contract address below</p>
            </div>
          </div>

          {/* Deposit Instructions */}
          {contractAddresses && (
            <div className="space-y-6">
              {/* Contract Address Card */}
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold">Deposit Contract Address</h2>
                  <button
                    onClick={() => setShowQR(!showQR)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-600/50 rounded-lg transition text-sm"
                  >
                    <QrCode size={16} />
                    {showQR ? 'Hide QR' : 'Show QR'}
                  </button>
                </div>

                {/* QR Code */}
                {showQR && (
                  <div className="flex justify-center mb-6 p-4 bg-white rounded-lg">
                    <QRCodeSVG 
                      value={contractAddresses.depositContractAddress} 
                      size={200}
                      level="H"
                    />
                  </div>
                )}

                {/* Address with Copy Button */}
                <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700">
                  <p className="text-xs text-slate-400 mb-2">Contract Address</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-sm font-mono text-white break-all">
                      {contractAddresses.depositContractAddress}
                    </code>
                    <button
                      onClick={() => copyToClipboard(contractAddresses.depositContractAddress)}
                      className="flex-shrink-0 p-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition"
                    >
                      {copied ? <CheckCircle2 size={18} /> : <Copy size={18} />}
                    </button>
                  </div>
                </div>

                {/* Network Info */}
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="bg-slate-900/50 rounded-lg p-3">
                    <p className="text-xs text-slate-400 mb-1">Network</p>
                    <p className="text-sm font-medium text-emerald-400">{contractAddresses.network}</p>
                  </div>
                  <div className="bg-slate-900/50 rounded-lg p-3">
                    <p className="text-xs text-slate-400 mb-1">Token</p>
                    <p className="text-sm font-medium text-blue-400">USDC</p>
                  </div>
                </div>
              </div>

              {/* Instructions */}
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
                <p className="text-blue-400 text-sm font-medium mb-3">📝 How to Deposit</p>
                <ol className="text-blue-300/80 text-sm space-y-2 pl-5 list-decimal">
                  <li>Copy the contract address above (or scan QR code)</li>
                  <li>Open your wallet app (MetaMask, Trust Wallet, etc.)</li>
                  <li>Send USDC to the copied address on <strong>{contractAddresses.network}</strong></li>
                  <li>Your deposit will appear automatically after blockchain confirmation</li>
                </ol>
              </div>

              {/* USDC Token Address (Optional) */}
              <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-4">
                <p className="text-xs text-slate-400 mb-2">USDC Token Address (for reference)</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-xs font-mono text-slate-500 break-all">
                    {contractAddresses.usdcTokenAddress}
                  </code>
                  <button
                    onClick={() => copyToClipboard(contractAddresses.usdcTokenAddress)}
                    className="flex-shrink-0 p-1.5 bg-slate-700 hover:bg-slate-600 rounded transition"
                  >
                    <Copy size={14} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Stats */}
          {stats && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
                <p className="text-slate-400 text-sm mb-1">Total Deposited</p>
                <p className="text-2xl font-bold text-emerald-400">{stats.totalDeposited.toFixed(2)} USDC</p>
              </div>
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
                <p className="text-slate-400 text-sm mb-1">Total Deposits</p>
                <p className="text-2xl font-bold text-blue-400">{stats.depositCount}</p>
                </div>
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
                <p className="text-slate-400 text-sm mb-1">Wallet</p>
                <p className="text-sm font-mono text-slate-300">{stats.walletAddress?.slice(0, 10)}...{stats.walletAddress?.slice(-8)}</p>
              </div>
            </div>
          )}

        </div>

        {/* Deposit History */}
        <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-2xl p-6 sm:p-8">
          <h2 className="text-xl font-bold mb-4">Deposit History</h2>
          
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block w-8 h-8 border-4 border-slate-700 border-t-emerald-500 rounded-full animate-spin"></div>
              <p className="text-slate-400 mt-4">Loading deposits...</p>
            </div>
          ) : depositHistory.length === 0 ? (
            <div className="text-center py-12">
              <History className="w-16 h-16 text-slate-700 mx-auto mb-4" />
              <p className="text-slate-400">No deposits yet</p>
              <p className="text-slate-500 text-sm mt-2">Your USDC deposits will appear here automatically</p>
            </div>
          ) : (
            <div className="space-y-3">
              {depositHistory.map((deposit) => (
                <div
                  key={deposit.id}
                  className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 hover:bg-slate-800/70 transition"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle className="w-5 h-5 text-emerald-400" />
                        <span className="font-bold text-lg">{parseFloat(deposit.amount).toFixed(2)} USDC</span>
                      </div>
                      <div className="space-y-1 text-sm">
                        <div className="flex items-center gap-2 text-slate-400">
                          <Clock className="w-4 h-4" />
                          {new Date(deposit.timestamp).toLocaleString()}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-slate-400">TX:</span>
                          <a
                            href={`https://bscscan.com/tx/${deposit.transaction_hash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-400 hover:underline font-mono text-xs flex items-center gap-1"
                          >
                            {deposit.transaction_hash.slice(0, 10)}...{deposit.transaction_hash.slice(-8)}
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                        <div className="text-slate-500 text-xs">
                          Block: {deposit.block_number}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {depositHistory.length > 0 && (
            <div className="mt-6 p-4 bg-slate-800/30 rounded-xl border border-slate-700/50">
              <p className="text-xs text-slate-500">
                ✨ All deposits are automatically monitored from the smart contract. No manual approval needed!
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
