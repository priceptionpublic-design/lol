# Local Development Setup

## Quick Start - Deploy Locally

### Step 1: Start Local Blockchain (Anvil)

Open a **new terminal** and run:
```bash
cd contracts
make anvil
```

This starts a local Ethereum node at `http://localhost:8545` with:
- 10 pre-funded test accounts
- Instant block times
- Perfect for testing!

**Keep this terminal running!**

### Step 2: Get a Test Account

Anvil gives you 10 accounts with private keys. Copy one:

```
Available Accounts
==================
(0) 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 (10000 ETH)
(1) 0x70997970C51812dc3A010C7d01b50e0d17dc79C8 (10000 ETH)
...

Private Keys
==================
(0) 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
(1) 0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d
```

### Step 3: Create `.env` File

```bash
cd contracts
nano .env
```

Paste:
```bash
# Use Anvil's first account
PRIVATE_KEY=ac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80

# Local RPC
BSC_TESTNET_RPC=http://localhost:8545

# Will be filled after deploying Mock USDC
USDC_TOKEN_ADDRESS=
```

### Step 4: Deploy Mock USDC

```bash
make deploy-mock-usdc
```

**Copy the MockUSDC address** from output:
```
=== MOCK USDC DEPLOYED ===
MockUSDC Address: 0x5FbDB2315678afecb367f032d93F642f64180aa3
```

Update your `.env`:
```bash
USDC_TOKEN_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
```

### Step 5: Deploy YieldiumDeposit

```bash
make deploy-local
```

**Copy the contract address:**
```
=== BSC TESTNET DEPLOYMENT ===
YieldiumDeposit: 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
```

### Step 6: Test Deposits!

Now you can interact with the contracts:

```bash
# Check your USDC balance (should be 1M USDC)
cast call 0x5FbDB2315678afecb367f032d93F642f64180aa3 \
  "balanceOf(address)(uint256)" \
  0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 \
  --rpc-url http://localhost:8545

# Approve YieldiumDeposit to spend USDC
cast send 0x5FbDB2315678afecb367f032d93F642f64180aa3 \
  "approve(address,uint256)" \
  0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512 \
  1000000000000 \
  --rpc-url http://localhost:8545 \
  --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80

# Deposit 100 USDC (100 * 10^6)
cast send 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512 \
  "deposit(uint256)" \
  100000000 \
  --rpc-url http://localhost:8545 \
  --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80

# Check total deposited
cast call 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512 \
  "getTotalDeposited(address)(uint256)" \
  0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 \
  --rpc-url http://localhost:8545
```

## Backend Configuration for Local Testing

Update backend `.env`:
```bash
# Point to local node
BSC_RPC_URL=http://localhost:8545
DEPOSIT_CONTRACT_ADDRESS=0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512

# Supabase
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_key
```

Start backend:
```bash
cd backend
bun run dev
```

The deposit monitor will now watch your local blockchain!

## Advantages of Local Development

✅ **Instant transactions** - No waiting for blocks
✅ **Free** - No testnet faucets needed
✅ **Unlimited tokens** - Mint as much as you want
✅ **Reset anytime** - Just restart Anvil
✅ **Full control** - Perfect for testing
✅ **Fast iteration** - Deploy in seconds

## Useful Commands

```bash
# Start local node
make anvil

# Deploy everything locally
make deploy-local-full

# Check account balance
cast balance <ADDRESS> --rpc-url http://localhost:8545

# Call contract (read)
cast call <CONTRACT> "functionName()" --rpc-url http://localhost:8545

# Send transaction (write)
cast send <CONTRACT> "functionName()" \
  --rpc-url http://localhost:8545 \
  --private-key <KEY>

# Get transaction receipt
cast receipt <TX_HASH> --rpc-url http://localhost:8545

# Watch for events
cast logs --address <CONTRACT> --rpc-url http://localhost:8545
```

## Troubleshooting

**Anvil not starting?**
- Make sure port 8545 is free: `lsof -i :8545`
- Kill any process: `kill -9 <PID>`

**Deployment fails?**
- Check Anvil is running: `curl http://localhost:8545`
- Verify .env file exists with correct private key

**Transaction reverts?**
- Check you approved USDC first
- Verify you have USDC balance
- Make sure deposit amount is > 0

## Next Steps

Once everything works locally:
1. Test on BSC Testnet (get free testnet BNB from [Chainlink Faucet](https://faucets.chain.link/bnb-testnet))
2. Deploy to BSC Mainnet (with real funds)

