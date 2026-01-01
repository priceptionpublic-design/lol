# Balance Management System - Implementation Guide

## Overview
Complete balance tracking system with vault, investment, and referral management.

## Features Implemented

### 1. Three Separate Balance Types
- **Vault Balance**: Money stored safely, doesn't earn yield, can withdraw or transfer to investment
- **Invested Balance**: Money currently invested in pools, earns APY automatically
- **Referral Balance**: Commission earned from referrals, claimable at $100 minimum

### 2. Database Schema Updates (`backend/supabase-schema.sql`)

#### Updated `users` table:
```sql
vault_balance DECIMAL(20, 8) DEFAULT 0       -- Safe storage
invested_balance DECIMAL(20, 8) DEFAULT 0    -- Currently invested
referral_balance DECIMAL(20, 8) DEFAULT 0    -- Referral earnings
```

#### Updated `investments` table:
```sql
initial_amount DECIMAL(20, 8)    -- Original investment
current_amount DECIMAL(20, 8)    -- Current value with earnings
apy_at_stake DECIMAL(10, 2)      -- APY when staked
last_calculated_at TIMESTAMPTZ   -- Last earnings calculation
```

#### New `balance_transfers` table:
```sql
user_id UUID
from_balance TEXT ('vault' | 'investment')
to_balance TEXT ('vault' | 'investment')
amount DECIMAL(20, 8)
created_at TIMESTAMPTZ
```

### 3. Backend Services

#### Deposit Monitor (`backend/src/services/depositMonitor.ts`)
- **Updated**: Now credits `vault_balance` when deposit is detected on-chain
- Automatically adds deposited USDC to user's vault

#### Investment Growth Calculator (`backend/src/services/investmentGrowth.ts`)
- **New Service**: Calculates investment earnings every 60 seconds
- Formula: `new_amount = current_amount * (1 + (APY / 100 / 365 / 24 * hours_elapsed))`
- Updates both `investments.current_amount` and `users.invested_balance`
- Shows real-time compounding growth

### 4. Backend API Endpoints (`backend/src/routes/balances.ts`)

#### GET `/balances/me`
Returns current balances:
```json
{
  "vault": 1250.50,
  "invested": 3000.00,
  "referral": 75.25,
  "total": 4325.75
}
```

#### POST `/balances/transfer`
Transfer between vault and investment:
```json
{
  "from": "vault",
  "to": "investment",
  "amount": 500
}
```

#### POST `/balances/claim-referral`
Claim referral earnings (minimum $100):
```json
{
  "claimed": 125.50,
  "newVaultBalance": 1376.00,
  "newReferralBalance": 0
}
```

#### GET `/balances/transfers`
Get transfer history (last 50 transfers)

### 5. Mobile App Updates

#### New Hooks (`mobile-app/hooks/useBalances.ts`)
- `useBalances()` - Get current balances (refreshes every 5 seconds)
- `useTransferBalance()` - Transfer money between vault/investment
- `useClaimReferral()` - Claim referral earnings
- `useBalanceTransfers()` - Get transfer history

#### New Components

**TransferModal** (`mobile-app/components/transfer-modal.tsx`)
- Transfer money between vault and investment
- Visual direction indicator with swap button
- Shows available balance
- Informative messages about yield earning

#### Updated Types (`mobile-app/types/api.ts`)
```typescript
interface User {
  balance: number;            // Total (vault + invested)
  vaultBalance?: number;      // Vault only
  investedBalance?: number;   // Investment only
  referralBalance?: number;   // Referral only
}

interface BalanceResponse {
  vault: number;
  invested: number;
  referral: number;
  total: number;
}
```

## How It Works

### Deposit Flow
1. User deposits USDC to smart contract
2. Deposit monitor detects transaction
3. **Credits `vault_balance`** automatically
4. User sees money in vault (safe storage)

### Investment Flow
1. User transfers money from **vault → investment**
2. Money moves to `invested_balance`
3. **Investment growth calculator runs every minute**
4. **Balance grows automatically** based on pool APY
5. User sees increasing balance in real-time (refreshes every 5 seconds)

### Referral Flow
1. Referral commission earned → added to `referral_balance`
2. Shows as "pending" until reaches $100
3. User clicks "Claim" when ≥ $100
4. **Transferred to vault_balance**
5. Can then be invested or withdrawn

