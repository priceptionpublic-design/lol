'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { 
  Wallet, 
  ArrowDownToLine, 
  ArrowUpFromLine, 
  History, 
  LogOut,
  ChevronRight,
  TrendingUp
} from 'lucide-react';
import api from '@/lib/api';

export default function Home() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState('user'); // Placeholder for role handling

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
          // Assuming API might return a role, otherwise default to user
          if (response.data.role) setUserRole(response.data.role); 
        }
      }
    } catch (error) {
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  // --- Loading Component ---
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center relative overflow-hidden">
        {/* Ambient Background */}
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.1),transparent_50%)]"></div>
        <div className="flex flex-col items-center gap-4 z-10">
          <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
          <p className="text-blue-400 font-medium tracking-wide animate-pulse">Initializing Yieldium...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    router.push('/landing');
    return null;
  }

  // --- Main Render ---
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-blue-500/30">
      
      {/* Background decoration */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[100px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto p-6 md:p-12">
        
        {/* Header Section */}
        <header className="flex flex-col md:flex-row justify-between items-center mb-16 gap-6">
          <div className="text-center md:text-left flex items-center gap-4">
            <Image 
              src="/logo.jpeg" 
              alt="Yieldium Logo" 
              width={56} 
              height={56}
              className="w-14 h-14"
            />
            <div>
              <h1 className="text-4xl md:text-5xl font-bold bg-linear-to-r from-white via-blue-100 to-blue-300 bg-clip-text text-transparent mb-2">
                Yieldium
              </h1>
              <p className="text-slate-400 text-lg">
                Manage your digital assets securely.
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
             <div className="px-4 py-2 rounded-full bg-slate-900/50 border border-slate-800 text-sm text-slate-400 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                Connected
             </div>
          </div>
        </header>

        {/* Action Grid */}
        <div className="grid md:grid-cols-2 gap-6 mb-12">
          
          <DashboardCard 
            href="/deposit"
            icon={<ArrowDownToLine className="w-8 h-8 text-blue-400" />}
            title="Deposit"
            description="Send BNB to the master wallet address instantly."
            gradient="group-hover:from-blue-500/20 group-hover:to-cyan-500/20"
            borderColor="group-hover:border-blue-500/50"
          />

          <DashboardCard 
            href="/withdraw"
            icon={<ArrowUpFromLine className="w-8 h-8 text-purple-400" />}
            title="Withdraw"
            description="Request a payout. Requires 72h confirmation."
            gradient="group-hover:from-purple-500/20 group-hover:to-pink-500/20"
            borderColor="group-hover:border-purple-500/50"
          />

          <DashboardCard 
            href="/invest"
            icon={<TrendingUp className="w-8 h-8 text-green-400" />}
            title="Invest"
            description="Invest in pools and earn passive income with APY returns."
            gradient="group-hover:from-green-500/20 group-hover:to-emerald-500/20"
            borderColor="group-hover:border-green-500/50"
          />

          <DashboardCard 
            href="/transactions"
            icon={<History className="w-8 h-8 text-emerald-400" />}
            title="Transactions"
            description="View your complete deposit and withdrawal history."
            gradient="group-hover:from-emerald-500/20 group-hover:to-teal-500/20"
            borderColor="group-hover:border-emerald-500/50"
          />

        </div>

        {/* Footer / Logout */}
        <div className="flex justify-center mt-12">
          <button
            onClick={() => {
              localStorage.removeItem('token');
              router.push('/login');
            }}
            className="group flex items-center gap-2 px-6 py-3 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/50 transition-all duration-300 border border-transparent hover:border-slate-700"
          >
            <LogOut className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            <span>Sign Out</span>
          </button>
        </div>

      </div>
    </div>
  );
}

// --- Reusable Sub-Component for Cleanliness ---
function DashboardCard({ href, icon, title, description, gradient, borderColor }: any) {
  return (
    <Link
      href={href}
      className={`group relative p-8 rounded-2xl bg-slate-900/40 border border-slate-800 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-black/50 ${borderColor}`}
    >
      {/* Hover Gradient Overlay */}
      <div className={`absolute inset-0 rounded-2xl bg-linear-to-br opacity-0 transition-opacity duration-300 ${gradient}`} />
      
      <div className="relative z-10 flex flex-col h-full">
        <div className="flex justify-between items-start mb-6">
          <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700 group-hover:bg-slate-800 transition-colors">
            {icon}
          </div>
          <ChevronRight className="w-5 h-5 text-slate-600 group-hover:text-white transition-colors" />
        </div>
        
        <h2 className="text-xl font-semibold text-white mb-2 tracking-tight">
          {title}
        </h2>
        <p className="text-slate-400 text-sm leading-relaxed">
          {description}
        </p>
      </div>
    </Link>
  );
}