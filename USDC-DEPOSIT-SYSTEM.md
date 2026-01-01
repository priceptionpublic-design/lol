# USDC Deposit System - Implementation Summary

## Overview
The deposit system has been completely redesigned to:
1. **Accept USDC tokens** (not BNB)
2. **Monitor contract events** (no auto-crediting)
3. **Store deposit history** in web2 database for easy querying
4. **Remove auto-verification** - just track deposits

## Smart Contract Changes

### Contract: `YieldiumDeposit.sol`
- **Now accepts USDC (ERC-20)** instead of native BNB
- Constructor requires USDC token address
- Users must approve contract before depositing
- Emits `DepositMade` event with: user, amount, timestamp, depositIndex
- All amounts in USDC (6 decimals)

### Deployment
```bash
# BSC Testnet USDC: 0x64544969ed7EBf5f083679233325356EbE738930
# BSC Mainnet USDC: 0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d

cd contracts
make deploy-testnet  # or deploy-mainnet
```

### Testing
```bash
cd contracts
make test  # All 23 tests pass
```

## Backend Changes

### Database Schema (`supabase-schema.sql`)
**Removed:**
- `deposit_requests` table (old flow)
- `last_verified_contract_balance` from users

**Added:**
- `deposit_history` table:
  - `user_id` (nullable - can track unknown wallets)
  - `wallet_address`
  - `amount` (USDC, 8 decimals in DB)
  - `transaction_hash`
  - `block_number`
  - `deposit_index`
  - `timestamp`
  - Unique constraint on (transaction_hash, deposit_index)

### Deposit Monitor (`depositMonitor.ts`)
- **Background job** runs every 10 seconds
- Monitors `DepositMade` events from contract
- Stores events in `deposit_history` table
- Converts USDC amounts (6 decimals → human-readable)
- Links deposits to users by wallet address
- Resumes from last processed block

### API Routes (`/deposits`)
**Endpoints:**
- `GET /contract-info` - Get contract address & network info
- `GET /my-history` - User's deposit history
- `GET /my-stats` - User's total deposited & count
- `GET /all-history` - Admin: all deposits (paginated)
- `GET /stats` - Admin: global statistics

**Removed endpoints:**
- `/submit` (no manual submission needed)
- `/verify` (no verification needed)
- `/on-chain-balance` (use stats instead)

### Environment Variables
Add to backend `.env`:
```bash
# Supabase
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Smart Contract
DEPOSIT_CONTRACT_ADDRESS=0x...  # Deployed contract address
BSC_RPC_URL=https://bsc-dataseed1.binance.org  # or testnet
```

## Frontend Changes

### Web App (`/deposit/page.tsx`)
**New UI:**
- Shows deposit statistics (total deposited, count)
- Displays deposit history with timestamps & tx hashes
- Links to BscScan for each transaction
- Instructions on how to deposit USDC
- Auto-refreshes data

**User Flow:**
1. User sees their deposit history page
2. Uses external wallet to send USDC to contract
3. Deposit appears automatically within 10 seconds
4. No manual submission or verification needed

### Mobile App (`deposit-modal.tsx`)
**New UI:**
- Stats cards (total deposited, deposit count)
- Deposit history list
- Pull-to-refresh
- Contract address with copy button
- Links to BscScan

**Hooks Updated:**
- `useDepositHistory()` - Fetches deposit history
- `useDepositStats()` - Fetches statistics
- Removed: `useDeposit()`, `useVerifyDeposit()`, `useMyDeposits()`

## User Flow

### How Users Deposit USDC:

1. **User opens deposit page** (web or mobile)
   - Sees their deposit history & stats
   - Gets contract address

2. **User deposits via external wallet:**
   ```
   - Open MetaMask/Trust Wallet
   - Send USDC to contract address
   - Approve + Confirm transaction
   ```

3. **Backend monitors automatically:**
   - Every 10 seconds, checks for new events
   - Finds `DepositMade` event
   - Creates record in `deposit_history`
   - Links to user by wallet address

4. **User sees deposit immediately:**
   - Refresh page or pull-to-refresh
   - Deposit appears with tx hash & timestamp
   - Can view on BscScan

## USDC Contract Addresses

### BSC Testnet
```
USDC: 0x64544969ed7EBf5f083679233325356EbE738930
```

### BSC Mainnet
```
USDC: 0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d
```

## Key Benefits

✅ **No admin approval** - Fully automated
✅ **No manual submission** - Just send USDC
✅ **Easy history tracking** - Web2 database for fast queries
✅ **Unknown wallets supported** - Don't need account to deposit
✅ **Automatic monitoring** - Background job handles everything
✅ **USDC stable** - No price volatility like BNB

## Next Steps

1. **Deploy contract** to BSC Testnet/Mainnet
2. **Run schema** in Supabase SQL Editor
3. **Configure .env** with contract address & RPC URL
4. **Start backend** - Monitor will auto-start
5. **Test deposit** - Send USDC and watch it appear!

## Testing Checklist

- [ ] Contract deployed with correct USDC address
- [ ] Backend monitor running and checking events
- [ ] Test USDC deposit shows in history
- [ ] Mobile app displays deposits correctly
- [ ] Web app shows history & stats
- [ ] BscScan links work
- [ ] Pull-to-refresh updates data
- [ ] Admin endpoints return data

## Notes

- Deposits are **not auto-credited** to user balance
- This is purely a **history tracking system**
- Admins can view all deposits via `/all-history`
- Users can see only their own deposits
- Monitor resumes from last block on restart
- USDC has 6 decimals (unlike 18 for ETH/BNB)

