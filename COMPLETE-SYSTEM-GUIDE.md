# Complete Balance Management & Admin Withdrawal System

## 🎯 Overview

Complete implementation of:
1. **3 Balance Types**: Vault, Investment, Referral
2. **Investment Growth**: Automatic APY calculation every minute  
3. **Balance Transfers**: Move money between vault/investment
4. **Referral Claims**: Claim at $100 minimum
5. **Admin Withdrawal Approval**: Manual approval with transaction hash

---

## 📊 Database Schema

### Updated Tables

```sql
-- Users table with 3 separate balances
users:
  vault_balance       -- Safe storage, no yield
  invested_balance    -- Currently invested, earning APY
  referral_balance    -- Referral commissions, claimable at $100

-- Investments tracking with growth
investments:
  initial_amount      -- Original investment
  current_amount      -- With compounded earnings
  apy_at_stake        -- APY when staked
  last_calculated_at  -- Last earnings calculation

-- Balance transfers (vault <-> investment)
balance_transfers:
  user_id, from_balance, to_balance, amount

-- Referral commissions
referral_commissions:
  status: 'pending' | 'claimed' | 'cancelled'
  claimed_at

-- Withdrawal requests (admin approval)
withdrawal_requests:
  status: 'pending' | 'approved' | 'rejected'
  transaction_hash (required on approval)
  approved_by, approved_at, rejection_reason
```

---

## 🔄 How It Works

### 1. Deposit Flow
```
User deposits USDC → Smart Contract
       ↓
Deposit Monitor detects event
       ↓
Credits vault_balance automatically
       ↓
User sees money in vault (safe, not earning)
```

### 2. Investment Flow
```
User transfers: Vault → Investment
       ↓
Money moves to invested_balance
       ↓
Growth Calculator runs every 60 seconds
       ↓
Compounds earnings based on pool APY
       ↓
Balance grows automatically
       ↓
Frontend shows growth (refreshes every 5s)
```

### 3. Referral Flow
```
Referral earns commission → referral_balance
       ↓
Shows as "pending" until ≥ $100
       ↓
User clicks "Claim" button
       ↓
Transferred to vault_balance
       ↓
Can then invest or withdraw
```

### 4. Withdrawal Flow (NEW PROCESS)
```
User requests withdrawal from vault
       ↓
Creates withdrawal_requests entry (status: pending)
       ↓
Admin sees in admin panel
       ↓
Admin manually transfers USDC to user's address
       ↓
Admin enters transaction hash
       ↓
Clicks "Approve & Deduct Balance"
       ↓
System deducts from vault_balance
       ↓
Withdrawal marked as approved with tx hash
```

---

## 🔧 Backend Updates

### New Services

#### `depositMonitor.ts`
- Credits `vault_balance` when deposit detected
- Runs every 10 seconds

#### `investmentGrowth.ts` (NEW)
- Calculates earnings every 60 seconds
- Formula: `new_amount = current_amount × (1 + (APY/100/365/24 × hours))`
- Updates `investments.current_amount` and `users.invested_balance`

### New Routes (`/balances/*`)

```typescript
GET  /balances/me              // Get all balances
POST /balances/transfer        // Transfer vault <-> investment
POST /balances/claim-referral  // Claim referral (min $100)
GET  /balances/transfers       // Transfer history
```

### Updated Routes (`/withdrawals/*`)

```typescript
POST /withdrawals/request      // Create withdrawal (from vault only)
GET  /withdrawals/my-withdrawals
GET  /withdrawals/pending      // Admin: pending requests
GET  /withdrawals/all          // Admin: all requests (with filters)
POST /withdrawals/:id/approve  // Admin: approve (requires tx hash)
POST /withdrawals/:id/reject   // Admin: reject with reason
```

---

## 📱 Mobile App Features

### New Hooks (`useBalances.ts`)
```typescript
useBalances()          // Auto-refresh every 5s
useTransferBalance()
useClaimReferral()
useBalanceTransfers()
```

### New Components
- **TransferModal**: Move money between vault/investment
  - Visual direction indicator
  - Shows available balance
  - Informative messages

### Updated Screens

#### Profile Screen
- Balance breakdown card showing:
  - 🔒 Vault Balance (safe, no yield)
  - 💰 Invested Balance (earning, growing)
  - 🎁 Referral Earnings (claim at $100)
- Transfer button (opens TransferModal)
- Claim button (enabled at ≥ $100)

---

## 🌐 Frontend Website Features

### Admin Panel (`/admin/withdrawals`)

**Features:**
- **Tabs**: Pending | Approved | Rejected | All
- **Pending View**:
  - Shows all pending withdrawal requests
  - User info + vault balance
  - Withdrawal address
  - **Important workflow**:
    1. Admin manually transfers USDC
    2. Enters transaction hash (required)
    3. Clicks "Approve & Deduct Balance"
    4. System deducts from user's vault
    5. Records transaction hash
- **Other Tabs**:
  - View history of approved/rejected
  - See transaction hashes
  - See who approved (admin username)
  - Rejection reasons

**Safety Features:**
- Transaction hash required before approval
- Confirmation dialog before deducting balance
- Shows user's current vault balance
- Auto-refresh every 30 seconds

---

## 🚀 Setup Instructions

### 1. Database Migration

