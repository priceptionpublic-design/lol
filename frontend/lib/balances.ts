import api from './api';

export interface UserBalances {
  vault: number;
  invested: number;
  referral: number;
  total: number;
}

export interface ReferralStats {
  referralCode: string;
  stats: {
    directReferrals: number;
    totalEarned: number;
    pendingEarned: number;
    totalCommissions: number;
    downlineByLevel: {
      level: number;
      count: number;
      total_deposits: number;
      total_investments: number;
    }[];
  };
}

export async function getUserBalances(): Promise<UserBalances> {
  const response = await api.get('/balances/me');
  return response.data;
}

export async function transferBalance(
  from: 'vault' | 'investment',
  to: 'vault' | 'investment',
  amount: number
) {
  const response = await api.post('/balances/transfer', { from, to, amount });
  return response.data;
}

export async function getReferralStats(): Promise<ReferralStats> {
  const response = await api.get('/referrals/stats');
  return response.data;
}

export async function claimReferral() {
  const response = await api.post('/balances/claim-referral');
  return response.data;
}

export async function getInvestments() {
  const response = await api.get('/investments');
  return response.data;
}

