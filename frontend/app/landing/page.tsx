'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  TrendingUp, 
  Zap, 
  Users, 
  ArrowRight, 
  ChevronRight,
  Lock,
  Wallet,
  Download,
  Menu,
  X
} from 'lucide-react';
import api from '@/lib/api';
import { APP_DOWNLOAD_URL } from '@/lib/config';

export default function LandingPage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        const response = await api.get('/auth/me');
        if (response.data) {
          setIsAuthenticated(true);
          router.push('/');
          return;
        }
      }
    } catch (error) {
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.1),transparent_50%)]"></div>
        <div className="flex flex-col items-center gap-4 z-10">
          <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-blue-500/30 font-sans overflow-x-hidden">
      
      {/* Background Ambience */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[300px] sm:w-[600px] h-[300px] sm:h-[600px] bg-blue-600/10 rounded-full blur-[120px]" />
        <div className="absolute top-[40%] left-[-20%] w-[300px] sm:w-[600px] h-[300px] sm:h-[600px] bg-purple-600/10 rounded-full blur-[120px]" />
      </div>

      {/* Navbar */}
      <nav className="relative z-20 max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6 flex justify-between items-center">
        <div className="text-lg sm:text-xl font-bold tracking-tight text-white flex items-center gap-2 sm:gap-3">
           <Image 
            src="/logo.jpeg" 
             alt="Yieldium Logo" 
             width={32} 
             height={32}
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg"
           />
           Yieldium
        </div>
        
        {/* Desktop Nav */}
        <div className="hidden sm:flex items-center gap-4">
        <Link href="/login" className="text-sm font-medium text-slate-400 hover:text-white transition-colors">
          Log In
        </Link>
          <Link 
            href="/login" 
            className="text-sm font-semibold bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-lg transition-colors"
          >
            Sign Up
          </Link>
        </div>

        {/* Mobile Menu Button */}
        <button 
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="sm:hidden text-slate-300 p-2"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </nav>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="sm:hidden fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-lg pt-20 px-6">
          <button 
            onClick={() => setMobileMenuOpen(false)}
            className="absolute top-4 right-4 text-slate-300 p-2"
          >
            <X className="w-6 h-6" />
          </button>
          <div className="flex flex-col gap-4">
            <Link 
              href="/login" 
              onClick={() => setMobileMenuOpen(false)}
              className="text-lg font-medium text-slate-300 hover:text-white py-3 border-b border-slate-800"
            >
              Log In
            </Link>
            <Link 
              href="/login" 
              onClick={() => setMobileMenuOpen(false)}
              className="text-lg font-semibold bg-blue-600 hover:bg-blue-500 px-6 py-3 rounded-xl text-center transition-colors"
            >
              Sign Up
            </Link>
            {APP_DOWNLOAD_URL && (
              <Link
                href={APP_DOWNLOAD_URL}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setMobileMenuOpen(false)}
                className="text-lg font-semibold bg-emerald-600 hover:bg-emerald-500 px-6 py-3 rounded-xl text-center transition-colors flex items-center justify-center gap-2"
              >
                <Download className="w-5 h-5" />
                Download App
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Hero Section */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 pt-8 sm:pt-12 pb-16 sm:pb-24 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-medium mb-6 sm:mb-8">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
          </span>
          Yield Farming 2.0 is live
        </div>
        
        <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold mb-4 sm:mb-6 tracking-tight px-2">
          <span className="bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
            Smarter Yields.
          </span>
          <br />
          <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            Secure Future.
          </span>
        </h1>
        
        <p className="text-base sm:text-lg md:text-xl text-slate-400 mb-8 sm:mb-10 max-w-2xl mx-auto leading-relaxed px-4">
          Unlock passive income with our tiered investment pools. Choose your risk appetite and watch your assets grow with institutional-grade security.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center px-4">
          <Link
            href="/login"
            className="group w-full sm:w-auto flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-6 sm:px-8 py-3.5 sm:py-4 rounded-xl font-semibold text-base sm:text-lg transition-all shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40"
          >
            Start Investing
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
          {APP_DOWNLOAD_URL && (
            <Link
              href={APP_DOWNLOAD_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-6 sm:px-8 py-3.5 sm:py-4 rounded-xl font-semibold text-base sm:text-lg transition-all shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40"
            >
              Download App
              <Download className="w-4 h-4" />
            </Link>
          )}
          <Link
            href="/login"
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-slate-800/50 hover:bg-slate-800 text-slate-200 border border-slate-700 hover:border-slate-600 px-6 sm:px-8 py-3.5 sm:py-4 rounded-xl font-semibold text-base sm:text-lg transition-all backdrop-blur-sm"
          >
            Member Login
          </Link>
        </div>
      </div>

      {/* Stats Strip */}
      <div className="border-y border-slate-800 bg-slate-900/30 backdrop-blur-sm relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-8 text-center">
          <div>
            <div className="text-2xl sm:text-3xl font-bold text-white mb-1">$2.4M+</div>
            <div className="text-slate-500 text-xs sm:text-sm">Total Value Locked</div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-bold text-white mb-1">12K+</div>
            <div className="text-slate-500 text-xs sm:text-sm">Active Investors</div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-bold text-white mb-1">~18%</div>
            <div className="text-slate-500 text-xs sm:text-sm">Avg. APY</div>
          </div>
           <div>
            <div className="text-2xl sm:text-3xl font-bold text-white mb-1">24/7</div>
            <div className="text-slate-500 text-xs sm:text-sm">Support</div>
          </div>
        </div>
      </div>

      {/* Investment Pools */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
        <div className="text-center mb-10 sm:mb-16">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-3 sm:mb-4">Investment Pools</h2>
          <p className="text-slate-400 text-sm sm:text-base">Select a strategy that aligns with your financial goals.</p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          <PoolCard 
            icon={<ShieldCheck className="w-8 sm:w-10 h-8 sm:h-10 text-emerald-400" />}
            title="Stable Growth"
            badge="Low Risk"
            badgeColor="bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
            apy="5-9%"
            description="Perfect for beginners looking for consistent, safe returns."
            gradient="from-emerald-500/20 to-teal-500/20"
            border="hover:border-emerald-500/50"
          />

          <PoolCard 
            icon={<TrendingUp className="w-8 sm:w-10 h-8 sm:h-10 text-blue-400" />}
            title="Balanced Yield"
            badge="Mid Risk"
            badgeColor="bg-blue-500/10 text-blue-400 border-blue-500/20"
            apy="11-18%"
            description="A balanced approach maximizing growth while managing exposure."
            gradient="from-blue-500/20 to-indigo-500/20"
            border="hover:border-blue-500/50"
            featured={true}
          />

          <PoolCard 
            icon={<Zap className="w-8 sm:w-10 h-8 sm:h-10 text-purple-400" />}
            title="Aggressive"
            badge="High Risk"
            badgeColor="bg-purple-500/10 text-purple-400 border-purple-500/20"
            apy="27-30%"
            description="High-volatility strategies for maximum potential APY."
            gradient="from-purple-500/20 to-pink-500/20"
            border="hover:border-purple-500/50"
          />
        </div>
      </div>

      {/* Referral System */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 pb-16 sm:pb-24">
        <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700 p-6 sm:p-8 md:p-12 text-center md:text-left">
          {/* Decorative Glow */}
          <div className="absolute top-0 right-0 w-[200px] sm:w-[300px] h-[200px] sm:h-[300px] bg-blue-500/20 blur-[100px] rounded-full pointer-events-none"></div>

          <div className="relative z-10 grid md:grid-cols-2 gap-8 sm:gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 text-blue-400 font-semibold mb-3 sm:mb-4">
                <Users className="w-4 sm:w-5 h-4 sm:h-5" />
                <span className="text-sm sm:text-base">Partner Program</span>
              </div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-4 sm:mb-6">
                7-Layer Referral Ecosystem
              </h2>
              <p className="text-slate-400 text-sm sm:text-lg mb-6 sm:mb-8 leading-relaxed">
                Build your network and earn passive commissions. Our deep-tier system ensures you are rewarded for the growth of your community down to 7 levels.
              </p>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 bg-white text-slate-950 px-6 sm:px-8 py-2.5 sm:py-3 rounded-xl font-bold hover:bg-slate-200 transition-colors text-sm sm:text-base"
              >
                Join Partner Program
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
            
            {/* Visual Representation */}
            <div className="bg-slate-950/50 p-4 sm:p-6 rounded-xl sm:rounded-2xl border border-slate-800 backdrop-blur-sm">
              <div className="space-y-2 sm:space-y-3">
                  <ReferralRow level="1" pct="10%" width="w-full" color="bg-blue-500" />
                  <ReferralRow level="2" pct="5%" width="w-[85%]" color="bg-blue-600" />
                  <ReferralRow level="3" pct="3%" width="w-[70%]" color="bg-blue-700" />
                  <ReferralRow level="4-7" pct="1%" width="w-[55%]" color="bg-blue-800" />
               </div>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 pb-16 sm:pb-24">
        <div className="text-center bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-blue-500/20 rounded-2xl sm:rounded-3xl p-8 sm:p-12">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-4">Ready to Start Earning?</h2>
          <p className="text-slate-400 mb-6 sm:mb-8 max-w-xl mx-auto text-sm sm:text-base">
            Join thousands of investors already growing their wealth with Yieldium.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all"
            >
              Create Free Account
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="relative z-10 border-t border-slate-800 bg-slate-950 py-8 sm:py-12 text-center">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <p className="text-slate-500 text-xs sm:text-sm">
            © {new Date().getFullYear()} Yieldium Finance. All rights reserved. <br/>
            <span className="opacity-50">Investing involves risk. Please do your own research.</span>
          </p>
        </div>
      </footer>
    </div>
  );
}

// --- Sub Components ---

function PoolCard({ icon, title, badge, badgeColor, apy, description, gradient, border, featured = false }: any) {
  return (
    <div className={`group relative p-6 sm:p-8 rounded-2xl sm:rounded-3xl bg-slate-900/40 border backdrop-blur-sm transition-all duration-300 hover:-translate-y-2 ${border} ${featured ? 'border-blue-500/50 shadow-xl shadow-blue-500/10' : 'border-slate-800'}`}>
      {/* Hover Gradient */}
      <div className={`absolute inset-0 rounded-2xl sm:rounded-3xl bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-500 ${gradient}`} />
      
      <div className="relative z-10">
        <div className="flex justify-between items-start mb-4 sm:mb-6">
          <div className="p-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-slate-800/50 border border-slate-700 group-hover:scale-110 transition-transform duration-300">
            {icon}
          </div>
          <span className={`px-2.5 sm:px-3 py-1 rounded-full text-xs font-semibold border ${badgeColor}`}>
            {badge}
          </span>
        </div>
        
        <h3 className="text-xl sm:text-2xl font-bold text-white mb-2">{title}</h3>
        <div className="text-3xl sm:text-4xl font-bold text-white mb-3 sm:mb-4 tracking-tight">
          {apy} <span className="text-base sm:text-lg text-slate-500 font-normal">APY</span>
        </div>
        <p className="text-slate-400 text-xs sm:text-sm mb-4 sm:mb-6 leading-relaxed">
          {description}
        </p>
        
        <Link href="/login" className="w-full block text-center py-2.5 sm:py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-medium transition-colors text-sm sm:text-base">
          View Pool
        </Link>
      </div>
    </div>
  );
}

function ReferralRow({ level, pct, width, color }: any) {
  return (
    <div className="flex items-center gap-3 sm:gap-4">
      <div className="w-12 sm:w-16 text-xs text-slate-400">Level {level}</div>
      <div className="flex-1 h-2.5 sm:h-3 bg-slate-800 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color} ${width}`}></div>
      </div>
      <div className="w-10 sm:w-12 text-right text-xs sm:text-sm font-bold text-white">{pct}</div>
    </div>
  );
}