```bash
# Run in Supabase SQL Editor
/Users/trymbakmahant/Projects/ShanProjectClone/new start app/backend/supabase-schema.sql
```

**Migrate existing data:**
```sql
-- Move existing balance to vault
UPDATE users 
SET vault_balance = COALESCE(balance, 0),
    invested_balance = 0,
    referral_balance = 0;
```

### 2. Start Backend

```bash
cd backend
bun run dev
```

Expected output:
```
[DEPOSIT MONITOR] ✅ Started - monitoring contract events
[INVESTMENT GROWTH] ✅ Started - calculating investment earnings
Server running on port 8080
```

### 3. Mobile App

```bash
cd mobile-app
yarn start
```

### 4. Frontend Website

```bash
cd frontend
pnpm dev
```

---

## 👨‍💼 Admin Workflow

### Creating Admin User

```sql
-- In Supabase SQL Editor
UPDATE users 
SET role = 'admin' 
WHERE email = 'admin@example.com';
```

### Processing Withdrawal

1. **Login as admin** → Navigate to `/admin/withdrawals`
2. **View pending requests** in Pending tab
3. **Check user details**:
   - Username, email
   - Withdrawal amount
   - User's vault balance (must be sufficient)
   - Destination address
4. **Perform manual transfer**:
   - Send USDC from platform wallet to user's address
   - Note the transaction hash
5. **Approve in system**:
   - Enter transaction hash
   - Click "Approve & Deduct Balance"
   - Confirm dialog
6. **Done!**:
   - User's vault balance deducted
   - Withdrawal marked as approved
   - Transaction hash recorded

---

## 🔑 Key Features

### User Benefits
✅ Deposits go to safe vault automatically
✅ Choose when to invest (earns yield)
✅ See real-time investment growth
✅ Easy transfers between vault/investment
✅ Claim referral earnings at $100
✅ Request withdrawals anytime
✅ Track withdrawal status

### Admin Control
✅ Manual approval for all withdrawals
✅ See user's available balance
✅ Record transaction hashes
✅ Reject with reason if needed
✅ View complete withdrawal history
✅ Filter by status

### Security
✅ Vault balance checked before withdrawal creation
✅ Balance deducted only after admin approval
✅ Transaction hash required and recorded
✅ Cannot approve twice (status check)
✅ Audit trail (who approved, when)

---

## 📊 Example Calculations

### Investment Growth

**Scenario**: $1,000 invested at 42.8% APY

**After 1 hour:**
- Hourly rate: 42.8% / 365 / 24 = 0.004885%
- New amount: $1,000 × (1 + 0.00004885) = $1,000.049
- Earned: $0.049

**After 24 hours:**
- Compounds 24 times
- New amount: $1,000 × (1.00004885)^24 = $1,001.17
- Earned: $1.17

**After 30 days:**
- Compounds 720 times  
- New amount: $1,000 × (1.00004885)^720 = $1,035.91
- Earned: $35.91 (3.6% monthly)

---

## 🧪 Testing

### Test Deposit
```bash
# Deploy contract, make deposit
# Check backend logs:
[DEPOSIT MONITOR] ✅ Credited 100 USDC to vault for user abc-123
```

### Test Transfer
```bash
# In mobile app or API:
POST /balances/transfer
{
  "from": "vault",
  "to": "investment",
  "amount": 100
}
```

### Test Investment Growth
```bash
# Wait 1 minute, check investment balance
# Should see small increase based on APY
```

### Test Withdrawal
```bash
# 1. User creates request
POST /withdrawals/request
{
  "amount": 50,
  "toAddress": "0x..."
}

# 2. Admin approves (after manual transfer)
POST /withdrawals/:id/approve
{
  "transactionHash": "0x..."
}

# 3. Check user vault balance decreased
```

---

## 📁 Files Changed/Created

### Backend
- ✅ `supabase-schema.sql` - New tables & columns
- ✅ `services/depositMonitor.ts` - Credits vault
- ✅ `services/investmentGrowth.ts` - NEW: Growth calculator
- ✅ `routes/balances.ts` - NEW: Balance management
- ✅ `routes/withdrawals.ts` - Updated for vault + admin flow
- ✅ `routes/auth.ts` - Return new balance fields
- ✅ `app.ts` - Add balances routes
- ✅ `index.ts` - Start growth calculator

### Mobile App
- ✅ `types/api.ts` - New balance types
- ✅ `hooks/useBalances.ts` - NEW: Balance hooks
- ✅ `components/transfer-modal.tsx` - NEW: Transfer UI
- ✅ `app/(tabs)/profile.tsx` - Balance breakdown + transfer
- ✅ `app/(tabs)/index.tsx` - Show total balance

### Frontend Website
- ✅ `app/admin/withdrawals/page.tsx` - Complete redesign with tabs

---

## 🎉 Summary

**For Users:**
- Deposits → Vault (safe)
- Transfer → Investment (grows)
- Earn referrals → Claim at $100
- Withdraw from vault → Admin approves

**For Admins:**
- See all withdrawal requests
- Manually transfer USDC
- Record transaction hash
- Approve/reject with full audit trail

**System automatically:**
- Monitors blockchain deposits
- Credits vault balance
- Calculates investment growth every minute
- Compounds earnings
- Shows real-time balances

**Everything is ready to use! 🚀**

