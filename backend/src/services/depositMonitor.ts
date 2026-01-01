import { supabase, queryRow, insert } from '../config/database';
import { ethers } from 'ethers';

let isRunning = false;
let intervalId: NodeJS.Timeout | null = null;
let lastProcessedBlock = 0;

const DEPOSIT_ABI = [
  'event DepositMade(address indexed user, uint256 amount, uint256 timestamp, uint256 depositIndex)',
  'function getTotalDeposited(address user) external view returns (uint256)',
  'function getDepositCount(address user) external view returns (uint256)'
];

/**
 * Background job that monitors the deposit contract for DepositMade events
 * Creates records in web2 database for easy querying
 */
export async function startDepositMonitor() {
  if (isRunning) {
    console.log('[DEPOSIT MONITOR] Already running');
    return;
  }

  if (!process.env.DEPOSIT_CONTRACT_ADDRESS) {
    console.log('[DEPOSIT MONITOR] ⚠️  Contract address not configured, monitor disabled');
    return;
  }

  if (!process.env.BSC_RPC_URL) {
    console.log('[DEPOSIT MONITOR] ⚠️  BSC_RPC_URL not configured, monitor disabled');
    return;
  }

  isRunning = true;
  console.log('[DEPOSIT MONITOR] ✅ Started - monitoring contract events');

  // Get last processed block from database
  try {
    const { data, error } = await supabase
      .from('deposit_history')
      .select('block_number')
      .order('block_number', { ascending: false })
      .limit(1);

    if (!error && data && data.length > 0) {
      lastProcessedBlock = data[0].block_number;
      console.log(`[DEPOSIT MONITOR] Resuming from block ${lastProcessedBlock}`);
    }
  } catch (error) {
    console.log('[DEPOSIT MONITOR] Starting from current block');
  }

  // Run immediately once
  await monitorDeposits();

  // Then every 10 seconds
  intervalId = setInterval(async () => {
    await monitorDeposits();
  }, 10000);
}

export function stopDepositMonitor() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    isRunning = false;
    console.log('[DEPOSIT MONITOR] Stopped');
  }
}

async function monitorDeposits() {
  try {
    const provider = new ethers.JsonRpcProvider(process.env.BSC_RPC_URL);
    const contract = new ethers.Contract(
      process.env.DEPOSIT_CONTRACT_ADDRESS!,
      DEPOSIT_ABI,
      provider
    );

    const currentBlock = await provider.getBlockNumber();
    
    // Start from current block if first run (don't scan history)
    const fromBlock = lastProcessedBlock === 0 ? currentBlock : lastProcessedBlock + 1;
    
    // Scan max 100 blocks at a time to avoid rate limits
    const toBlock = Math.min(fromBlock + 100, currentBlock);

    if (fromBlock > currentBlock) {
      return; // No new blocks
    }

    // Query DepositMade events
    const filter = contract.filters.DepositMade();
    const events = await contract.queryFilter(filter, fromBlock, toBlock);

    if (events.length > 0) {
      console.log(`[DEPOSIT MONITOR] Found ${events.length} new deposits from block ${fromBlock} to ${toBlock}`);

      for (const event of events) {
        try {
          await processDepositEvent(event);
        } catch (error: any) {
          console.error(`[DEPOSIT MONITOR] Error processing event:`, error.message);
        }
      }
    }

    lastProcessedBlock = toBlock;
  } catch (error: any) {
    // Rate limit error - back off
    if (error.message && error.message.includes('rate limit')) {
      console.log('[DEPOSIT MONITOR] Rate limited, backing off for 30s...');
      await new Promise(resolve => setTimeout(resolve, 30000));
    } else {
      console.error('[DEPOSIT MONITOR] Error in monitorDeposits:', error.message);
    }
  }
}

async function processDepositEvent(event: any) {
  const userAddress = event.args.user.toLowerCase();
  const amount = event.args.amount.toString();
  const timestamp = event.args.timestamp.toString();
  const depositIndex = event.args.depositIndex.toString();
  const txHash = event.transactionHash;
  const blockNumber = event.blockNumber;

  // Check if already processed
  const { data: existing } = await supabase
    .from('deposit_history')
    .select('id')
    .eq('transaction_hash', txHash)
    .eq('deposit_index', depositIndex)
    .single();

  if (existing) {
    console.log(`[DEPOSIT MONITOR] Deposit already recorded: ${txHash}`);
    return;
  }

  // Find user by wallet address
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('id, vault_balance')
    .eq('wallet_address', userAddress)
    .single();

  if (userError || !user) {
    console.log(`[DEPOSIT MONITOR] User not found for wallet ${userAddress}`);
    // Still record the deposit, but without user_id
  }

  // Convert USDC amount (6 decimals) to human-readable
  const amountInUsdc = parseFloat(ethers.formatUnits(amount, 6));

  // Create deposit history record
  const depositRecord = {
    user_id: user?.id || null,
    wallet_address: userAddress,
    amount: amountInUsdc,
    transaction_hash: txHash,
    block_number: blockNumber,
    deposit_index: parseInt(depositIndex),
    timestamp: new Date(parseInt(timestamp) * 1000).toISOString(),
    created_at: new Date().toISOString()
  };

  await insert('deposit_history', depositRecord);

  // Credit user's vault balance
  if (user) {
    const newVaultBalance = parseFloat(user.vault_balance || '0') + amountInUsdc;
    await supabase
      .from('users')
      .update({ vault_balance: newVaultBalance })
      .eq('id', user.id);
    
    console.log(`[DEPOSIT MONITOR] ✅ Credited ${amountInUsdc} USDC to vault for user ${user.id}`);
  }

  console.log(`[DEPOSIT MONITOR] ✅ Recorded deposit: ${amountInUsdc} USDC from ${userAddress} (tx: ${txHash})`);
}

