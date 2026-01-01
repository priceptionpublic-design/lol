'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { formatAddress } from '@/lib/wallet';
import api from '@/lib/api';

interface WithdrawalRequest {
  id: string;
  amount: string;
  to_address: string;
  status: string;
  requested_at: string;
  created_at: string;
  transaction_hash?: string;
  rejection_reason?: string;
}

interface User {
  walletAddress: string;
  username: string;
}

interface BalanceData {
  vault: number;
  invested: number;
  referral: number;
  total: number;
}

export default function WithdrawPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [balances, setBalances] = useState<BalanceData | null>(null);

  useEffect(() => {
    fetchUserData();
    fetchWithdrawals();
    fetchBalances();
  }, []);

  const fetchUserData = async () => {
    try {
      const response = await api.get('/auth/me');
      setUser(response.data.user);
    } catch (err) {
      console.error('Error fetching user:', err);
      router.push('/login');
    }
  };

  const fetchBalances = async () => {
    try {
      const response = await api.get<BalanceData>('/balances/me');
      setBalances(response.data);
    } catch (err) {
      console.error('Error fetching balances:', err);
    }
  };

  const fetchWithdrawals = async () => {
    try {
      const response = await api.get('/withdrawals/my-withdrawals');
      setWithdrawals(response.data.withdrawals || []);
    } catch (err) {
      console.error('Error fetching withdrawals:', err);
    }
  };

  const handleWithdraw = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    const vaultBalance = balances?.vault || 0;
    if (parseFloat(amount) > vaultBalance) {
      setError('Insufficient vault balance. Transfer from investment to vault first.');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      await api.post('/withdrawals/request', {
        amount: parseFloat(amount),
      });

      setAmount('');
      await fetchWithdrawals();
      await fetchBalances();

      alert('Withdrawal request submitted successfully! Admin will process it shortly and send USDC to your registered wallet address.');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to submit withdrawal request');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'text-green-400';
      case 'rejected':
        return 'text-red-400';
      case 'pending':
        return 'text-yellow-400';
      default:
        return 'text-gray-400';
    }
  };

  const vaultBalance = balances?.vault || 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white p-4">
      <div className="max-w-2xl mx-auto">
        <button
          onClick={() => router.back()}
          className="mb-6 text-gray-400 hover:text-white transition"
        >
          ← Back
        </button>

        <div className="bg-gray-800 rounded-2xl p-6 shadow-2xl mb-6">
          <h1 className="text-3xl font-bold mb-2">Withdraw Funds</h1>
          <p className="text-gray-400 mb-4">Request a withdrawal from your vault balance</p>

          <div className="bg-blue-500/20 border border-blue-500 rounded-lg p-4 mb-4">
            <p className="text-blue-400 text-sm mb-2">
              📍 <strong>Withdrawal Address:</strong>
            </p>
            <p className="text-blue-300 font-mono text-sm">
              {user?.walletAddress || 'Loading...'}
            </p>
          </div>

          <div className="bg-yellow-500/20 border border-yellow-500 rounded-lg p-4 mb-6">
            <p className="text-yellow-400 text-sm">
              ⚠️ Admin approval required. Funds will be sent to your registered wallet address.
            </p>
          </div>

          {error && (
            <div className="bg-red-500/20 border border-red-500 rounded-lg p-4 mb-6">
              <p className="text-red-400">{error}</p>
            </div>
          )}

          <div className="space-y-6">
            {/* Balance Display */}
            <div className="bg-gray-700 rounded-lg p-4">
              <p className="text-sm text-gray-400 mb-1">Vault Balance (Available for Withdrawal)</p>
              <p className="text-2xl font-bold">${vaultBalance.toFixed(2)} USDC</p>
              <p className="text-xs text-gray-400 mt-2">
                💡 Tip: Only vault balance can be withdrawn. Transfer from investment to vault first if needed.
              </p>
            </div>

            {/* Amount Input */}
            <div>
              <label className="block text-sm font-medium mb-2">Amount (USD)</label>
              <div className="relative">
                <span className="absolute left-4 top-4 text-gray-400 text-lg">$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max={vaultBalance}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-gray-700 rounded-lg p-4 pl-8 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={loading}
                />
                <button
                  onClick={() => setAmount(String(vaultBalance))}
                  className="absolute right-2 top-2 bg-blue-600 hover:bg-blue-700 px-3 py-2 rounded-lg text-sm font-medium transition"
                  disabled={loading}
                >
                  MAX
                </button>
              </div>
            </div>

            {/* Quick Amount Buttons */}
            <div className="grid grid-cols-4 gap-2">
              {['10', '50', '100', '500'].map((val) => (
                <button
                  key={val}
                  onClick={() => setAmount(val)}
                  className="bg-gray-700 hover:bg-gray-600 rounded-lg p-3 text-sm transition disabled:opacity-50"
                  disabled={loading || parseFloat(val) > vaultBalance}
                >
                  ${val}
                </button>
              ))}
            </div>

            {/* Submit Button */}
            <button
              onClick={handleWithdraw}
              disabled={loading || !amount || parseFloat(amount) > vaultBalance}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-lg p-4 font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Submitting...' : 'Request Withdrawal'}
            </button>
          </div>
        </div>

        {/* Withdrawal History */}
        <div className="bg-gray-800 rounded-2xl p-6 shadow-2xl">
          <h2 className="text-2xl font-bold mb-4">Withdrawal History</h2>
          {withdrawals.length === 0 ? (
            <p className="text-gray-400">No withdrawal requests yet</p>
          ) : (
            <div className="space-y-4">
              {withdrawals.map((withdrawal) => (
                <div
                  key={withdrawal.id}
                  className="bg-gray-700 rounded-lg p-4 border border-gray-600"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-medium text-lg">${parseFloat(withdrawal.amount).toFixed(2)} USDC</p>
                      <p className="text-sm text-gray-400 font-mono">
                        To: {formatAddress(withdrawal.to_address)}
                      </p>
                    </div>
                    <span className={`text-sm font-medium px-3 py-1 rounded-full ${
                      withdrawal.status === 'approved' ? 'bg-green-500/20 text-green-400' :
                      withdrawal.status === 'rejected' ? 'bg-red-500/20 text-red-400' :
                      'bg-yellow-500/20 text-yellow-400'
                    }`}>
                      {withdrawal.status.toUpperCase()}
                    </span>
                  </div>
                  
                  <div className="text-sm text-gray-400 mt-2">
                    <p>Requested: {new Date(withdrawal.requested_at).toLocaleString()}</p>
                  </div>

                  {withdrawal.transaction_hash && (
                    <div className="mt-2 text-sm">
                      <p className="text-gray-400">Transaction Hash:</p>
                      <p className="text-blue-400 font-mono break-all">{withdrawal.transaction_hash}</p>
                    </div>
                  )}

                  {withdrawal.rejection_reason && (
                    <div className="mt-2 text-sm">
                      <p className="text-gray-400">Rejection Reason:</p>
                      <p className="text-red-400">{withdrawal.rejection_reason}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
