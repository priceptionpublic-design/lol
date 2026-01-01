# Frontend Environment Setup Guide

## What You Need

The frontend **doesn't** need RPC URLs. MetaMask handles that!

You only need to tell the **backend** where the contracts are.

---

## Backend Environment (.env)

Add these to `backend/.env`:

```env
# Smart Contract Addresses (from your deployment)
DEPOSIT_CONTRACT_ADDRESS=0xYourDepositContractAddress
USDC_TOKEN_ADDRESS=0xYourUSDCTokenAddress

# Network Selection
USE_TESTNET=true

# RPC URLs (backend uses these to monitor deposits)
SEPOLIA_RPC=https://rpc.ankr.com/eth_sepolia
ETHEREUM_MAINNET_RPC=https://rpc.ankr.com/eth
```

---

## Frontend Environment (.env.local) - OPTIONAL

The frontend gets contract addresses from the backend API automatically, but you can optionally set:

```env
# API URL (defaults to http://localhost:8080)
NEXT_PUBLIC_API_URL=http://localhost:8080
```

---

## What `NEXT_PUBLIC_NETWORK` Means

It's just a **display name** for the UI. Examples:
- `Sepolia Testnet` - Shows users they're on testnet
- `Ethereum Mainnet` - Shows users they're on mainnet
- `BSC Mainnet` - If you switch to Binance Smart Chain

**It's not an RPC URL!**

---

## How MetaMask Works

1. User has MetaMask installed with their preferred RPC
2. User selects network in MetaMask (Sepolia, Mainnet, etc.)
3. Frontend uses whatever network MetaMask is connected to
4. **No RPC configuration needed in frontend!**

---

## After Deploying Your Contracts

1. **Deploy to Sepolia** (see `contracts/SEPOLIA-SETUP.md`)
2. **Get contract addresses** from deployment output
3. **Update `backend/.env`**:
   ```env
   DEPOSIT_CONTRACT_ADDRESS=0xYourNewContractAddress
   USDC_TOKEN_ADDRESS=0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238
   USE_TESTNET=true
   ```
4. **Restart backend**: `npm start`
5. **Done!** Frontend gets addresses from backend API

---

## For Production (Mainnet)

Change backend `.env`:
```env
DEPOSIT_CONTRACT_ADDRESS=0xYourMainnetContract
USDC_TOKEN_ADDRESS=0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48
USE_TESTNET=false
```

---

## Testing the Flow

1. **Open frontend** → Go to `/deposit`
2. **Click "Connect Wallet"** → MetaMask pops up
3. **Make sure MetaMask is on Sepolia network**
4. **Enter amount** → Click "1. Approve USDC"
5. **Confirm in MetaMask** → Wait for approval
6. **Click "2. Deposit"** → Confirm in MetaMask
7. **Done!** Backend monitors the blockchain and credits your vault automatically

---

## Summary

**You DON'T need:**
- ❌ RPC URLs in frontend
- ❌ Private keys anywhere
- ❌ To configure networks manually

**You ONLY need:**
- ✅ Contract addresses in backend `.env`
- ✅ MetaMask installed (user's responsibility)
- ✅ Users to connect their wallet

