'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { ArrowLeft, History, ExternalLink, Clock, CheckCircle } from 'lucide-react';

export default function DepositPage() {
  const router = useRouter();
  const [depositHistory, setDepositHistory] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [historyRes, statsRes] = await Promise.all([
        api.get('/deposits/my-history'),
        api.get('/deposits/my-stats')
      ]);
      
      setDepositHistory(historyRes.data.deposits || []);
      setStats(statsRes.data);
    } catch (error) {
      console.error('Failed to load deposit data:', error);
    } finally {
      setLoading(false);
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
              <h1 className="text-2xl font-bold">USDC Deposit History</h1>
              <p className="text-slate-400 text-sm">View your on-chain deposits</p>
            </div>
            </div>

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

          {/* Instructions */}
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
            <p className="text-blue-400 text-sm font-medium mb-2">💡 How to Deposit USDC</p>
            <ol className="text-blue-300/80 text-sm space-y-1 pl-4">
              <li>1. Use your wallet app (MetaMask, Trust Wallet, etc.)</li>
              <li>2. Send USDC to the deposit contract address</li>
              <li>3. Your deposit will appear here automatically within seconds</li>
            </ol>
          </div>
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
