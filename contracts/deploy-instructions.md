# Deploy to BSC Testnet

## Prerequisites
1. Create `.env` file in contracts folder with your private key
2. Get testnet BNB from: https://testnet.bnbchain.org/faucet-smart

## Deploy Command
```bash
cd contracts
make deploy-testnet
```

Or manually:
```bash
forge script script/Deploy.s.sol:DeployTestnetScript \
  --rpc-url $BSC_TESTNET_RPC \
  --broadcast \
  --verify
```

## After Deployment
1. Copy the deployed contract address from terminal output
2. Add to backend `.env`:
   ```
   DEPOSIT_CONTRACT_ADDRESS=0x...
   BSC_RPC_URL=https://data-seed-prebsc-1-s1.binance.org:8545
   ```
3. Update frontend/mobile config if needed

## Test the Contract
After deployment, test by sending testnet USDC to the contract address.
