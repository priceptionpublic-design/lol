'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import api from '@/lib/api';
import { ethers } from 'ethers';
import { Eye, EyeOff, ArrowLeft, Wallet, CheckCircle2, AlertCircle } from 'lucide-react';

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

  const loadContractInfo = async () => {
    try {
      const response = await api.get('/deposits/contract-info');
      setContractAddresses(response.data);
    } catch (error) {
      console.error('Failed to load contract info:', error);
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
    if (typeof window.ethereum === 'undefined') {
      setError('Please install MetaMask or another EVM wallet');
      return;
    }

    try {
      setError(null);
      setLoading(true);
      
      const provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await provider.send('eth_requestAccounts', []);
      const address = accounts[0];
      
      // Check if the address is an EOA (Externally Owned Account) and not a contract
      const code = await provider.getCode(address);
      
      if (code !== '0x') {
        setError('Contract addresses are not allowed. Please connect with an EOA (wallet address).');
        setLoading(false);
        return;
      }
      
      // Verify it's a valid address format
      if (!ethers.isAddress(address)) {
        setError('Invalid Ethereum address');
        setLoading(false);
        return;
      }
      
      setWalletAddress(address);
      setIsWalletConnected(true);
      setSignupStep('approval');
      setSuccess('Wallet connected successfully! Address verified as EOA.');
    } catch (error: any) {
      setError(error.message || 'Failed to connect wallet');
    } finally {
      setLoading(false);
    }
  };

  const approveUSDC = async () => {
    if (!contractAddresses) {
      setError('Contract information not loaded');
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

      // Approve 10,000 USDC (with 6 decimals)
      const approvalAmount = ethers.parseUnits('10000', 6);
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
              onClick={() => { setIsLogin(true); setError(null); }}
              className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isLogin 
                  ? 'bg-blue-600 text-white shadow-lg' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Login
            </button>
            <button
              onClick={() => { setIsLogin(false); setError(null); }}
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
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}
          {success && (
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 mb-6">
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
                className="w-full bg-blue-600 hover:bg-blue-500 rounded-xl p-4 font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-6"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Logging in...
                  </span>
                ) : 'Login'}
              </button>
            </form>
          ) : (
            /* Register Form - Multi-step */
            <div className="space-y-6">
              {/* Step Indicator */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    signupStep === 'form' ? 'bg-blue-600 text-white' : 'bg-green-600 text-white'
                  }`}>
                    {signupStep === 'form' ? '1' : '✓'}
                  </div>
                  <span className="text-sm font-medium">Account Info</span>
                </div>
                <div className="flex-1 h-1 mx-2 bg-slate-700 rounded">
                  <div className={`h-full rounded transition-all ${
                    signupStep !== 'form' ? 'bg-blue-600 w-full' : 'w-0'
                  }`}></div>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    signupStep === 'wallet' ? 'bg-blue-600 text-white' : 
                    signupStep === 'approval' ? 'bg-green-600 text-white' : 
                    'bg-slate-700 text-slate-400'
                  }`}>
                    {signupStep === 'approval' ? '✓' : '2'}
                  </div>
                  <span className="text-sm font-medium">Connect Wallet</span>
                </div>
                <div className="flex-1 h-1 mx-2 bg-slate-700 rounded">
                  <div className={`h-full rounded transition-all ${
                    signupStep === 'approval' ? 'bg-blue-600 w-full' : 'w-0'
                  }`}></div>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    signupStep === 'approval' && isApproved ? 'bg-green-600 text-white' :
                    signupStep === 'approval' ? 'bg-blue-600 text-white' : 
                    'bg-slate-700 text-slate-400'
                  }`}>
                    {isApproved ? '✓' : '3'}
                  </div>
                  <span className="text-sm font-medium">Approve USDC</span>
                </div>
              </div>

              {/* Step 1: Account Information Form */}
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
                    className="w-full bg-blue-600 hover:bg-blue-500 rounded-xl p-4 font-semibold transition-all mt-6"
                  >
                    Continue to Wallet Connection
                  </button>
                </form>
              )}

              {/* Step 2: Connect Wallet */}
              {signupStep === 'wallet' && (
                <div className="space-y-6">
                  <div className="text-center">
                    <Wallet size={64} className="mx-auto mb-4 text-blue-400" />
                    <h3 className="text-xl font-bold mb-2">Connect Your Wallet</h3>
                    <p className="text-slate-400 text-sm mb-2">
                      Connect your EVM wallet (MetaMask, Coinbase Wallet, etc.) to continue
                    </p>
                    <p className="text-xs text-slate-500">
                      Only EOA (Externally Owned Accounts) are supported. Contract addresses will be rejected.
                    </p>
                  </div>

                  {!isWalletConnected ? (
                    <button
                      onClick={connectWallet}
                      disabled={loading}
                      className="w-full bg-blue-600 hover:bg-blue-500 rounded-xl p-4 font-semibold transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {loading ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
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
                      <div className="flex-1">
                        <p className="text-sm font-medium text-green-400">Wallet Connected & Verified</p>
                        <p className="text-xs font-mono text-slate-400 mt-1">{walletAddress}</p>
                        <p className="text-xs text-green-400/70 mt-1">✓ Verified as EOA</p>
                      </div>
                    </div>
                  )}

                  <button
                    onClick={() => setSignupStep('form')}
                    disabled={loading}
                    className="w-full bg-slate-700 hover:bg-slate-600 rounded-xl p-3 font-medium transition-all text-sm disabled:opacity-50"
                  >
                    Back
                  </button>
                </div>
              )}

              {/* Step 3: Approve USDC */}
              {signupStep === 'approval' && (
                <div className="space-y-6">
                  <div className="text-center">
                    <CheckCircle2 size={64} className="mx-auto mb-4 text-blue-400" />
                    <h3 className="text-xl font-bold mb-2">Approve USDC Spending</h3>
                    <p className="text-slate-400 text-sm mb-2">
                      Approve 10,000 USDC spending to enable seamless deposits
                    </p>
                    <p className="text-xs text-slate-500">
                      This is a one-time approval. You can skip this and approve later.
                    </p>
                  </div>

                  {!isApproved ? (
                    <div className="space-y-3">
                      <button
                        onClick={approveUSDC}
                        disabled={isApproving || loading}
                        className="w-full bg-blue-600 hover:bg-blue-500 rounded-xl p-4 font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isApproving ? (
                          <span className="flex items-center justify-center gap-2">
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            Approving USDC...
                          </span>
                        ) : 'Approve 10,000 USDC'}
                      </button>

                      <button
                        onClick={skipApprovalAndRegister}
                        disabled={loading}
                        className="w-full bg-slate-700 hover:bg-slate-600 rounded-xl p-3 font-medium transition-all text-sm"
                      >
                        {loading ? 'Creating account...' : 'Skip & Complete Registration'}
                      </button>
                    </div>
                  ) : (
                    <div className="bg-green-600/10 border border-green-600/30 rounded-xl p-4 text-center">
                      <CheckCircle2 size={32} className="mx-auto mb-2 text-green-400" />
                      <p className="text-green-400 font-medium">USDC Approved!</p>
                      <p className="text-xs text-slate-400 mt-1">Completing registration...</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Terms */}
          {!isLogin && (
            <p className="text-xs text-slate-500 text-center mt-4">
              By creating an account, you agree to our Terms of Service and Privacy Policy
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
