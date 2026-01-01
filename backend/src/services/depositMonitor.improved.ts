import { supabase, queryRow, insert } from '../config/database';
import { ethers } from 'ethers';

let isRunning = false;
let intervalId: NodeJS.Timeout | null = null;

const DEPOSIT_ABI = [
  'event DepositMade(address indexed user, uint256 amount, uint256 timestamp, uint256 depositIndex)',
  'function getTotalDeposited(address user) external view returns (uint256)',
  'function getDepositCount(address user) external view returns (uint256)'
];

const REORG_SAFETY_BLOCKS = 12; // Don't consider blocks final until 12 confirmations
const MAX_RETRY_ATTEMPTS = 3;
const BATCH_SIZE = 100;

/**
 * Background job that monitors the deposit contract for DepositMade events
 * Creates records in web2 database for easy querying
 * 
 * IMPROVEMENTS:
 * 1. Persists last processed block to database
 * 2. Handles chain reorganizations
 * 3. Retries failed scans
 * 4. Transaction-based event processing
 * 5. Reorg detection and recovery
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

  // Initialize monitor state table
  await initializeMonitorState();

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

/**
 * Initialize monitor state in database
 */
async function initializeMonitorState() {
  try {
    // Check if state exists
    const { data: existing } = await supabase
      .from('monitor_state')
      .select('last_processed_block')
      .eq('contract_address', process.env.DEPOSIT_CONTRACT_ADDRESS)
      .single();

    if (!existing) {
      // Create initial state
      const provider = new ethers.JsonRpcProvider(process.env.BSC_RPC_URL);
      const currentBlock = await provider.getBlockNumber();

      await supabase
        .from('monitor_state')
        .insert({
          contract_address: process.env.DEPOSIT_CONTRACT_ADDRESS,
          last_processed_block: currentBlock,
          last_updated: new Date().toISOString()
        });

      console.log(`[DEPOSIT MONITOR] Initialized from block ${currentBlock}`);
    } else {
      console.log(`[DEPOSIT MONITOR] Resuming from block ${existing.last_processed_block}`);
    }
  } catch (error: any) {
    console.error('[DEPOSIT MONITOR] Error initializing state:', error.message);
  }
}

/**
 * Get last processed block from database
 */
async function getLastProcessedBlock(): Promise<number> {
  try {
    const { data, error } = await supabase
      .from('monitor_state')
      .select('last_processed_block')
      .eq('contract_address', process.env.DEPOSIT_CONTRACT_ADDRESS)
      .single();

    if (error || !data) {
      const provider = new ethers.JsonRpcProvider(process.env.BSC_RPC_URL);
      return await provider.getBlockNumber();
    }

    return data.last_processed_block;
  } catch (error) {
    const provider = new ethers.JsonRpcProvider(process.env.BSC_RPC_URL);
    return await provider.getBlockNumber();
  }
}

/**
 * Update last processed block in database (atomic)
 */
async function updateLastProcessedBlock(blockNumber: number) {
  await supabase
    .from('monitor_state')
    .update({
      last_processed_block: blockNumber,
      last_updated: new Date().toISOString()
    })
    .eq('contract_address', process.env.DEPOSIT_CONTRACT_ADDRESS);
}

