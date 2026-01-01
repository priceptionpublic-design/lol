-- Supabase Schema for Yieldium
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  wallet_address TEXT NOT NULL,
  
  -- Balance tracking (all in USD)
  vault_balance DECIMAL(20, 8) DEFAULT 0 CHECK (vault_balance >= 0),  -- Safe storage, not earning
  invested_balance DECIMAL(20, 8) DEFAULT 0 CHECK (invested_balance >= 0),  -- Currently invested, earning yield
  referral_balance DECIMAL(20, 8) DEFAULT 0 CHECK (referral_balance >= 0),  -- Earned from referrals
  
  -- Deprecated: kept for backwards compatibility
  balance DECIMAL(20, 8) DEFAULT 0 CHECK (balance >= 0),
  
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  referrer_id UUID REFERENCES users(id) ON DELETE SET NULL,
  referral_code TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pools table
CREATE TABLE IF NOT EXISTS pools (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  risk_level TEXT NOT NULL CHECK (risk_level IN ('low', 'mid', 'high')),
  min_apy DECIMAL(10, 2) NOT NULL CHECK (min_apy >= 0),
  max_apy DECIMAL(10, 2) NOT NULL CHECK (max_apy >= min_apy),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Deposit history table (monitored from contract events)
CREATE TABLE IF NOT EXISTS deposit_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  wallet_address TEXT NOT NULL,
  amount DECIMAL(20, 8) NOT NULL CHECK (amount > 0),
  transaction_hash TEXT NOT NULL,
  block_number BIGINT NOT NULL,
  deposit_index INTEGER NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(transaction_hash, deposit_index)
);

-- Investments table
CREATE TABLE IF NOT EXISTS investments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  pool_id INTEGER NOT NULL REFERENCES pools(id) ON DELETE CASCADE,
  initial_amount DECIMAL(20, 8) NOT NULL CHECK (initial_amount > 0),  -- Original investment
  current_amount DECIMAL(20, 8) NOT NULL CHECK (current_amount > 0),  -- Current value with earnings
  apy_at_stake DECIMAL(10, 2) NOT NULL,  -- APY when staked
  staked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_calculated_at TIMESTAMPTZ DEFAULT NOW(),  -- Last time earnings were calculated
  is_active BOOLEAN DEFAULT TRUE,
  unstaked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Referral commissions table
CREATE TABLE IF NOT EXISTS referral_commissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  referrer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  referred_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  level INTEGER NOT NULL CHECK (level >= 1 AND level <= 7),
  commission_type TEXT NOT NULL CHECK (commission_type IN ('deposit', 'investment')),
  transaction_id UUID NOT NULL,
  amount DECIMAL(20, 8) NOT NULL CHECK (amount > 0),
  commission_percentage DECIMAL(5, 2) NOT NULL,
  commission_amount DECIMAL(20, 8) NOT NULL CHECK (commission_amount > 0),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'claimed', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  claimed_at TIMESTAMPTZ
);

-- Withdrawal requests table
CREATE TABLE IF NOT EXISTS withdrawal_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount DECIMAL(20, 8) NOT NULL CHECK (amount > 0),
  to_address TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'processing', 'completed')),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES users(id),
  completed_at TIMESTAMPTZ,
  transaction_hash TEXT,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Support tickets table
CREATE TABLE IF NOT EXISTS support_tickets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  deposit_history_id UUID REFERENCES deposit_history(id) ON DELETE SET NULL,
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  transaction_hash TEXT,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  admin_notes TEXT,
  resolved_by UUID REFERENCES users(id),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Balance transfers table (vault <-> investment)
CREATE TABLE IF NOT EXISTS balance_transfers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  from_balance TEXT NOT NULL CHECK (from_balance IN ('vault', 'investment')),
  to_balance TEXT NOT NULL CHECK (to_balance IN ('vault', 'investment')),
  amount DECIMAL(20, 8) NOT NULL CHECK (amount > 0),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (from_balance != to_balance)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_wallet_address ON users(wallet_address);
CREATE INDEX IF NOT EXISTS idx_users_referral_code ON users(referral_code);
CREATE INDEX IF NOT EXISTS idx_users_referrer_id ON users(referrer_id);

CREATE INDEX IF NOT EXISTS idx_deposit_history_user_id ON deposit_history(user_id);
CREATE INDEX IF NOT EXISTS idx_deposit_history_wallet_address ON deposit_history(wallet_address);
CREATE INDEX IF NOT EXISTS idx_deposit_history_transaction_hash ON deposit_history(transaction_hash);
CREATE INDEX IF NOT EXISTS idx_deposit_history_block_number ON deposit_history(block_number);

CREATE INDEX IF NOT EXISTS idx_investments_user_id ON investments(user_id);
CREATE INDEX IF NOT EXISTS idx_investments_pool_id ON investments(pool_id);
CREATE INDEX IF NOT EXISTS idx_investments_is_active ON investments(is_active);

CREATE INDEX IF NOT EXISTS idx_referral_commissions_referrer_id ON referral_commissions(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referral_commissions_status ON referral_commissions(status);

CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_user_id ON withdrawal_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_status ON withdrawal_requests(status);

CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id ON support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);

CREATE INDEX IF NOT EXISTS idx_balance_transfers_user_id ON balance_transfers(user_id);

-- Insert default pools
INSERT INTO pools (name, risk_level, min_apy, max_apy) VALUES
  ('SOL-USDC', 'low', 5.00, 9.00),
  ('mSOL-SOL', 'low', 6.00, 10.00),
  ('JTO-SOL', 'mid', 11.00, 18.00),
  ('BONK-SOL', 'mid', 15.00, 22.00),
  ('WIF-SOL', 'high', 27.00, 35.00),
  ('POPCAT-SOL', 'high', 30.00, 45.00)
ON CONFLICT (name) DO NOTHING;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();


DROP TRIGGER IF EXISTS update_withdrawal_requests_updated_at ON withdrawal_requests;
CREATE TRIGGER update_withdrawal_requests_updated_at
  BEFORE UPDATE ON withdrawal_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_support_tickets_updated_at ON support_tickets;
CREATE TRIGGER update_support_tickets_updated_at
  BEFORE UPDATE ON support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) Policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE deposit_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE investments ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE withdrawal_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;

-- Note: For backend service access, you'll use the service_role key which bypasses RLS
-- These policies are for direct client access if needed in future

