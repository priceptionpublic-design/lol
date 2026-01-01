# Backend Configuration and Startup

## Issue
Mobile app getting 500 errors because backend is not running or misconfigured.

## Fix Steps

### 1. Update backend/.env

Create/update `backend/.env` with:

```bash
SUPABASE_URL=https://jnglgvpzvjbamzuwlotx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpuZ2xndnB6dmpiYW16dXdsb3R4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDk2MTgwNywiZXhwIjoyMDgwNTM3ODA3fQ.yNezQlCsxEuGjY6MXEMf0-qL--5rqrv7bXG8O1kS4Sw
JWT_SECRET=your-jwt-secret

# Sepolia Testnet - NEW CONTRACT!
DEPOSIT_CONTRACT_ADDRESS=0x31108909C5E67e7FA5aC3EC1a4EDB2597D00a3F5
BSC_RPC_URL=https://ethereum-sepolia-rpc.publicnode.com
USDC_TOKEN_ADDRESS=0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238

USE_TESTNET=true
```

### 2. Check if deposit_history table has wallet_address column

Run in Supabase SQL Editor:

```sql
-- Check current schema
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'deposit_history';

-- If wallet_address column doesn't exist, add it:
ALTER TABLE deposit_history 
ADD COLUMN IF NOT EXISTS wallet_address TEXT;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_deposit_history_wallet 
ON deposit_history(wallet_address);
```

### 3. Start Backend

```bash
cd backend
bun run dev
```

### Expected Output:
```
✅ Connected to Supabase
[DEPOSIT MONITOR] ✅ Started - monitoring contract events
Server running on port 3000
```

### 4. Test API

```bash
# Test health
curl http://localhost:3000/health

# Test deposits endpoint (should work even if empty)
curl http://localhost:3000/api/deposits/contract-info
```

## Common Errors & Solutions

### Error: "column wallet_address does not exist"
**Solution:** Run the SQL from step 2 above

### Error: "supabaseUrl is required"
**Solution:** Make sure .env file is in `backend/` directory, not project root

### Error: "Rate limited"
**Solution:** Monitor will auto-retry, this is normal on startup

### Error: "Cannot find module"
**Solution:** 
```bash
cd backend
bun install
```

## Verify Backend is Working

1. **Check terminal 4** - Should show:
   ```
   [DEPOSIT MONITOR] ✅ Started
   Server running on port 3000
   ```

2. **Mobile app should stop showing 500 errors**

3. **Check deposit was recorded:**
   ```bash
   # In Supabase SQL Editor:
   SELECT * FROM deposit_history 
   WHERE wallet_address = '0x645d85678c2d4c56c17f3579a278c2be2d73119c';
   ```

## What the Backend Does

- **Every 10 seconds**: Scans blockchain for deposit events
- **When found**: Records in `deposit_history` table
- **Mobile app**: Fetches from `/deposits/my-history`
- **Your deposit**: Should appear within ~30 seconds of making it

## Next Steps

After backend starts successfully:
1. ✅ Make another test deposit on-chain
2. ✅ Wait 10-30 seconds
3. ✅ Check mobile app - deposit should appear!
4. ✅ Check Supabase - record in `deposit_history` table

