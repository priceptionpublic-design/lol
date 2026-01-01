'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import api from '@/lib/api';
import { useAccount, useDisconnect, useWalletClient } from 'wagmi';
import { useWeb3Modal } from '@web3modal/wagmi/react';
import { Eye, EyeOff, ArrowLeft, Wallet, CheckCircle2, AlertCircle, Loader2, DollarSign } from 'lucide-react';
import { BrowserProvider, Contract, parseUnits } from 'ethers';

// USDC ABI for approval
const USDC_ABI = [
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function allowance(address owner, address spender) external view returns (uint256)',
  'function balanceOf(address account) external view returns (uint256)'
];

export default function LoginPage() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  
  // Wagmi hooks
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const { open } = useWeb3Modal();
  const { data: walletClient } = useWalletClient();
  
  // Login fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // Register fields
  const [username, setUsername] = useState('');
  const [walletAddress, setWalletAddress] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [referralCode, setReferralCode] = useState('');
  
  // Signup flow state
  const [signupStep, setSignupStep] = useState<'form' | 'wallet' | 'approval'>('form');
  const [isWalletConnected, setIsWalletConnected] = useState(false);
  const [isApproved, setIsApproved] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [contractAddresses, setContractAddresses] = useState<any>(null);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadContractInfo();
  }, []);

  // Auto-detect wallet connection
  useEffect(() => {
    if (isConnected && address && signupStep === 'wallet' && !isWalletConnected) {
      checkEOAAndProceed(address);
    }
  }, [isConnected, address, signupStep]);

  const loadContractInfo = async () => {
    try {
      const response = await api.get('/deposits/contract-info');
      setContractAddresses(response.data);
    } catch (error) {
      console.error('Failed to load contract info:', error);
    }
  };

  const checkEOAAndProceed = async (walletAddr: string) => {
    try {
      setLoading(true);
      setError(null);

      // Check if it's an EOA using eth_getCode
      if (typeof window.ethereum === 'undefined') {
        setError('No Ethereum provider found');
        setLoading(false);
        return;
      }

      const provider = new BrowserProvider(window.ethereum);
      const code = await provider.getCode(walletAddr);
      
      if (code !== '0x') {
        setError('Contract addresses are not allowed. Please connect with an EOA (wallet address).');
        disconnect();
        setIsWalletConnected(false);
        setWalletAddress('');
        setLoading(false);
        return;
      }
      
      setWalletAddress(walletAddr);
      setIsWalletConnected(true);
      setSuccess('Wallet connected successfully! Address verified as EOA.');
      setSignupStep('approval');
    } catch (error: any) {
      setError(error.message || 'Failed to verify wallet');
      disconnect();
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await api.post('/auth/login', { email, password });
      localStorage.setItem('token', response.data.token);
      router.push('/');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterStep1 = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    // Move to wallet connection step
    setSignupStep('wallet');
  };

  const connectWallet = async () => {
    try {
      setError(null);
      await open();
    } catch (error: any) {
      setError(error.message || 'Failed to open wallet modal');
    }
  };

  const approveUSDC = async () => {
    if (!contractAddresses) {
      setError('Contract information not loaded');
      return;
    }

    if (!walletClient || typeof window.ethereum === 'undefined') {
      setError('Wallet not connected');
      return;
    }

    try {
      setIsApproving(true);
      setError(null);

      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const usdcContract = new Contract(
        contractAddresses.usdcTokenAddress,
        USDC_ABI,
        signer
      );

      // Approve 10,000 USDC (with 6 decimals)
      const approvalAmount = parseUnits('10000', 6);
      const tx = await usdcContract.approve(contractAddresses.depositContractAddress, approvalAmount);
      
      await tx.wait();
      setIsApproved(true);
      setSuccess('USDC approval successful! Completing registration...');
      
      // Now complete registration
      await completeRegistration();
    } catch (error: any) {
      setError(error.message || 'Approval failed. You can skip this and approve later.');
    } finally {
      setIsApproving(false);
    }
  };

  const completeRegistration = async () => {
    if (!walletAddress.startsWith('0x') || walletAddress.length !== 42) {
      setError('Invalid wallet address');
      return;
    }

    try {
      setLoading(true);
      const response = await api.post('/auth/register', { 
        username,
        email, 
        password,
        walletAddress,
        referralCode: referralCode || undefined
      });
      localStorage.setItem('token', response.data.token);
      setSuccess('Account created successfully! Redirecting...');
      setTimeout(() => router.push('/'), 2000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const skipApprovalAndRegister = async () => {
    await completeRegistration();
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[120px]" />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Back to Home */}
        <Link href="/landing" className="flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>

        <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl">
          {/* Logo & Title */}
          <div className="flex flex-col items-center mb-6">
            <Image 
              src="/logo.jpeg" 
              alt="Yieldium Logo" 
              width={64} 
              height={64}
              className="w-14 h-14 sm:w-16 sm:h-16 mb-4 rounded-xl"
            />
            <h1 className="text-2xl sm:text-3xl font-bold mb-2 text-center">
              {isLogin ? 'Welcome Back' : 'Create Account'}
            </h1>
            <p className="text-slate-400 text-center text-sm sm:text-base">
              {isLogin ? 'Sign in to your account' : 'Join Yieldium and start earning'}
            </p>
          </div>

          {/* Toggle Buttons */}
          <div className="flex bg-slate-800/50 rounded-xl p-1 mb-6">
            <button
              onClick={() => { 
                setIsLogin(true); 
                setError(null); 
                setSignupStep('form');
                if (isConnected) disconnect();
              }}
              className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isLogin 
                  ? 'bg-blue-600 text-white shadow-lg' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Login
            </button>
            <button
              onClick={() => { 
                setIsLogin(false); 
                setError(null); 
                setSignupStep('form');
              }}
              className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${
                !isLogin 
                  ? 'bg-blue-600 text-white shadow-lg' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Sign Up
            </button>
          </div>

          {/* Error/Success Messages */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}
          {success && (
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 mb-6 flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <p className="text-emerald-400 text-sm">{success}</p>
            </div>
          )}

          {/* Login Form */}
          {isLogin ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-slate-300">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full bg-slate-800/50 border border-slate-700 rounded-xl p-3.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="your@email.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-slate-300">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full bg-slate-800/50 border border-slate-700 rounded-xl p-3.5 pr-12 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-500 rounded-xl p-4 font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-6 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Logging in...
                  </>
                ) : 'Login'}
              </button>
            </form>
          ) : (
            /* Register Form (Multi-step) */
            <div className="space-y-6">
              {/* Step Indicator */}
              <div className="flex justify-between items-center text-xs font-medium mb-4">
                <div className={`flex-1 text-center ${signupStep === 'form' ? 'text-blue-400' : 'text-green-400'}`}>
                  1. Account
                </div>
                <div className={`flex-1 text-center ${signupStep === 'wallet' ? 'text-blue-400' : isWalletConnected ? 'text-green-400' : 'text-slate-500'}`}>
                  2. Wallet
                </div>
                <div className={`flex-1 text-center ${signupStep === 'approval' ? 'text-blue-400' : isApproved ? 'text-green-400' : 'text-slate-500'}`}>
                  3. Approval
                </div>
              </div>

              {/* Step 1: Account Information */}
              {signupStep === 'form' && (
                <form onSubmit={handleRegisterStep1} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2 text-slate-300">Username</label>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                      className="w-full bg-slate-800/50 border border-slate-700 rounded-xl p-3.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      placeholder="johndoe"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2 text-slate-300">Email</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="w-full bg-slate-800/50 border border-slate-700 rounded-xl p-3.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      placeholder="your@email.com"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2 text-slate-300">Password</label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={6}
                        className="w-full bg-slate-800/50 border border-slate-700 rounded-xl p-3.5 pr-12 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        placeholder="Min 6 characters"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2 text-slate-300">Confirm Password</label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      className="w-full bg-slate-800/50 border border-slate-700 rounded-xl p-3.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      placeholder="••••••••"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2 text-slate-300">
                      Referral Code <span className="text-slate-500">(optional)</span>
                    </label>
                    <input
                      type="text"
                      value={referralCode}
                      onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                      className="w-full bg-slate-800/50 border border-slate-700 rounded-xl p-3.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all uppercase"
                      placeholder="ABCD1234"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-blue-600 hover:bg-blue-500 rounded-xl p-4 font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-6"
                  >
                    {loading ? 'Processing...' : 'Continue to Wallet Connection'}
                  </button>
                </form>
              )}

              {/* Step 2: Connect Wallet */}
              {signupStep === 'wallet' && (
                <div className="space-y-6 text-center">
                  <Wallet className="w-20 h-20 text-blue-400 mx-auto" />
                  <h2 className="text-xl font-bold">Connect Your Wallet</h2>
                  <p className="text-slate-400 text-sm mb-2">
                    Connect your EVM-compatible wallet using WalletConnect
                  </p>
                  <p className="text-xs text-slate-500 mb-4">
                    Works with MetaMask, Trust Wallet, Coinbase Wallet, and 300+ wallets
                  </p>
                  <p className="text-xs text-slate-500">
                    Only EOA (Externally Owned Accounts) are supported. Contract addresses will be rejected.
                  </p>

                  {!isWalletConnected ? (
                    <button
                      onClick={connectWallet}
                      disabled={loading}
                      className="w-full bg-blue-600 hover:bg-blue-500 rounded-xl p-4 font-semibold transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Verifying Wallet...
                        </>
                      ) : (
                        <>
                          <Wallet size={20} />
                          Connect Wallet
                        </>
                      )}
                    </button>
                  ) : (
                    <div className="bg-green-600/10 border border-green-600/30 rounded-xl p-4 flex items-center gap-3">
                      <CheckCircle2 size={24} className="text-green-400 shrink-0" />
                      <div className="flex-1 text-left">
                        <p className="text-sm font-medium text-green-400">Wallet Connected & Verified</p>
                        <p className="text-xs font-mono text-slate-400 mt-1 break-all">{walletAddress}</p>
                        <p className="text-xs text-green-400/70 mt-1">✓ Verified as EOA</p>
                      </div>
                    </div>
                  )}

                  <button
                    onClick={() => {
                      setSignupStep('form');
                      if (isConnected) disconnect();
                      setIsWalletConnected(false);
                    }}
                    disabled={loading}
                    className="w-full bg-slate-700 hover:bg-slate-600 rounded-xl p-3 font-medium transition-all text-sm disabled:opacity-50"
                  >
                    Back
                  </button>
                </div>
              )}

              {/* Step 3: Approve USDC */}
              {signupStep === 'approval' && (
                <div className="space-y-6 text-center">
                  <DollarSign className="w-20 h-20 text-green-400 mx-auto" />
                  <h2 className="text-xl font-bold">Approve USDC Spending</h2>
                  <p className="text-slate-400 text-sm">
                    To enable seamless deposits, approve the contract to spend up to{' '}
                    <span className="font-bold text-white">10,000 USDC</span>
                  </p>

                  <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 text-left text-sm text-slate-300">
                    <p className="mb-2">
                      <span className="font-bold text-white">Contract:</span>{' '}
                      {contractAddresses?.depositContractAddress?.slice(0, 10)}...
                      {contractAddresses?.depositContractAddress?.slice(-8)}
                    </p>
                    <p>
                      <span className="font-bold text-white">Amount:</span> 10,000 USDC
                    </p>
                  </div>

                  <button
                    onClick={approveUSDC}
                    disabled={isApproving || isApproved || loading}
                    className="w-full bg-green-600 hover:bg-green-500 rounded-xl p-4 font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isApproving ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Approving USDC...
                      </>
                    ) : isApproved ? (
                      <>
                        <CheckCircle2 className="w-5 h-5" />
                        USDC Approved!
                      </>
                    ) : (
                      'Approve 10,000 USDC'
                    )}
                  </button>

                  <button
                    onClick={skipApprovalAndRegister}
                    disabled={loading || isApproving}
                    className="w-full text-slate-400 hover:text-white transition-colors py-3 disabled:opacity-50"
                  >
                    {loading ? 'Completing Registration...' : 'Skip & Complete Registration'}
                  </button>

                  <button
                    onClick={() => {
                      setSignupStep('wallet');
                      setIsWalletConnected(false);
                    }}
                    disabled={loading || isApproving}
                    className="w-full bg-slate-700 hover:bg-slate-600 rounded-xl p-3 font-medium transition-all text-sm disabled:opacity-50"
                  >
                    Back
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Switch Login/Signup */}
          {isLogin && (
            <p className="text-xs text-slate-500 text-center mt-6">
              Don't have an account?{' '}
              <button
                onClick={() => { setIsLogin(false); setError(null); }}
                className="text-blue-400 hover:text-blue-300 font-medium"
              >
                Sign up
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
