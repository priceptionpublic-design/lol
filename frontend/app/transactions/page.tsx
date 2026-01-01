'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';

interface Deposit {
  id: string;
  amount: number;
  status: 'pending' | 'approved' | 'rejected';
  transaction_hash?: string;
  created_at: string;
  updated_at: string;
}

interface Withdrawal {
  id: string;
  amount: number;
  status: 'pending' | 'approved' | 'rejected' | 'processing' | 'completed';
  to_address: string;
  transaction_hash?: string;
  requested_at: string;
  created_at: string;
}

export default function TransactionsPage() {
  const router = useRouter();
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'deposits' | 'withdrawals'>('deposits');

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    try {
      const [depositsRes, withdrawalsRes] = await Promise.all([
        api.get('/deposits/my-deposits'),
        api.get('/withdrawals/my-withdrawals').catch(() => ({ data: { withdrawals: [] } })),
      ]);

      setDeposits(depositsRes.data.deposits || []);
      setWithdrawals(withdrawalsRes.data.withdrawals || []);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
      case 'completed':
        return 'text-green-400 bg-green-400/20';
      case 'pending':
      case 'processing':
        return 'text-yellow-400 bg-yellow-400/20';
      case 'rejected':
        return 'text-red-400 bg-red-400/20';
      default:
        return 'text-gray-400 bg-gray-400/20';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-linear-to-br from-gray-900 via-gray-800 to-gray-900 text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-gray-900 via-gray-800 to-gray-900 text-white p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => router.back()}
            className="text-gray-400 hover:text-white transition"
          >
            ← Back
          </button>
          <h1 className="text-3xl font-bold">Transaction History</h1>
          <div className="w-16"></div>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setActiveTab('deposits')}
            className={`px-6 py-3 rounded-lg font-semibold transition ${
              activeTab === 'deposits'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            Deposits ({deposits.length})
          </button>
          <button
            onClick={() => setActiveTab('withdrawals')}
            className={`px-6 py-3 rounded-lg font-semibold transition ${
              activeTab === 'withdrawals'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            Withdrawals ({withdrawals.length})
          </button>
        </div>

        {/* Deposits Tab */}
        {activeTab === 'deposits' && (
          <div className="bg-gray-800 rounded-2xl p-6">
            {deposits.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-400 mb-4">No deposits yet</p>
                <Link
                  href="/deposit"
                  className="text-blue-400 hover:text-blue-300 underline"
                >
                  Make your first deposit
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {deposits.map((deposit) => (
                  <div
                    key={deposit.id}
                    className="bg-gray-700 rounded-lg p-6 border border-gray-600"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <p className="text-2xl font-bold">${deposit.amount.toFixed(2)}</p>
                        <p className="text-sm text-gray-400 mt-1">
                          {formatDate(deposit.created_at)}
                        </p>
                      </div>
                      <span
                        className={`px-4 py-2 rounded-full text-sm font-semibold ${getStatusColor(
                          deposit.status
                        )}`}
                      >
                        {deposit.status.toUpperCase()}
                      </span>
                    </div>
                    {deposit.transaction_hash && (
                      <div className="mt-4 pt-4 border-t border-gray-600">
                        <p className="text-sm text-gray-400 mb-2">Transaction Hash:</p>
                        <a
                          href={`https://bscscan.com/tx/${deposit.transaction_hash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:text-blue-300 font-mono text-sm break-all"
                        >
                          {deposit.transaction_hash}
                        </a>
                      </div>
                    )}
                    <p className="text-xs text-gray-500 mt-2">ID: {deposit.id}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Withdrawals Tab */}
        {activeTab === 'withdrawals' && (
          <div className="bg-gray-800 rounded-2xl p-6">
            {withdrawals.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-400 mb-4">No withdrawals yet</p>
                <Link
                  href="/withdraw"
                  className="text-blue-400 hover:text-blue-300 underline"
                >
                  Request a withdrawal
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {withdrawals.map((withdrawal) => (
                  <div
                    key={withdrawal.id}
                    className="bg-gray-700 rounded-lg p-6 border border-gray-600"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <p className="text-2xl font-bold">${withdrawal.amount.toFixed(2)}</p>
                        <p className="text-sm text-gray-400 mt-1">
                          {formatDate(withdrawal.requested_at)}
                        </p>
                        <p className="text-xs text-gray-500 mt-1 font-mono">
                          To: {withdrawal.to_address.slice(0, 10)}...{withdrawal.to_address.slice(-8)}
                        </p>
                      </div>
                      <span
                        className={`px-4 py-2 rounded-full text-sm font-semibold ${getStatusColor(
                          withdrawal.status
                        )}`}
                      >
                        {withdrawal.status.toUpperCase()}
                      </span>
                    </div>
                    {withdrawal.transaction_hash && (
                      <div className="mt-4 pt-4 border-t border-gray-600">
                        <p className="text-sm text-gray-400 mb-2">Transaction Hash:</p>
                        <a
                          href={`https://bscscan.com/tx/${withdrawal.transaction_hash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:text-blue-300 font-mono text-sm break-all"
                        >
                          {withdrawal.transaction_hash}
                        </a>
                      </div>
                    )}
                    <p className="text-xs text-gray-500 mt-2">ID: {withdrawal.id}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

