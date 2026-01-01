# Sepolia Testnet Setup Guide

## Prerequisites

1. **MetaMask Wallet** - Install from [metamask.io](https://metamask.io)
2. **Add Sepolia Network** to MetaMask (it's built-in, just enable "Show test networks" in settings)

## Step 1: Get Sepolia ETH

You need Sepolia ETH for gas fees. Get it from any of these faucets:

1. **Alchemy Faucet**: https://sepoliafaucet.com
2. **Infura Faucet**: https://www.infura.io/faucet/sepolia
3. **Chainlink Faucet**: https://faucets.chain.link/sepolia

## Step 2: Get Sepolia USDC

**Official Circle USDC on Sepolia:**
- Address: `0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238`
- Decimals: 6

### Option A: Use Circle's Faucet (Recommended)
Visit: https://faucet.circle.com
- Select "Sepolia"
- Enter your wallet address
- Receive testnet USDC

### Option B: Deploy Mock USDC (for testing)
```bash
cd contracts
make deploy-mock-usdc
```

## Step 3: Configure Your Environment

Create `.env` file in `contracts/` directory:

```bash
# Your wallet private key (export from MetaMask)
PRIVATE_KEY=0xyour_private_key_here

# Sepolia RPC - Choose one:
# Option 1: Alchemy (Recommended - Most reliable)
SEPOLIA_RPC=https://eth-sepolia.g.alchemy.com/v2/demo

# Option 2: Get free API key from https://www.alchemy.com
# SEPOLIA_RPC=https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY

# Option 3: Infura (get free key from https://infura.io)
# SEPOLIA_RPC=https://sepolia.infura.io/v3/YOUR_API_KEY

# Circle's Official Sepolia USDC
USDC_TOKEN_ADDRESS=0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238

# Optional: Etherscan API key for verification
ETHERSCAN_API_KEY=your_etherscan_api_key
```

## Step 4: Deploy YieldiumDeposit Contract

```bash
cd contracts

# Deploy to Sepolia
make deploy-testnet
```

**Expected Output:**
```
=== SEPOLIA TESTNET DEPLOYMENT ===
YieldiumDeposit: 0x...
USDC Token: 0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238
Owner: 0x...
```

## Step 5: Update Backend Configuration

Update `backend/.env`:

```bash
DEPOSIT_CONTRACT_ADDRESS=0xYourDeployedContractAddress
BSC_RPC_URL=https://rpc.sepolia.org
USDC_TOKEN_ADDRESS=0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238
```

## Step 6: Test Deposit Flow

### 6.1 Approve USDC (one-time approval for all tests)
```bash
# Approve 3 USDC = 3,000,000 (3 * 10^6)
cast send 0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238 \
  "approve(address,uint256)" \
  YOUR_CONTRACT_ADDRESS \
  3000000 \
  --rpc-url https://eth-sepolia.g.alchemy.com/v2/demo \
  --private-key $PRIVATE_KEY
```

### 6.2 Make a Test Deposit (0.1 USDC per test)
```bash
# Deposit 0.1 USDC = 100,000 (0.1 * 10^6)
# You can repeat this 30 times with your 3 USDC!
cast send YOUR_CONTRACT_ADDRESS \
  "deposit(uint256)" \
  100000 \
  --rpc-url https://eth-sepolia.g.alchemy.com/v2/demo \
  --private-key $PRIVATE_KEY
```

**Other useful test amounts:**
- 0.01 USDC (300 tests): `10000`
- 0.1 USDC (30 tests): `100000` ⭐ Recommended
- 0.5 USDC (6 tests): `500000`
- 1 USDC (3 tests): `1000000`

### 6.3 Check Your Deposit
```bash
cast call YOUR_CONTRACT_ADDRESS \
  "getTotalDeposited(address)(uint256)" \
  YOUR_WALLET_ADDRESS \
  --rpc-url https://eth-sepolia.g.alchemy.com/v2/demo
```

**To see human-readable amount:** Divide result by 1,000,000

## Useful Sepolia Resources

- **Block Explorer**: https://sepolia.etherscan.io
- **RPC Endpoints**:
  - Public: https://rpc.sepolia.org
  - Alchemy: https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY
  - Infura: https://sepolia.infura.io/v3/YOUR_API_KEY
- **Chain ID**: 11155111
- **Symbol**: ETH

## Contract Addresses

### Sepolia Testnet
- **USDC**: `0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238` (Circle Official)
- **YieldiumDeposit**: Deploy using instructions above

### Ethereum Mainnet (for future use)
- **USDC**: `0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48` (Circle Official)

## Troubleshooting

### "Insufficient funds" error
- Make sure you have Sepolia ETH for gas
- Get more from faucets listed above

### "Insufficient USDC balance"
- Get testnet USDC from Circle's faucet
- Or deploy your own Mock USDC for testing

### RPC rate limiting
- Use Alchemy or Infura with your own API key
- Free tier is usually sufficient for testing

## Next Steps

1. Deploy contract to Sepolia
2. Test deposit flow manually
3. Update mobile app to use Sepolia network
4. Test full user flow
5. When ready for mainnet, use `make deploy-mainnet`

