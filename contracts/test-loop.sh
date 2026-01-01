#!/bin/bash

# Run multiple test deposits in a loop
# Usage: ./test-loop.sh <contract_address> <num_tests> <amount_per_test>
# Example: ./test-loop.sh 0x123... 10 0.1

set -e

if [ -z "$1" ] || [ -z "$2" ] || [ -z "$3" ]; then
    echo "Usage: ./test-loop.sh <contract_address> <num_tests> <amount_per_test>"
    echo ""
    echo "Examples:"
    echo "  ./test-loop.sh 0x123... 30 0.1    # 30 tests of 0.1 USDC each"
    echo "  ./test-loop.sh 0x123... 10 0.01   # 10 tests of 0.01 USDC each"
    echo ""
    exit 1
fi

CONTRACT=$1
NUM_TESTS=$2
AMOUNT_USDC=$3

# Calculate totals
TOTAL_USDC=$(echo "$NUM_TESTS * $AMOUNT_USDC" | bc)

echo "🧪 Running $NUM_TESTS test deposits"
echo "   Contract: $CONTRACT"
echo "   Amount per test: $AMOUNT_USDC USDC"
echo "   Total USDC needed: $TOTAL_USDC USDC"
echo ""

# Confirm
read -p "Continue? (y/N) " confirm
if [ "$confirm" != "y" ]; then
    echo "Cancelled."
    exit 0
fi

echo ""
echo "Starting tests..."
echo ""

# Run tests
for i in $(seq 1 $NUM_TESTS); do
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "Test #$i of $NUM_TESTS"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    ./test-deposit.sh $CONTRACT $AMOUNT_USDC
    
    if [ $i -lt $NUM_TESTS ]; then
        echo ""
        echo "⏳ Waiting 3 seconds before next test..."
        sleep 3
        echo ""
    fi
done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ All $NUM_TESTS tests completed!"
echo "   Total deposited: $TOTAL_USDC USDC"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

