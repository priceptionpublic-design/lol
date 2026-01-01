export interface User {
  id: string;
  username: string;
  email: string;
  password_hash: string;
  wallet_address: string;
  balance: number;
  role: 'user' | 'admin';
  created_at: string;
  updated_at: string;
}

export interface Pool {
  id: number;
  name: string;
  risk_level: 'low' | 'mid' | 'high';
  min_apy: number;
  max_apy: number;
  created_at: string;
}

export interface DepositRequest {
  id: string;
  user_id: string;
  amount: number;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  updated_at: string;
  approved_by?: string;
}

export interface Investment {
  id: string;
  user_id: string;
  pool_id: number;
  amount: number;
  staked_at: string;
  is_active: boolean;
  created_at: string;
}

