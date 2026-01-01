'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { connectWallet, depositToContract, getWalletAddress, formatAddress, checkTransactionStatus } from '@/lib/wallet';
import { DEPOSIT_CONTRACT_ADDRESS } from '@/lib/config';
import api from '@/lib/api';

export default function PaymentPage() {
  const router = useRouter();
  const params = useParams();
  const paymentId = params?.id as string;
  
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [txConfirmed, setTxConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [depositRequest, setDepositRequest] = useState<any>(null);

  useEffect(() => {
    if (paymentId) {
      fetchDepositRequest();
      checkWalletConnection();
    }
  }, [paymentId]);

  const checkWalletConnection = async () => {
    const address = await getWalletAddress();
    setWalletAddress(address);
  };

  const fetchDepositRequest = async () => {
    try {
      setFetching(true);
      setError(null);
      
      // Get all deposits and find the one matching the payment ID
      const response = await api.get('/deposits/my-deposits');
      const deposits = response.data.deposits || [];
      const deposit = deposits.find((d: any) => d.id === paymentId);
      
      if (!deposit) {
        setError('Payment request not found');
        return;
      }
      
      if (deposit.status !== 'pending') {
        setError(`This payment has already been ${deposit.status}`);
        return;
      }
      
      setDepositRequest(deposit);
      setAmount(deposit.amount.toString());
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch payment details');
    } finally {
      setFetching(false);
    }
  };

  const handleConnect = async () => {
    try {
      setError(null);
      const address = await connectWallet();
      setWalletAddress(address);
    } catch (err: any) {
      setError(err.message || 'Failed to connect wallet');
    }
  };

  const handlePayment = async () => {
    if (!walletAddress) {
      setError('Please connect your wallet first');
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    if (!DEPOSIT_CONTRACT_ADDRESS) {
      setError('Deposit contract address not configured');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Deposit to contract
      const hash = await depositToContract(amount, (hash) => {
        setTxHash(hash);
      });

      setTxHash(hash);

      // Wait for transaction confirmation, then update deposit request with hash
      let confirmed = false;
      let attempts = 0;
      const maxAttempts = 12; // 1 minute max wait

      while (!confirmed && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
        const status = await checkTransactionStatus(hash);
        if (status.confirmed) {
          confirmed = true;
          setTxConfirmed(true);
        }
        attempts++;
      }

      // Update deposit request with transaction hash
      await api.put(`/deposits/${paymentId}/transaction-hash`, {
        transactionHash: hash,
      });

      // Refresh deposit request
      await fetchDepositRequest();

    } catch (err: any) {
      setError(err.message || 'Failed to process payment');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="min-h-screen bg-linear-to-br from-gray-900 via-gray-800 to-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading payment details...</p>
        </div>
      </div>
    );
  }

  if (!depositRequest) {
    return (
      <div className="min-h-screen bg-linear-to-br from-gray-900 via-gray-800 to-gray-900 text-white p-4">
        <div className="max-w-2xl mx-auto">
          <button
            onClick={() => router.back()}
            className="mb-6 text-gray-400 hover:text-white transition"
          >
            ← Back
          </button>
          <div className="bg-gray-800 rounded-2xl p-6 shadow-2xl">
            <h1 className="text-3xl font-bold mb-4">Payment Not Found</h1>
            {error && (
              <div className="bg-red-500/20 border border-red-500 rounded-lg p-4">
                <p className="text-red-400">{error}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-gray-900 via-gray-800 to-gray-900 text-white p-4">
      <div className="max-w-2xl mx-auto">
        <button
          onClick={() => router.back()}
          className="mb-6 text-gray-400 hover:text-white transition"
        >
          ← Back
        </button>

        <div className="bg-gray-800 rounded-2xl p-6 shadow-2xl">
          <h1 className="text-3xl font-bold mb-2">Complete Payment</h1>
          <p className="text-gray-400 mb-8">Payment ID: {paymentId}</p>

          {error && (
            <div className="bg-red-500/20 border border-red-500 rounded-lg p-4 mb-6">
              <p className="text-red-400">{error}</p>
            </div>
          )}

          {txHash && (
            <div className="bg-green-500/20 border border-green-500 rounded-lg p-4 mb-6">
              <p className="text-green-400 mb-2">Transaction Hash:</p>
              <a
                href={`https://bscscan.com/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-green-300 hover:underline break-all"
              >
                {txHash}
              </a>
              {txConfirmed && (
                <p className="text-green-400 mt-2">✓ Transaction confirmed! Waiting for admin approval.</p>
              )}
            </div>
          )}

          <div className="space-y-6">
            {/* Payment Details */}
            <div className="bg-gray-700/50 rounded-lg p-4">
              <h2 className="text-lg font-semibold mb-3">Payment Details</h2>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-400">Amount:</span>
                  <span className="font-semibold">${depositRequest.amount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Status:</span>
                  <span className={`font-semibold ${
                    depositRequest.status === 'pending' ? 'text-yellow-400' :
                    depositRequest.status === 'approved' ? 'text-green-400' :
                    'text-red-400'
                  }`}>
                    {depositRequest.status.toUpperCase()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Created:</span>
                  <span className="text-sm">{new Date(depositRequest.created_at).toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Wallet Connection */}
            <div>
              <label className="block text-sm font-medium mb-2">Wallet Address</label>
              {walletAddress ? (
                <div className="bg-gray-700 rounded-lg p-4 flex items-center justify-between">
                  <span className="font-mono text-sm">{formatAddress(walletAddress)}</span>
                  <span className="text-green-400 text-sm">Connected</span>
                </div>
              ) : (
                <button
                  onClick={handleConnect}
                  className="w-full bg-blue-600 hover:bg-blue-700 rounded-lg p-4 font-medium transition"
                >
                  Connect Wallet
                </button>
              )}
            </div>

            {/* Deposit Contract Address */}
            <div>
              <label className="block text-sm font-medium mb-2">Deposit Contract Address</label>
              <div className="bg-gray-700 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-sm break-all">{DEPOSIT_CONTRACT_ADDRESS || 'Not configured'}</span>
                  {DEPOSIT_CONTRACT_ADDRESS && (
                    <button
                      onClick={() => navigator.clipboard.writeText(DEPOSIT_CONTRACT_ADDRESS)}
                      className="ml-4 text-blue-400 hover:text-blue-300"
                    >
                      Copy
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Amount Input */}
            <div>
              <label className="block text-sm font-medium mb-2">Amount (BNB)</label>
              <input
                type="number"
                step="0.001"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.0"
                className="w-full bg-gray-700 rounded-lg p-4 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loading || !!txHash || depositRequest.status !== 'pending'}
              />
            </div>

            {/* Quick Amount Buttons */}
            <div className="flex gap-2">
              {['0.1', '0.5', '1', '5'].map((val) => (
                <button
                  key={val}
                  onClick={() => setAmount(val)}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 rounded-lg p-2 text-sm transition"
                  disabled={loading || !!txHash || depositRequest.status !== 'pending'}
                >
                  {val} BNB
                </button>
              ))}
            </div>

            {/* Submit Button */}
            {depositRequest.status === 'pending' && (
              <button
                onClick={handlePayment}
                disabled={loading || !walletAddress || !amount || !!txHash}
                className="w-full bg-linear-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 rounded-lg p-4 font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Processing...' : txHash ? 'Transaction Sent' : 'Send Transaction'}
              </button>
            )}

            {depositRequest.status !== 'pending' && (
              <div className="bg-gray-700/50 rounded-lg p-4 text-center">
                <p className="text-gray-400">
                  This payment has been {depositRequest.status}. No further action required.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

