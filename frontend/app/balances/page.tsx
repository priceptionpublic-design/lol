'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';

interface BalanceData {
  vault: number;
  invested: number;
  referral: number;
  total: number;
}

export default function BalancesPage() {
  const router = useRouter();
  const [balances, setBalances] = useState<BalanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [transferFrom, setTransferFrom] = useState<'vault' | 'investment'>('vault');
  const [transferAmount, setTransferAmount] = useState('');
  const [transferring, setTransferring] = useState(false);
  const [claiming, setClaiming] = useState(false);

  useEffect(() => {
    fetchBalances();
    const interval = setInterval(fetchBalances, 5000); // Refresh every 5s to show growth
    return () => clearInterval(interval);
  }, []);

  const fetchBalances = async () => {
    try {
      const response = await api.get<BalanceData>('/balances/me');
      setBalances(response.data);
    } catch (err: any) {
      if (err.response?.status === 401) {
        router.push('/login');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleTransfer = async () => {
    if (!transferAmount || parseFloat(transferAmount) <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    const from = transferFrom;
    const to = from === 'vault' ? 'investment' : 'vault';
    const amount = parseFloat(transferAmount);
    const available = from === 'vault' ? (balances?.vault || 0) : (balances?.invested || 0);

    if (amount > available) {
      alert(`Insufficient ${from} balance`);
      return;
    }

    try {
      setTransferring(true);
      await api.post('/balances/transfer', { from, to, amount });
      await fetchBalances();
      setTransferModalOpen(false);
      setTransferAmount('');
      alert(`Successfully transferred $${amount.toFixed(2)} from ${from} to ${to}`);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Transfer failed');
    } finally {
      setTransferring(false);
    }
  };

  const handleClaimReferral = async () => {
    if ((balances?.referral || 0) < 100) {
      alert(`You need $${(100 - (balances?.referral || 0)).toFixed(2)} more to claim`);
      return;
    }

    const confirmed = confirm(`Claim $${balances?.referral.toFixed(2)} referral earnings to your vault?`);
    if (!confirmed) return;

    try {
      setClaiming(true);
      await api.post('/balances/claim-referral');
      await fetchBalances();
      alert('Referral earnings claimed successfully!');
    } catch (err: any) {
      alert(err.response?.data?.error || 'Claim failed');
    } finally {
      setClaiming(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white p-4 flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white p-4">
      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => router.back()}
          className="mb-6 text-gray-400 hover:text-white transition"
        >
          ← Back
        </button>

        <div className="bg-gray-800 rounded-2xl p-6 shadow-2xl mb-6">
          <h1 className="text-3xl font-bold mb-2">Balance Management</h1>
          <p className="text-gray-400 mb-6">Manage your vault, investment, and referral balances</p>

          {/* Total Balance */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-6 mb-6">
            <p className="text-sm text-white/80 mb-1">Total Balance</p>
            <p className="text-4xl font-bold text-white">${balances?.total.toFixed(2) || '0.00'}</p>
          </div>

          {/* Balance Breakdown */}
          <div className="grid gap-4 mb-6">
            {/* Vault */}
            <div className="bg-gray-700 rounded-xl p-4 border border-gray-600">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold text-lg">Vault Balance</p>
                    <p className="text-sm text-gray-400">Safe storage, ready to invest or withdraw</p>
                  </div>
                </div>
                <p className="text-2xl font-bold">${balances?.vault.toFixed(2) || '0.00'}</p>
              </div>
            </div>

            {/* Invested */}
            <div className="bg-gray-700 rounded-xl p-4 border border-green-600/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold text-lg text-green-400">Invested Balance 📈</p>
                    <p className="text-sm text-gray-400">Earning yield automatically</p>
                  </div>
                </div>
                <p className="text-2xl font-bold text-green-400">${balances?.invested.toFixed(2) || '0.00'}</p>
              </div>
            </div>

            {/* Referral */}
            <div className="bg-gray-700 rounded-xl p-4 border border-yellow-600/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-yellow-500/20 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold text-lg">Referral Earnings</p>
                    <p className="text-sm text-gray-400">
                      {(balances?.referral || 0) >= 100
                        ? 'Ready to claim! 🎉'
                        : `$${(100 - (balances?.referral || 0)).toFixed(2)} more to claim`
                      }
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleClaimReferral}
                  disabled={(balances?.referral || 0) < 100 || claiming}
                  className={`px-6 py-2 rounded-lg font-medium transition ${
                    (balances?.referral || 0) >= 100
                      ? 'bg-yellow-600 hover:bg-yellow-700 text-white'
                      : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  {claiming ? 'Claiming...' : `$${balances?.referral.toFixed(2) || '0.00'}`}
                </button>
              </div>
            </div>
          </div>

          {/* Transfer Button */}
          <button
            onClick={() => setTransferModalOpen(true)}
            className="w-full bg-blue-600 hover:bg-blue-700 rounded-lg p-4 font-medium transition flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
            Transfer Between Vault & Investment
          </button>
        </div>
      </div>

      {/* Transfer Modal */}
      {transferModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-2xl p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Transfer Money</h2>
              <button
                onClick={() => setTransferModalOpen(false)}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* Direction Selector */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <button
                onClick={() => setTransferFrom('vault')}
                className={`p-4 rounded-lg border-2 transition ${
                  transferFrom === 'vault'
                    ? 'border-blue-500 bg-blue-500/20'
                    : 'border-gray-600 bg-gray-700'
                }`}
              >
                <p className="font-medium">Vault → Investment</p>
                <p className="text-sm text-gray-400 mt-1">Start earning yield</p>
              </button>
              <button
                onClick={() => setTransferFrom('investment')}
                className={`p-4 rounded-lg border-2 transition ${
                  transferFrom === 'investment'
                    ? 'border-blue-500 bg-blue-500/20'
                    : 'border-gray-600 bg-gray-700'
                }`}
              >
                <p className="font-medium">Investment → Vault</p>
                <p className="text-sm text-gray-400 mt-1">Move to safe storage</p>
              </button>
            </div>

            {/* Info Banner */}
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 mb-4 text-sm text-blue-400">
              {transferFrom === 'vault'
                ? '💰 Money in Investment earns yield automatically'
                : '🔒 Money in Vault is safe but doesn\'t earn yield'
              }
            </div>

            {/* Amount Input */}
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">
                Amount
                <span className="text-gray-400 ml-2">
                  Available: ${(transferFrom === 'vault' ? balances?.vault : balances?.invested)?.toFixed(2) || '0.00'}
                </span>
              </label>
              <div className="flex gap-2">
                <div className="flex-1 bg-gray-700 rounded-lg p-3 flex items-center">
                  <span className="text-xl mr-2">$</span>
                  <input
                    type="number"
                    value={transferAmount}
                    onChange={(e) => setTransferAmount(e.target.value)}
                    placeholder="0.00"
                    className="bg-transparent flex-1 outline-none text-lg"
                    step="0.01"
                  />
                </div>
                <button
                  onClick={() => setTransferAmount(String(transferFrom === 'vault' ? balances?.vault : balances?.invested))}
                  className="bg-blue-600 hover:bg-blue-700 px-4 rounded-lg font-medium transition"
                >
                  MAX
                </button>
              </div>
            </div>

            {/* Transfer Button */}
            <button
              onClick={handleTransfer}
              disabled={transferring}
              className="w-full bg-blue-600 hover:bg-blue-700 rounded-lg p-4 font-medium transition disabled:opacity-50"
            >
              {transferring ? 'Transferring...' : 'Transfer'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

