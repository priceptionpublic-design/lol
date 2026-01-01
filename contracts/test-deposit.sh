#!/bin/bash

# Quick test script for small USDC deposits
# Usage: ./test-deposit.sh <contract_address> <amount_in_usdc>
# Example: ./test-deposit.sh 0x123... 0.1

set -e

if [ -z "$1" ] || [ -z "$2" ]; then
    echo "Usage: ./test-deposit.sh <contract_address> <amount_in_usdc>"
    echo ""
    echo "Examples:"
    echo "  ./test-deposit.sh 0x123... 0.1    # Deposit 0.1 USDC"
    echo "  ./test-deposit.sh 0x123... 0.01   # Deposit 0.01 USDC"
    echo ""
    exit 1
fi

CONTRACT=$1
AMOUNT_USDC=$2

# Load private key from .env
source .env

# Calculate amount in smallest unit (USDC has 6 decimals)
AMOUNT=$(echo "$AMOUNT_USDC * 1000000" | bc | cut -d. -f1)

echo "🚀 Testing deposit..."
echo "   Contract: $CONTRACT"
echo "   Amount: $AMOUNT_USDC USDC ($AMOUNT smallest units)"
echo ""

# USDC contract on Sepolia
USDC_ADDRESS="0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238"
RPC="https://eth-sepolia.g.alchemy.com/v2/demo"

# Check USDC balance first
echo "📊 Checking your USDC balance..."
BALANCE=$(cast call $USDC_ADDRESS "balanceOf(address)(uint256)" $YOUR_WALLET --rpc-url $RPC)
BALANCE_USDC=$(echo "scale=6; $BALANCE / 1000000" | bc)
echo "   Balance: $BALANCE_USDC USDC"

if [ "$BALANCE" -lt "$AMOUNT" ]; then
    echo "❌ Insufficient USDC balance!"
    exit 1
fi

# Check allowance
echo ""
echo "🔍 Checking allowance..."
ALLOWANCE=$(cast call $USDC_ADDRESS "allowance(address,address)(uint256)" $YOUR_WALLET $CONTRACT --rpc-url $RPC)

if [ "$ALLOWANCE" -lt "$AMOUNT" ]; then
    echo "   Need to approve first..."
    echo ""
    echo "📝 Approving USDC..."
    cast send $USDC_ADDRESS \
        "approve(address,uint256)" \
        $CONTRACT \
        3000000 \
        --rpc-url $RPC \
        --private-key $PRIVATE_KEY
    echo "   ✅ Approved 3 USDC for all your tests!"
fi

# Make deposit
echo ""
echo "💰 Making deposit..."
cast send $CONTRACT \
    "deposit(uint256)" \
    $AMOUNT \
    --rpc-url $RPC \
    --private-key $PRIVATE_KEY

echo ""
echo "✅ Deposit successful!"

# Check total deposited
echo ""
echo "📈 Checking your total deposits..."
TOTAL=$(cast call $CONTRACT "getTotalDeposited(address)(uint256)" $YOUR_WALLET --rpc-url $RPC)
TOTAL_USDC=$(echo "scale=6; $TOTAL / 1000000" | bc)
echo "   Total deposited: $TOTAL_USDC USDC"

# Check deposit count
COUNT=$(cast call $CONTRACT "getDepositCount(address)(uint256)" $YOUR_WALLET --rpc-url $RPC)
echo "   Number of deposits: $COUNT"

echo ""
echo "🎉 Test complete!"