### Transfer Flow
```
┌──────────┐  Transfer   ┌──────────────┐
│  Vault   │ ──────────> │  Investment  │
│ (safe)   │             │  (earning)   │
└──────────┘ <────────── └──────────────┘
              Transfer
```

## Setup Instructions

### 1. Run Database Migration
```sql
-- In Supabase SQL Editor, run:
/Users/trymbakmahant/Projects/ShanProjectClone/new start app/backend/supabase-schema.sql
```

### 2. Migrate Existing Data (if needed)
```sql
-- Move existing balance to vault_balance
UPDATE users 
SET vault_balance = balance,
    invested_balance = 0,
    referral_balance = 0
WHERE vault_balance IS NULL;
```

### 3. Start Backend
```bash
cd backend
bun run dev
```

You should see:
```
[DEPOSIT MONITOR] ✅ Started - monitoring contract events
[INVESTMENT GROWTH] ✅ Started - calculating investment earnings
Server running on port 8080
```

### 4. Mobile App
```bash
cd mobile-app
yarn start
```

## User Experience

### Home Screen
- Shows **total balance** (vault + invested, excluding unclaimed referral)
- Balance updates every 5 seconds to show investment growth

### Profile Screen
- **Total Balance**: Vault + Invested
- **Transfer Button**: Move money between vault/investment
- **Claim Referral**: Available when referral ≥ $100

### Balance Breakdown (visible in balance modal or profile)
- 🔒 **Vault**: $1,250.50 (safe, no yield)
- 💰 **Invested**: $3,000.00 (+2.5% today) 📈
- 🎁 **Referral**: $75.25 (need $24.75 more to claim)

## Key Points

✅ **Deposits go to vault** - Safe storage, user decides when to invest
✅ **Only invested money grows** - Vault stays same, investment compounds
✅ **Referral separate** - Must claim at $100, then goes to vault
✅ **Real-time growth** - Investment balance updates every 5 seconds
✅ **Easy transfers** - One-click transfer between vault/investment
✅ **No fees** - Internal transfers are instant and free

## API Testing

```bash
# Get balances
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:8080/balances/me

# Transfer $500 from vault to investment
curl -X POST -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"from":"vault","to":"investment","amount":500}' \
  http://localhost:8080/balances/transfer

# Claim referral (if ≥ $100)
curl -X POST -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:8080/balances/claim-referral
```

## Growth Calculation Example

**Investment**: $1,000 at 42.8% APY

**After 1 hour**:
- Hourly rate = 42.8% / 365 / 24 = 0.004885%
- New amount = $1,000 * (1 + 0.00004885) = $1,000.049
- Earned = $0.049

**After 24 hours**:
- Daily compound = $1,000 * (1.00004885)^24 = $1,001.17
- Earned = $1.17

**After 30 days**:
- Monthly compound = $1,000 * (1.00004885)^720 = $1,035.91
- Earned = $35.91

## Next Steps

1. **Update Profile UI** - Add balance breakdown section
2. **Add Transfer Button** - In profile or dedicated tab
3. **Show Growth Indicator** - Green arrow showing +% for invested balance
4. **Referral Claim Button** - Show when balance ≥ $100
5. **History View** - Show transfer history

## Files Changed/Created

### Backend
- ✅ `backend/supabase-schema.sql` - Updated schema
- ✅ `backend/src/services/depositMonitor.ts` - Credits vault
- ✅ `backend/src/services/investmentGrowth.ts` - New service
- ✅ `backend/src/routes/balances.ts` - New routes
- ✅ `backend/src/routes/auth.ts` - Return new balance fields
- ✅ `backend/src/app.ts` - Add balances routes
- ✅ `backend/src/index.ts` - Start growth calculator

### Mobile App
- ✅ `mobile-app/types/api.ts` - New types
- ✅ `mobile-app/hooks/useBalances.ts` - New hooks
- ✅ `mobile-app/components/transfer-modal.tsx` - New component
- ⏳ `mobile-app/app/(tabs)/profile.tsx` - Add UI (next step)
- ⏳ `mobile-app/app/(tabs)/index.tsx` - Update (next step)

**System is ready! Just need to update the mobile UI to display everything.**

