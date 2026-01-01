# Complete Testnet Setup Guide

## Step 1: Create Wallet with MetaMask

### Install MetaMask
1. Go to https://metamask.io/
2. Download browser extension or mobile app
3. Click "Create a new wallet"
4. **Save your seed phrase** (12 words) - NEVER share this!
5. Set a password

### Get Your Private Key
1. Open MetaMask
2. Click 3 dots (⋮) next to account
3. Account details → Show private key
4. Enter password and copy the key
5. Save this for contract deployment

## Step 2: Add BSC Testnet Network

### In MetaMask:
1. Click network dropdown (top left)
2. Click "Add Network" → "Add a network manually"
3. Fill in:
   ```
   Network Name: BSC Testnet
   RPC URL: https://data-seed-prebsc-1-s1.binance.org:8545
   Chain ID: 97
   Currency Symbol: BNB
   Block Explorer: https://testnet.bscscan.com
   ```
4. Click "Save"

## Step 3: Get Testnet BNB (for gas)

### Option A - Official Faucet (Recommended)
1. Go to: https://testnet.bnbchain.org/faucet-smart
2. Connect your MetaMask wallet
3. Click "Give me BNB"
4. Wait ~30 seconds
5. You'll receive 0.3-1 BNB

### Option B - Alternative Faucets
- https://www.bnbchain.org/en/testnet-faucet
- https://testnet.binance.org/faucet-smart

### Verify Balance
Check your MetaMask - should show testnet BNB

## Step 4: Get Testnet USDC

### Option 1 - Use Existing Testnet USDC
BSC Testnet USDC: `0x64544969ed7EBf5f083679233325356EbE738930`

**Problem:** Hard to get testnet USDC from this contract

### Option 2 - Deploy Your Own Mock USDC (Easy!)

1. **Create .env file** in contracts folder:
   ```bash
   cd contracts
   nano .env
   ```

2. **Add your wallet details:**
   ```bash
   PRIVATE_KEY=your_private_key_from_metamask
   BSC_TESTNET_RPC=https://data-seed-prebsc-1-s1.binance.org:8545
   ```

3. **Deploy Mock USDC:**
   ```bash
   make deploy-mock-usdc
   ```

4. **You'll receive:**
   - Your own USDC contract address
   - 1,000,000 testnet USDC automatically minted to your wallet!

5. **Save the contract address** - use it as `USDC_TOKEN_ADDRESS`

### Option 3 - Mint More USDC Anytime
After deploying your mock USDC, mint more with:
```bash
cast send <MOCK_USDC_ADDRESS> \
  "mint(address,uint256)" \
  <YOUR_WALLET_ADDRESS> \
  1000000000000 \
  --rpc-url $BSC_TESTNET_RPC \
  --private-key $PRIVATE_KEY
```

## Step 5: Deploy YieldiumDeposit Contract

1. **Update .env** with your Mock USDC address:
   ```bash
   PRIVATE_KEY=your_private_key
   BSC_TESTNET_RPC=https://data-seed-prebsc-1-s1.binance.org:8545
   USDC_TOKEN_ADDRESS=your_mock_usdc_address_from_step_4
   ```

2. **Deploy:**
   ```bash
   make deploy-testnet
   ```

3. **Copy the deployed contract address**

## Step 6: Test Deposit Flow

### In MetaMask:
1. **Add USDC Token:**
   - Assets → Import tokens
   - Token address: (your mock USDC address)
   - Symbol: USDC
   - Decimals: 6

2. **You should see your 1M USDC balance!**

3. **Approve Contract:**
   ```bash
   cast send <USDC_ADDRESS> \
     "approve(address,uint256)" \
     <YIELDIUM_DEPOSIT_ADDRESS> \
     1000000000000 \
     --rpc-url $BSC_TESTNET_RPC \
     --private-key $PRIVATE_KEY
   ```

4. **Make a Deposit:**
   ```bash
   cast send <YIELDIUM_DEPOSIT_ADDRESS> \
     "deposit(uint256)" \
     100000000 \
     --rpc-url $BSC_TESTNET_RPC \
     --private-key $PRIVATE_KEY
   ```
   (This deposits 100 USDC)

5. **Check your deposit:**
   ```bash
   cast call <YIELDIUM_DEPOSIT_ADDRESS> \
     "getTotalDeposited(address)(uint256)" \
     <YOUR_WALLET_ADDRESS> \
     --rpc-url $BSC_TESTNET_RPC
   ```

## Quick Command Reference

```bash
# Deploy Mock USDC
make deploy-mock-usdc

# Deploy YieldiumDeposit
make deploy-testnet

# Check BNB balance
cast balance <YOUR_ADDRESS> --rpc-url $BSC_TESTNET_RPC

# Check USDC balance
cast call <USDC_ADDRESS> "balanceOf(address)(uint256)" <YOUR_ADDRESS> --rpc-url $BSC_TESTNET_RPC

# Approve contract
cast send <USDC_ADDRESS> "approve(address,uint256)" <CONTRACT_ADDRESS> 1000000000000 --rpc-url $BSC_TESTNET_RPC --private-key $PRIVATE_KEY

# Deposit USDC
cast send <CONTRACT_ADDRESS> "deposit(uint256)" 100000000 --rpc-url $BSC_TESTNET_RPC --private-key $PRIVATE_KEY
```

## Summary

1. ✅ Install MetaMask
2. ✅ Create wallet + get private key
3. ✅ Add BSC Testnet network
4. ✅ Get testnet BNB from faucet
5. ✅ Deploy Mock USDC (get 1M USDC free!)
6. ✅ Deploy YieldiumDeposit contract
7. ✅ Test deposits!

**Advantages of Mock USDC:**
- You control it completely
- Mint unlimited testnet USDC
- No need to request from others
- Perfect for testing



  === SEPOLIA TESTNET DEPLOYMENT ===
  YieldiumDeposit: 0x31108909C5E67e7FA5aC3EC1a4EDB2597D00a3F5
  USDC Token: 0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238
  Owner: 0x645D85678C2d4C56c17F3579a278C2bE2D73119c