async function monitorDeposits() {
  let retryCount = 0;

  while (retryCount < MAX_RETRY_ATTEMPTS) {
    try {
      const provider = new ethers.JsonRpcProvider(process.env.BSC_RPC_URL);
      const contract = new ethers.Contract(
        process.env.DEPOSIT_CONTRACT_ADDRESS!,
        DEPOSIT_ABI,
        provider
      );

      const currentBlock = await provider.getBlockNumber();
      const lastProcessedBlock = await getLastProcessedBlock();
      
      // Leave REORG_SAFETY_BLOCKS for finality
      const safeCurrentBlock = currentBlock - REORG_SAFETY_BLOCKS;
      
      if (safeCurrentBlock <= lastProcessedBlock) {
        return; // No new finalized blocks
      }

      // Scan in batches
      const fromBlock = lastProcessedBlock + 1;
      const toBlock = Math.min(fromBlock + BATCH_SIZE, safeCurrentBlock);

      console.log(`[DEPOSIT MONITOR] Scanning blocks ${fromBlock} to ${toBlock} (current: ${currentBlock})`);

      // Check for reorg - verify last processed block still exists
      if (lastProcessedBlock > 0) {
        await detectAndHandleReorg(provider, lastProcessedBlock);
      }

      // Query DepositMade events
      const filter = contract.filters.DepositMade();
      const events = await contract.queryFilter(filter, fromBlock, toBlock);

      if (events.length > 0) {
        console.log(`[DEPOSIT MONITOR] Found ${events.length} new deposits`);

        // Process all events in a transaction-like manner
        const processedEvents = [];
        for (const event of events) {
          try {
            const result = await processDepositEvent(event);
            if (result) {
              processedEvents.push(event);
            }
          } catch (error: any) {
            console.error(`[DEPOSIT MONITOR] Error processing event:`, error.message);
            // Don't update lastProcessedBlock if any event fails
            throw error;
          }
        }

        console.log(`[DEPOSIT MONITOR] Successfully processed ${processedEvents.length} deposits`);
      }

      // Only update if all events processed successfully
      await updateLastProcessedBlock(toBlock);
      
      // Success - exit retry loop
      return;

    } catch (error: any) {
      retryCount++;
      
      // Rate limit error - back off
      if (error.message && error.message.includes('rate limit')) {
        console.log(`[DEPOSIT MONITOR] Rate limited, backing off for 30s... (attempt ${retryCount}/${MAX_RETRY_ATTEMPTS})`);
        await new Promise(resolve => setTimeout(resolve, 30000));
      } else {
        console.error(`[DEPOSIT MONITOR] Error in monitorDeposits (attempt ${retryCount}/${MAX_RETRY_ATTEMPTS}):`, error.message);
        
        if (retryCount < MAX_RETRY_ATTEMPTS) {
          // Exponential backoff
          const backoffMs = 1000 * Math.pow(2, retryCount);
          console.log(`[DEPOSIT MONITOR] Retrying in ${backoffMs}ms...`);
          await new Promise(resolve => setTimeout(resolve, backoffMs));
        }
      }
    }
  }

  console.error('[DEPOSIT MONITOR] Max retry attempts reached, will try again in next interval');
}

/**
 * Detect and handle chain reorganizations
 */
async function detectAndHandleReorg(provider: ethers.JsonRpcProvider, lastProcessedBlock: number) {
  try {
    // Try to get the last processed block
    const block = await provider.getBlock(lastProcessedBlock);
    
    if (!block) {
      console.warn(`[DEPOSIT MONITOR] ⚠️  Block ${lastProcessedBlock} not found - possible reorg!`);
      
      // Rewind to safe block
      const safeBlock = Math.max(0, lastProcessedBlock - REORG_SAFETY_BLOCKS * 2);
      console.log(`[DEPOSIT MONITOR] Rewinding to block ${safeBlock} for rescan`);
      
      // Delete deposits from potentially reorged blocks
      await supabase
        .from('deposit_history')
        .delete()
        .gte('block_number', safeBlock);
      
      // Update state to rescan
      await updateLastProcessedBlock(safeBlock);
    }
  } catch (error: any) {
    console.error('[DEPOSIT MONITOR] Error detecting reorg:', error.message);
  }
}

async function processDepositEvent(event: any): Promise<boolean> {
  const userAddress = event.args.user.toLowerCase();
  const amount = event.args.amount.toString();
  const timestamp = event.args.timestamp.toString();
  const depositIndex = event.args.depositIndex.toString();
  const txHash = event.transactionHash;
  const blockNumber = event.blockNumber;

  // Check if already processed (idempotency)
  const { data: existing } = await supabase
    .from('deposit_history')
    .select('id')
    .eq('transaction_hash', txHash)
    .eq('deposit_index', depositIndex)
    .single();

  if (existing) {
    console.log(`[DEPOSIT MONITOR] Deposit already recorded: ${txHash}`);
    return true; // Already processed, skip
  }

  // Find user by wallet address
  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('wallet_address', userAddress)
    .single();

  if (!user) {
    console.log(`[DEPOSIT MONITOR] User not registered for wallet ${userAddress}`);
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

  const { error } = await supabase
    .from('deposit_history')
    .insert(depositRecord);

  if (error) {
    console.error(`[DEPOSIT MONITOR] Error inserting deposit:`, error);
    throw error; // Propagate error to trigger retry
  }

  console.log(`[DEPOSIT MONITOR] ✅ Recorded deposit: ${amountInUsdc} USDC from ${userAddress} (tx: ${txHash})`);
  
  return true;
}

