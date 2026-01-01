-- Migration to add new balance columns to investments table
-- Run this in Supabase SQL Editor

-- Step 1: Add new columns to investments table
ALTER TABLE investments 
ADD COLUMN IF NOT EXISTS initial_amount DECIMAL(20, 8),
ADD COLUMN IF NOT EXISTS current_amount DECIMAL(20, 8),
ADD COLUMN IF NOT EXISTS apy_at_stake DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS last_calculated_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS unstaked_at TIMESTAMPTZ;

-- Step 2: Migrate existing data
-- Set initial_amount and current_amount from existing amount column
UPDATE investments 
SET 
  initial_amount = amount,
  current_amount = amount,
  apy_at_stake = 0.00,
  last_calculated_at = staked_at
WHERE initial_amount IS NULL;

-- Step 3: Make the new columns NOT NULL (after data migration)
ALTER TABLE investments 
ALTER COLUMN initial_amount SET NOT NULL,
ALTER COLUMN current_amount SET NOT NULL,
ALTER COLUMN apy_at_stake SET NOT NULL;

-- Step 4: Add new balance columns to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS vault_balance DECIMAL(20, 8) DEFAULT 0 CHECK (vault_balance >= 0),
ADD COLUMN IF NOT EXISTS invested_balance DECIMAL(20, 8) DEFAULT 0 CHECK (invested_balance >= 0),
ADD COLUMN IF NOT EXISTS referral_balance DECIMAL(20, 8) DEFAULT 0 CHECK (referral_balance >= 0);

-- Step 5: Migrate existing user balances to vault
UPDATE users 
SET vault_balance = COALESCE(balance, 0),
    invested_balance = 0,
    referral_balance = 0
WHERE vault_balance IS NULL OR vault_balance = 0;

-- Step 6: Create balance_transfers table
CREATE TABLE IF NOT EXISTS balance_transfers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  from_balance TEXT NOT NULL CHECK (from_balance IN ('vault', 'investment')),
  to_balance TEXT NOT NULL CHECK (to_balance IN ('vault', 'investment')),
  amount DECIMAL(20, 8) NOT NULL CHECK (amount > 0),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (from_balance != to_balance)
);

CREATE INDEX IF NOT EXISTS idx_balance_transfers_user_id ON balance_transfers(user_id);

-- Step 7: Update referral_commissions status values
-- Update old 'paid' status to 'claimed' if it exists
UPDATE referral_commissions 
SET status = 'claimed' 
WHERE status = 'paid';

-- Step 8: Add claimed_at column to referral_commissions
ALTER TABLE referral_commissions
ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMPTZ;

-- Update claimed_at from paid_at for already claimed commissions
UPDATE referral_commissions
SET claimed_at = paid_at
WHERE status = 'claimed' AND claimed_at IS NULL AND paid_at IS NOT NULL;

-- Step 9: Update deposit_history table to ensure it has all needed columns
ALTER TABLE deposit_history
ADD COLUMN IF NOT EXISTS wallet_address TEXT;

-- Populate wallet_address from users table if missing
UPDATE deposit_history dh
SET wallet_address = u.wallet_address
FROM users u
WHERE dh.user_id = u.id AND dh.wallet_address IS NULL;

COMMIT;

