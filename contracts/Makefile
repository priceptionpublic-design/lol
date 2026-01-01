# Commands
.PHONY: all build test clean deploy-testnet deploy-mainnet deploy-mock-usdc deploy-local deploy-local-full anvil

# Build
build:
	forge build

# Test (use --offline to avoid macOS network config bug)
test:
	forge test --offline -vvv

# Test with gas report
test-gas:
	forge test --offline -vvv --gas-report

# Clean
clean:
	forge clean

# Deploy Mock USDC for testing
deploy-mock-usdc:
	@echo "🪙 Deploying Mock USDC for testing..."
	forge script script/DeployMockUSDC.s.sol:DeployMockUSDCScript \
		--rpc-url https://data-seed-prebsc-1-s1.binance.org:8545/ \
		--broadcast \
		--gas-price 3000000000 \
		--legacy \
		-vvvv

# Deploy to Sepolia Testnet
deploy-testnet:
	@echo "Deploying to Sepolia Testnet..."
	@echo "Make sure PRIVATE_KEY is set in your environment"
	forge script script/Deploy.s.sol:DeployTestnetScript \
		--rpc-url https://ethereum-sepolia-rpc.publicnode.com \
		--broadcast \
		-vvvv

# Deploy to Ethereum Mainnet
deploy-mainnet:
	@echo "Deploying to Ethereum Mainnet..."
	@echo "WARNING: This will deploy to MAINNET!"
	@read -p "Are you sure? (y/N) " confirm && [ "$$confirm" = "y" ] || exit 1
	forge script script/Deploy.s.sol:DeployMainnetScript \
		--rpc-url https://eth.llamarpc.com \
		--broadcast \
		-vvvv

# Deploy locally with Anvil
deploy-local:
	@echo "🏠 Deploying to local Anvil node..."
	@echo "Make sure Anvil is running in another terminal!"
	forge script script/Deploy.s.sol:DeployTestnetScript \
		--rpc-url http://localhost:8545 \
		--broadcast \
		-vvvv

# Deploy locally with auto-mint USDC
deploy-local-full:
	@echo "🏠 Deploying Mock USDC + YieldiumDeposit locally..."
	@echo "Step 1: Deploy Mock USDC..."
	forge script script/DeployMockUSDC.s.sol:DeployMockUSDCScript \
		--rpc-url http://localhost:8545 \
		--broadcast \
		-vvv
	@echo ""
	@echo "Step 2: Deploy YieldiumDeposit..."
	@echo "Update USDC_TOKEN_ADDRESS in .env with the Mock USDC address above, then run 'make deploy-local'"

# Start local node
anvil:
	anvil --chain-id 31337

# Format code
format:
	forge fmt

# Check code formatting
fmt-check:
	forge fmt --check
