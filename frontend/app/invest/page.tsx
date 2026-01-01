'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { TrendingUp, TrendingDown, ArrowLeft, DollarSign, Clock, AlertCircle, CheckCircle } from 'lucide-react';

interface Pool {
  id: number;
  pair: string;
  symbol: string;
  protocol: string;
  risk: string;
  apy: string;
  apyValue: number;
  tvl: string;
  volume: string;
  gradient: [string, string];
  riskColor: { bg: string; text: string };
}

interface Investment {
  id: string;
  pool: Pool;
  stakedAmount: number;
  stakedAt: string;
  isActive: boolean;
  earnings: {
    durationHours: number;
    durationDays: number;
    earnedAmount: number;
    currentValue: number;
    percentageGain: number;
  };
}

export default function InvestPage() {
  const router = useRouter();
  const [pools, setPools] = useState<Pool[]>([]);
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [loading, setLoading] = useState(true);
  const [investing, setInvesting] = useState<string | null>(null);
  const [selectedPool, setSelectedPool] = useState<Pool | null>(null);
  const [investAmount, setInvestAmount] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [balances, setBalances] = useState<{ vault: number; invested: number } | null>(null);

  useEffect(() => {
    fetchPools();
    fetchInvestments();
    fetchBalances();
    const interval = setInterval(() => {
      fetchInvestments();
      fetchBalances();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchPools = async () => {
    try {
      const response = await api.get('/pools');
      setPools(response.data.pools || []);
    } catch (err: any) {
      if (err.response?.status === 401) {
        router.push('/login');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchInvestments = async () => {
    try {
      const response = await api.get('/investments');
      setInvestments(response.data.investments || []);
    } catch (err) {
      console.error('Error fetching investments:', err);
    }
  };

  const fetchBalances = async () => {
    try {
      const response = await api.get('/balances/me');
      setBalances({
        vault: response.data.vault || 0,
        invested: response.data.invested || 0,
      });
    } catch (err) {
      console.error('Error fetching balances:', err);
    }
  };

  const handleInvest = async () => {
    if (!selectedPool || !investAmount || parseFloat(investAmount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    const amount = parseFloat(investAmount);
    const availableBalance = balances?.vault || 0;

    if (amount > availableBalance) {
      setError(`Insufficient vault balance. Available: $${availableBalance.toFixed(2)}`);
      return;
    }

    try {
      setInvesting(selectedPool.id.toString());
      setError(null);

      // Backend will automatically transfer from vault to investment if needed
      await api.post('/investments', {
        poolId: selectedPool.id,
        amount: amount,
      });

      // Refresh data
      await Promise.all([fetchInvestments(), fetchBalances()]);

      setSelectedPool(null);
      setInvestAmount('');
      alert(`Successfully invested $${amount.toFixed(2)} in ${selectedPool.pair}!`);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Investment failed');
    } finally {
      setInvesting(null);
    }
  };

  const handleUnstake = async (investmentId: string) => {
    if (!confirm('Are you sure you want to unstake this investment? You will receive your principal plus earnings.')) {
      return;
    }

    try {
      const response = await api.delete(`/investments/${investmentId}`);
      await Promise.all([fetchInvestments(), fetchBalances()]);
      alert(`Successfully unstaked! Returned: $${response.data.returnedAmount.toFixed(2)} (Earned: $${response.data.earnedAmount.toFixed(2)})`);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Unstake failed');
    }
  };

  const totalInvested = investments.reduce((sum, inv) => sum + inv.stakedAmount, 0);
  const totalEarnings = investments.reduce((sum, inv) => sum + inv.earnings.earnedAmount, 0);
  const totalValue = investments.reduce((sum, inv) => sum + inv.earnings.currentValue, 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white p-4 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p>Loading investment pools...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white p-4">
      <div className="max-w-6xl mx-auto">
        <button
          onClick={() => router.back()}
          className="mb-6 text-gray-400 hover:text-white transition flex items-center gap-2"
        >
          <ArrowLeft size={20} />
          Back
        </button>

        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Investment Pools</h1>
          <p className="text-gray-400">Choose a pool to invest your funds and earn passive income</p>
        </div>

        {/* Balance Summary */}
        <div className="grid md:grid-cols-3 gap-4 mb-8">
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <p className="text-sm text-gray-400 mb-1">Available to Invest</p>
            <p className="text-2xl font-bold text-blue-400">${(balances?.vault || 0).toFixed(2)}</p>
            <p className="text-xs text-gray-500 mt-1">Vault Balance</p>
          </div>
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <p className="text-sm text-gray-400 mb-1">Total Invested</p>
            <p className="text-2xl font-bold text-green-400">${totalInvested.toFixed(2)}</p>
            <p className="text-xs text-gray-500 mt-1">Across all pools</p>
          </div>
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <p className="text-sm text-gray-400 mb-1">Total Earnings</p>
            <p className="text-2xl font-bold text-purple-400">${totalEarnings.toFixed(2)}</p>
            <p className="text-xs text-gray-500 mt-1">Lifetime earnings</p>
          </div>
        </div>

        {/* Available Pools */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold mb-4">Available Pools</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pools.map((pool) => (
              <div
                key={pool.id}
                className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-blue-500/50 transition-all cursor-pointer"
                onClick={() => setSelectedPool(pool)}
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-bold mb-1">{pool.pair}</h3>
                    <span
                      className="text-xs px-2 py-1 rounded-full"
                      style={{
                        backgroundColor: pool.riskColor.bg,
                        color: pool.riskColor.text,
                      }}
                    >
                      {pool.risk}
                    </span>
                  </div>
                  <TrendingUp size={24} className="text-green-400" />
                </div>
                <div className="space-y-2">
                  <div>
                    <p className="text-sm text-gray-400">APY Range</p>
                    <p className="text-2xl font-bold" style={{ color: pool.gradient[0] }}>
                      {pool.apy}
                    </p>
                  </div>
                  <div className="pt-2 border-t border-gray-700">
                    <p className="text-xs text-gray-500">Protocol: {pool.protocol}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Active Investments */}
        {investments.length > 0 && (
          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-4">Your Active Investments</h2>
            <div className="space-y-4">
              {investments
                .filter((inv) => inv.isActive)
                .map((investment) => (
                  <div
                    key={investment.id}
                    className="bg-gray-800 rounded-lg p-6 border border-gray-700"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-xl font-bold mb-1">{investment.pool.pair}</h3>
                        <span
                          className="text-xs px-2 py-1 rounded-full"
                          style={{
                            backgroundColor: investment.pool.riskColor.bg,
                            color: investment.pool.riskColor.text,
                          }}
                        >
                          {investment.pool.risk}
                        </span>
                      </div>
                      <button
                        onClick={() => handleUnstake(investment.id)}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-sm font-medium transition"
                      >
                        Unstake
                      </button>
                    </div>
                    <div className="grid md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-sm text-gray-400 mb-1">Invested</p>
                        <p className="text-lg font-bold">${investment.stakedAmount.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-400 mb-1">Current Value</p>
                        <p className="text-lg font-bold text-green-400">
                          ${investment.earnings.currentValue.toFixed(2)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-400 mb-1">Earnings</p>
                        <p className="text-lg font-bold text-purple-400">
                          +${investment.earnings.earnedAmount.toFixed(2)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-400 mb-1">Gain</p>
                        <p className="text-lg font-bold text-green-400">
                          +{investment.earnings.percentageGain.toFixed(2)}%
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 pt-4 border-t border-gray-700">
                      <p className="text-xs text-gray-500">
                        Staked: {new Date(investment.stakedAt).toLocaleDateString()} • Duration:{' '}
                        {Math.floor(investment.earnings.durationDays)} days
                      </p>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Investment Modal */}
        {selectedPool && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-gray-800 rounded-2xl p-6 shadow-2xl w-full max-w-md border border-gray-700">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold">Invest in {selectedPool.pair}</h2>
                <button
                  onClick={() => {
                    setSelectedPool(null);
                    setInvestAmount('');
                    setError(null);
                  }}
                  className="text-gray-400 hover:text-white"
                >
                  ✕
                </button>
              </div>

              <div className="mb-4">
                <div className="bg-gray-700 rounded-lg p-4 mb-4">
                  <p className="text-sm text-gray-400 mb-1">APY Range</p>
                  <p className="text-2xl font-bold" style={{ color: selectedPool.gradient[0] }}>
                    {selectedPool.apy}
                  </p>
                  <span
                    className="inline-block text-xs px-2 py-1 rounded-full mt-2"
                    style={{
                      backgroundColor: selectedPool.riskColor.bg,
                      color: selectedPool.riskColor.text,
                    }}
                  >
                    {selectedPool.risk}
                  </span>
                </div>

                {error && (
                  <div className="bg-red-500/20 border border-red-500 rounded-lg p-3 mb-4">
                    <p className="text-red-400 text-sm">{error}</p>
                  </div>
                )}

                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2">Amount (USDC)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max={balances?.vault || 0}
                    value={investAmount}
                    onChange={(e) => setInvestAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-gray-700 rounded-lg p-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-400 mt-2">
                    Available: ${(balances?.vault || 0).toFixed(2)}
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleInvest}
                  disabled={investing === selectedPool.id.toString() || !investAmount || parseFloat(investAmount) <= 0}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 rounded-lg p-3 font-medium transition disabled:opacity-50"
                >
                  {investing === selectedPool.id.toString() ? 'Investing...' : 'Invest'}
                </button>
                <button
                  onClick={() => {
                    setSelectedPool(null);
                    setInvestAmount('');
                    setError(null);
                  }}
                  className="px-6 bg-gray-700 hover:bg-gray-600 rounded-lg font-medium transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

