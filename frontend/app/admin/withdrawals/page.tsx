'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { formatAddress } from '@/lib/wallet';

interface WithdrawalRequest {
  id: string;
  amount: string;
  to_address: string;
  status: string;
  requested_at: string;
  approved_at?: string;
  completed_at?: string;
  transaction_hash?: string;
  rejection_reason?: string;
  created_at: string;
  user: {
    id: string;
    username: string;
    email: string;
    wallet_address: string;
    vault_balance?: string;
  };
  approved_by_user?: {
    username: string;
  };
}

type TabType = 'pending' | 'approved' | 'rejected' | 'all';

export default function AdminWithdrawalsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>('pending');
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    fetchWithdrawals();
    const interval = setInterval(fetchWithdrawals, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [activeTab]);

  const fetchWithdrawals = async () => {
    try {
      setLoading(true);
      let response;
      
      if (activeTab === 'pending') {
        response = await api.get('/withdrawals/pending');
      } else {
        response = await api.get(`/withdrawals/all${activeTab !== 'all' ? `?status=${activeTab}` : ''}`);
      }
      
      setWithdrawals(response.data.withdrawals || []);
      setError(null);
    } catch (err: any) {
      if (err.response?.status === 403) {
        setError('Admin access required');
        router.push('/');
      } else {
        setError(err.response?.data?.error || 'Failed to fetch withdrawals');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    const hash = txHash[id] || '';
    
    if (!hash) {
      alert('Transaction hash is required. Please complete the transfer and enter the transaction hash.');
      return;
    }

    const confirmed = confirm('Have you completed the transfer and confirmed the transaction? This will deduct from the user\'s vault balance.');
    if (!confirmed) return;
    
    try {
      setApprovingId(id);
      await api.post(`/withdrawals/${id}/approve`, {
        transactionHash: hash,
      });
      
      await fetchWithdrawals();
      setTxHash((prev) => {
        const newHash = { ...prev };
        delete newHash[id];
        return newHash;
      });
      alert('Withdrawal approved successfully and balance deducted!');
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to approve withdrawal');
    } finally {
      setApprovingId(null);
    }
  };

  const handleReject = async (id: string) => {
    const reason = prompt('Enter rejection reason:');
    if (!reason) return;

    try {
      setApprovingId(id);
      await api.post(`/withdrawals/${id}/reject`, { reason });
      await fetchWithdrawals();
      alert('Withdrawal rejected');
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to reject withdrawal');
    } finally {
      setApprovingId(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-500/20 text-yellow-400';
      case 'approved':
        return 'bg-green-500/20 text-green-400';
      case 'rejected':
        return 'bg-red-500/20 text-red-400';
      default:
        return 'bg-gray-500/20 text-gray-400';
    }
  };

  if (loading && withdrawals.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white p-4 flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white p-4">
      <div className="max-w-6xl mx-auto">
        <button
          onClick={() => router.back()}
          className="mb-6 text-gray-400 hover:text-white transition"
        >
          ← Back
        </button>

        <div className="bg-gray-800 rounded-2xl p-6 shadow-2xl">
          <h1 className="text-3xl font-bold mb-2">Withdrawal Management</h1>
          <p className="text-gray-400 mb-6">Approve or reject withdrawal requests</p>

          {/* Tabs */}
          <div className="flex gap-2 mb-6 border-b border-gray-700">
            {(['pending', 'approved', 'rejected', 'all'] as TabType[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 font-medium capitalize transition ${
                  activeTab === tab
                    ? 'text-blue-400 border-b-2 border-blue-400'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {error && (
            <div className="bg-red-500/20 border border-red-500 rounded-lg p-4 mb-6">
              <p className="text-red-400">{error}</p>
            </div>
          )}

          {withdrawals.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-400">No {activeTab !== 'all' ? activeTab : ''} withdrawals found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {withdrawals.map((withdrawal) => (
                <div
                  key={withdrawal.id}
                  className="bg-gray-700 rounded-lg p-6 border border-gray-600"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <p className="text-2xl font-bold mb-1">${parseFloat(withdrawal.amount).toFixed(2)} USDC</p>
                      <p className="text-sm text-gray-400">
                        User: {withdrawal.user.username} ({withdrawal.user.email})
                      </p>
                      <p className="text-sm text-gray-400 font-mono mt-1">
                        To: {formatAddress(withdrawal.to_address)}
                      </p>
                      {withdrawal.user.vault_balance && (
                        <p className="text-sm text-blue-400 mt-1">
                          User Vault Balance: ${parseFloat(withdrawal.user.vault_balance).toFixed(2)}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(withdrawal.status)}`}>
                        {withdrawal.status}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4 text-sm text-gray-400">
                    <div>
                      <p>Requested:</p>
                      <p className="text-white">
                        {new Date(withdrawal.requested_at).toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p>User Wallet:</p>
                      <p className="text-white font-mono">
                        {formatAddress(withdrawal.user.wallet_address)}
                      </p>
                    </div>
                  </div>

                  {withdrawal.transaction_hash && (
                    <div className="mb-4 text-sm">
                      <p className="text-gray-400">Transaction Hash:</p>
                      <p className="text-white font-mono break-all">{withdrawal.transaction_hash}</p>
                    </div>
                  )}

                  {withdrawal.approved_at && (
                    <div className="mb-4 text-sm">
                      <p className="text-gray-400">Approved:</p>
                      <p className="text-white">{new Date(withdrawal.approved_at).toLocaleString()}</p>
                      {withdrawal.approved_by_user && (
                        <p className="text-gray-400">By: {withdrawal.approved_by_user.username}</p>
                      )}
                    </div>
                  )}

                  {withdrawal.rejection_reason && (
                    <div className="mb-4 text-sm">
                      <p className="text-gray-400">Rejection Reason:</p>
                      <p className="text-red-400">{withdrawal.rejection_reason}</p>
                    </div>
                  )}

                  {withdrawal.status === 'pending' && (
                    <div className="space-y-3 pt-4 border-t border-gray-600">
                      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 text-sm text-blue-400">
                        ⚠️ <strong>Important:</strong> Complete the transfer manually first, then enter the transaction hash and approve.
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Transaction Hash <span className="text-red-400">*</span>
                        </label>
                        <input
                          type="text"
                          value={txHash[withdrawal.id] || ''}
                          onChange={(e) =>
                            setTxHash((prev) => ({
                              ...prev,
                              [withdrawal.id]: e.target.value,
                            }))
                          }
                          placeholder="0x... (required after completing transfer)"
                          className="w-full bg-gray-600 rounded-lg p-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                        />
                      </div>
                      <div className="flex gap-3">
                        <button
                          onClick={() => handleApprove(withdrawal.id)}
                          disabled={approvingId === withdrawal.id || !txHash[withdrawal.id]}
                          className="flex-1 bg-green-600 hover:bg-green-700 rounded-lg p-3 font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {approvingId === withdrawal.id ? 'Approving...' : 'Approve & Deduct Balance'}
                        </button>
                        <button
                          onClick={() => handleReject(withdrawal.id)}
                          disabled={approvingId === withdrawal.id}
                          className="flex-1 bg-red-600 hover:bg-red-700 rounded-lg p-3 font-medium transition disabled:opacity-50"
                        >
                          Reject
                        </button>
                      </div>
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
