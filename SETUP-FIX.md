# 🚀 Quick Setup Guide

## Issue: Database Schema Mismatch

The backend is looking for columns that don't exist yet in your Supabase database. You need to run the migration.

## ✅ Solution: Run the Migration

### **Step 1: Open Supabase**
1. Go to [https://supabase.com](https://supabase.com)
2. Open your project
3. Click "SQL Editor" in the left sidebar

### **Step 2: Run Migration**
1. Copy the contents of `/backend/MIGRATION.sql`
2. Paste into SQL Editor
3. Click "Run" (or press Ctrl/Cmd + Enter)

### **Step 3: Verify**
You should see success messages like:
```
ALTER TABLE
UPDATE 0 (or some number)
CREATE TABLE
```

### **Step 4: Restart Backend**
```bash
cd backend
# Stop the server (Ctrl+C)
bun run dev
```

You should now see:
```
[DEPOSIT MONITOR] ✅ Started
[INVESTMENT GROWTH] ✅ Started
Server running on port 8080
```

## What the Migration Does

1. ✅ Adds new columns to `investments` table:
   - `initial_amount` - Original investment
   - `current_amount` - With earnings
   - `apy_at_stake` - APY rate
   - `last_calculated_at` - Last growth calculation
   - `unstaked_at` - When unstaked

2. ✅ Adds new balance columns to `users` table:
   - `vault_balance` - Safe storage
   - `invested_balance` - Currently invested
   - `referral_balance` - Referral earnings

3. ✅ Creates `balance_transfers` table for transfer history

4. ✅ Migrates existing data:
   - Moves `investments.amount` → `initial_amount` & `current_amount`
   - Moves `users.balance` → `vault_balance`

5. ✅ Updates referral commission statuses

## If You Get Errors

### Error: "column already exists"
- **Solution:** This is fine, the migration checks with `IF NOT EXISTS`

### Error: "relation does not exist"
- **Solution:** Run the original schema first: `backend/supabase-schema.sql`

### Error: "permission denied"
- **Solution:** Make sure you're using the SQL Editor in Supabase (not a SQL client)

## After Migration Success

Your system will have:
- ✅ 3 separate balance types working
- ✅ Investment growth calculator running
- ✅ Deposit monitoring active
- ✅ All balance transfers functional

## Mobile App Login Issue

The mobile app is showing "Network Error" because the backend isn't running or isn't accessible.

### Fix:
1. **Check backend is running:**
   ```bash
   cd backend
   bun run dev
   ```

2. **Check mobile app API URL:**
   - File: `mobile-app/lib/api.ts`
   - Should be: `http://YOUR_COMPUTER_IP:8080` (not localhost if on physical device)

3. **For iOS Simulator:** Use `http://localhost:8080`
4. **For Android Emulator:** Use `http://10.0.2.2:8080`
5. **For Physical Device:** Use your computer's IP address

### Find Your IP:
```bash
# macOS/Linux
ifconfig | grep inet

# Windows
ipconfig
```

Update in `mobile-app/lib/api.ts`:
```typescript
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://YOUR_IP:8080';
```

Then restart the Expo app.

