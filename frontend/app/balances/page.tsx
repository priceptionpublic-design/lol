'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  Wallet, 
  TrendingUp, 
  Gift, 
  Vault, 
  ArrowLeftRight, 
  Copy, 
  Share2, 
  Users, 
  CheckCircle2, 
  AlertCircle,
  ChevronRight,
  RefreshCw,
  DollarSign,
  Activity,
  Award,
  Zap
} from 'lucide-react';
import { getUserBalances, transferBalance, getReferralStats, claimReferral, getInvestments, UserBalances, ReferralStats } from '@/lib/balances';

export default function BalancesPage() {
  const router = useRouter();
  const [balances, setBalances] = useState<UserBalances | null>(null);
  const [referralData, setReferralData] = useState<ReferralStats | null>(null);
  const [investmentsData, setInvestmentsData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Transfer state
  const [transferAmount, setTransferAmount] = useState('');
  const [transferFrom, setTransferFrom] = useState<'vault' | 'investment'>('vault');
  const [isTransferring, setIsTransferring] = useState(false);

  useEffect(() => {
    loadAllData();
    const interval = setInterval(loadAllData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const loadAllData = async () => {
    try {
      const [balRes, refRes, invRes] = await Promise.all([
        getUserBalances(),
        getReferralStats(),
        getInvestments()
      ]);
      setBalances(balRes);
      setReferralData(refRes);
      setInvestmentsData(invRes);
    } catch (err: any) {
      console.error('Error loading data:', err);
      if (err.response?.status === 401) router.push('/login');
      setError('Failed to load balance and referral data.');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadAllData();
    setIsRefreshing(false);
  };

  // Earning Calculations
  const dailyInterest = useMemo(() => {
    if (!investmentsData?.investments) return 0;
    return investmentsData.investments.reduce((sum: number, inv: any) => {
      if (inv.isActive) {
        const apy = inv.pool.apyValue || 0;
        return sum + (inv.stakedAmount * (apy / 100)) / 365;
      }
      return sum;
    }, 0);
  }, [investmentsData]);

  const dailyReferralEarnings = useMemo(() => {
    if (!referralData?.stats) return 0;
    return (referralData.stats.totalCommissions || 0) / 30; // 30-day estimate
  }, [referralData]);

  const totalDailyIncome = dailyInterest + dailyReferralEarnings;

  const handleCopyCode = () => {
    if (referralData?.referralCode) {
      navigator.clipboard.writeText(referralData.referralCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleTransfer = async () => {
    if (!transferAmount || parseFloat(transferAmount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    const amount = parseFloat(transferAmount);
    const fromBalance = transferFrom === 'vault' ? balances?.vault : balances?.invested;

    if (amount > (fromBalance || 0)) {
      setError(`Insufficient ${transferFrom} balance.`);
      return;
    }

    try {
      setIsTransferring(true);
      setError(null);
      await transferBalance(
        transferFrom,
        transferFrom === 'vault' ? 'investment' : 'vault',
        amount
      );
      setSuccess(`Successfully transferred $${amount.toFixed(2)} to ${transferFrom === 'vault' ? 'investment' : 'vault'}.`);
      setTransferAmount('');
      await loadAllData();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Transfer failed');
    } finally {
      setIsTransferring(false);
    }
  };

  const handleClaimReferral = async () => {
    if ((balances?.referral || 0) < 100) {
      setError(`Minimum claim amount is $100.00. You need $${(100 - (balances?.referral || 0)).toFixed(2)} more.`);
      return;
    }

    try {
      setLoading(true);
      await claimReferral();
      setSuccess('Referral earnings claimed successfully! Funds added to your vault.');
      await loadAllData();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Claim failed');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !balances) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
          <p className="text-blue-400 font-medium">Synchronizing financial data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 selection:bg-blue-500/30">
      {/* Background decoration */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] bg-blue-600/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-purple-600/5 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-10">
          <button onClick={() => router.back()} className="group flex items-center gap-2 text-slate-400 hover:text-white transition-all">
            <div className="p-2 rounded-full bg-slate-900 border border-slate-800 group-hover:border-slate-700">
              <ArrowLeft size={18} />
            </div>
            <span className="font-medium">Back to Dashboard</span>
          </button>
          <div className="flex items-center gap-3">
            <span className="hidden md:inline text-xs font-bold text-slate-500 uppercase tracking-widest">Auto-refresh active</span>
            <button 
              onClick={handleRefresh} 
              disabled={isRefreshing} 
              className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-all active:scale-95 disabled:opacity-50"
            >
              <RefreshCw size={20} className={isRefreshing ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* Alerts */}
        {(error || success) && (
          <div className="mb-8 animate-in fade-in slide-in-from-top-4 duration-300">
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 flex items-start gap-3 text-red-400 text-sm shadow-lg shadow-red-900/10">
                <AlertCircle size={18} className="shrink-0 mt-0.5" />
                <p className="font-medium">{error}</p>
              </div>
            )}
            {success && (
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-4 flex items-start gap-3 text-emerald-400 text-sm shadow-lg shadow-emerald-900/10">
                <CheckCircle2 size={18} className="shrink-0 mt-0.5" />
                <p className="font-medium">{success}</p>
              </div>
            )}
          </div>
        )}

        <div className="grid lg:grid-cols-12 gap-8">
          {/* Main Column */}
          <div className="lg:col-span-8 space-y-8">
            
            {/* Top Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition-colors">
                <Activity size={20} className="text-blue-400 mb-3" />
                <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Active Pools</p>
                <p className="text-2xl font-bold">{investmentsData?.investments?.filter((i:any) => i.isActive).length || 0}</p>
              </div>
              <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition-colors">
                <TrendingUp size={20} className="text-emerald-400 mb-3" />
                <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Daily Interest</p>
                <p className="text-2xl font-bold text-emerald-400">+${dailyInterest.toFixed(2)}</p>
              </div>
              <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition-colors col-span-2 md:col-span-1">
                <Award size={20} className="text-purple-400 mb-3" />
                <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Total Earned</p>
                <p className="text-2xl font-bold">${(investmentsData?.summary?.totalEarnings || 0).toFixed(2)}</p>
              </div>
            </div>

            {/* Premium Balance Card */}
            <div className="relative group p-10 rounded-[32px] bg-linear-to-br from-slate-900 via-slate-900 to-blue-950 overflow-hidden border border-slate-800 shadow-2xl">
              <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 rounded-full blur-[100px] -mr-48 -mt-48 transition-all group-hover:bg-blue-600/20"></div>
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-600/5 rounded-full blur-[80px] -ml-32 -mb-32"></div>
              
              <div className="relative z-10">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div>
                    <div className="flex items-center gap-2.5 text-blue-400 mb-3">
                      <div className="p-1.5 rounded-lg bg-blue-500/10">
                        <Wallet size={16} />
                      </div>
                      <span className="text-xs font-bold uppercase tracking-[0.2em]">Live Portfolio Value</span>
                    </div>
                    <div className="text-6xl font-bold tracking-tighter mb-2">
                      ${balances?.total.toFixed(2)}
                    </div>
                    <p className="text-slate-500 text-sm font-medium">Includes vault and active investments</p>
                  </div>
                  
                  <div className="flex flex-col gap-3">
                    <div className="bg-emerald-500/10 border border-emerald-500/20 backdrop-blur-md rounded-2xl p-4 pr-10">
                      <p className="text-emerald-500/60 text-[10px] font-bold uppercase tracking-widest mb-1">Yielding</p>
                      <p className="text-xl font-bold text-emerald-400">${balances?.invested.toFixed(2)}</p>
                    </div>
                    <div className="bg-blue-500/10 border border-blue-500/20 backdrop-blur-md rounded-2xl p-4 pr-10">
                      <p className="text-blue-500/60 text-[10px] font-bold uppercase tracking-widest mb-1">Available</p>
                      <p className="text-xl font-bold text-blue-400">${balances?.vault.toFixed(2)}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Daily Income Breakdown */}
            <div className="bg-slate-900/40 border border-slate-800 rounded-[28px] p-8">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400">
                    <Zap size={22} />
                  </div>
                  <h2 className="text-xl font-bold">Projected Daily Income</h2>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-emerald-400">+${totalDailyIncome.toFixed(2)}/day</p>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Est. ROI</p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="flex items-center gap-4 p-5 rounded-2xl bg-slate-800/30 border border-slate-800/50 hover:border-slate-700 transition-all">
                  <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400">
                    <TrendingUp size={24} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">${dailyInterest.toFixed(2)}</p>
                    <p className="text-xs text-slate-500">Staking Interest</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 p-5 rounded-2xl bg-slate-800/30 border border-slate-800/50 hover:border-slate-700 transition-all">
                  <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400">
                    <Users size={24} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">${dailyReferralEarnings.toFixed(2)}</p>
                    <p className="text-xs text-slate-500">Referral Comm.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Transfer Utility */}
            <div className="bg-slate-900/40 border border-slate-800 rounded-[28px] p-8 overflow-hidden relative">
              <div className="flex items-center gap-3 mb-8">
                <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400">
                  <ArrowLeftRight size={22} />
                </div>
                <h2 className="text-xl font-bold">Capital Relocation</h2>
              </div>

              <div className="max-w-md mx-auto space-y-6">
                <div className="flex items-center gap-2 bg-slate-950 p-1.5 rounded-[20px] border border-slate-800">
                  <button 
                    onClick={() => setTransferFrom('vault')}
                    className={`flex-1 py-3.5 px-4 rounded-[14px] text-xs font-bold uppercase tracking-widest transition-all ${transferFrom === 'vault' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'text-slate-500 hover:text-slate-300'}`}
                  >
                    Vault → Invest
                  </button>
                  <button 
                    onClick={() => setTransferFrom('investment')}
                    className={`flex-1 py-3.5 px-4 rounded-[14px] text-xs font-bold uppercase tracking-widest transition-all ${transferFrom === 'investment' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'text-slate-500 hover:text-slate-300'}`}
                  >
                    Invest → Vault
                  </button>
                </div>

                <div className="relative group">
                  <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-600 text-xl font-bold">$</span>
                  <input
                    type="number"
                    value={transferAmount}
                    onChange={(e) => setTransferAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-5 pl-10 text-white text-lg font-bold placeholder-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all"
                  />
                  <button 
                    onClick={() => setTransferAmount(String(transferFrom === 'vault' ? balances?.vault : balances?.invested))}
                    className="absolute right-5 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-lg bg-blue-500/10 text-[10px] font-black text-blue-400 hover:bg-blue-500 hover:text-white transition-all uppercase tracking-tighter"
                  >
                    Max
                  </button>
                </div>

                <button
                  onClick={handleTransfer}
                  disabled={isTransferring || !transferAmount || parseFloat(transferAmount) <= 0}
                  className="w-full bg-slate-100 hover:bg-white text-slate-950 font-black text-sm uppercase tracking-[0.2em] py-5 rounded-2xl transition-all active:scale-[0.98] disabled:opacity-20 disabled:cursor-not-allowed shadow-xl shadow-white/5"
                >
                  {isTransferring ? (
                    <div className="flex items-center justify-center gap-3">
                      <RefreshCw className="animate-spin" size={18} />
                      <span>Processing...</span>
                    </div>
                  ) : (
                    'Relocate Funds'
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="lg:col-span-4 space-y-8">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-3">
              <Gift size={22} className="text-purple-400" />
              Rewards Hub
            </h2>

            {/* Referral Earnings Card */}
            <div className="bg-slate-900/40 border border-slate-800 rounded-[28px] p-8 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-purple-600 to-indigo-600"></div>
              
              <div className="space-y-8">
                <div>
                  <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] mb-3">Reward Balance</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-black text-white">${balances?.referral.toFixed(2)}</span>
                    <span className="text-slate-500 font-bold text-xs">USDC</span>
                  </div>
                </div>

                {/* Progress Circle Visual */}
                <div className="space-y-3">
                  <div className="flex justify-between items-end">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Payout Threshold</span>
                    <span className="text-xs font-bold text-slate-300">$100.00</span>
                  </div>
                  <div className="h-3 bg-slate-950 rounded-full border border-slate-800 overflow-hidden p-0.5">
                    <div 
                      className={`h-full rounded-full transition-all duration-1000 ease-out ${
                        (balances?.referral || 0) >= 100 ? 'bg-linear-to-r from-emerald-500 to-teal-400' : 'bg-linear-to-r from-blue-600 to-indigo-500'
                      }`}
                      style={{ width: `${Math.min(100, ((balances?.referral || 0) / 100) * 100)}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-center font-medium text-slate-500">
                    {(balances?.referral || 0) >= 100 
                      ? 'Threshold reached! ⚡' 
                      : `${Math.min(100, ((balances?.referral || 0) / 100) * 100).toFixed(1)}% completed`}
                  </p>
                </div>

                <button
                  onClick={handleClaimReferral}
                  disabled={(balances?.referral || 0) < 100 || loading}
                  className={`w-full py-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all active:scale-[0.98] ${
                    (balances?.referral || 0) >= 100 
                      ? 'bg-linear-to-r from-emerald-600 to-teal-600 text-white shadow-xl shadow-emerald-900/20 hover:brightness-110' 
                      : 'bg-slate-800 text-slate-600 cursor-not-allowed border border-slate-700'
                  }`}
                >
                  Claim Rewards
                </button>
              </div>
            </div>

            {/* Invite Link Card */}
            <div className="bg-slate-900/40 border border-slate-800 rounded-[28px] p-8">
              <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-500 mb-6">Partnership Program</h3>
              <p className="text-xs text-slate-400 mb-6 leading-loose">
                Earn commissions across <span className="text-white font-bold">7 generations</span> of your network. Your tier increases with network volume.
              </p>
              
              <div className="space-y-4">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Shareable Identifier</p>
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 flex items-center justify-between group hover:border-slate-700 transition-all">
                  <code className="text-xl font-black tracking-[0.3em] text-blue-400">{referralData?.referralCode}</code>
                  <button onClick={handleCopyCode} className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-all active:scale-90">
                    {copied ? <CheckCircle2 size={18} className="text-emerald-400" /> : <Copy size={18} />}
                  </button>
                </div>
              </div>
            </div>

            {/* Levels Breakdown */}
            <div className="bg-slate-900/40 border border-slate-800 rounded-[28px] p-8">
              <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-500 mb-6">Generational Network</h3>
              <div className="space-y-3">
                {referralData?.stats.downlineByLevel.map((level) => (
                  <div key={level.level} className="flex items-center justify-between p-4 bg-slate-950 rounded-2xl border border-slate-800/50">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400 font-black text-[10px]">
                        G{level.level}
                      </div>
                      <p className="text-xs font-bold text-white">{level.count} Units</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-black text-emerald-400">${level.total_investments.toFixed(0)}</p>
                    </div>
                  </div>
                ))}
                {(!referralData?.stats.downlineByLevel || referralData?.stats.downlineByLevel.length === 0) && (
                  <div className="text-center py-10">
                    <Users size={32} className="text-slate-800 mx-auto mb-4" />
                    <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">No connections detected</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
