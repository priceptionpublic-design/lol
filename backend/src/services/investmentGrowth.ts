import { supabase } from '../config/database';

let isRunning = false;
let intervalId: NodeJS.Timeout | null = null;

/**
 * Background job that calculates and updates investment earnings
 * Runs every minute to compound earnings based on APY
 */
export async function startInvestmentGrowthCalculator() {
  if (isRunning) {
    console.log('[INVESTMENT GROWTH] Already running');
    return;
  }

  isRunning = true;
  console.log('[INVESTMENT GROWTH] ✅ Started - calculating investment earnings');

  // Run immediately once
  await calculateAllInvestmentGrowth();

  // Then every 60 seconds
  intervalId = setInterval(async () => {
    await calculateAllInvestmentGrowth();
  }, 60000);
}

export function stopInvestmentGrowthCalculator() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    isRunning = false;
    console.log('[INVESTMENT GROWTH] Stopped');
  }
}

async function calculateAllInvestmentGrowth() {
  try {
    // Get all active investments
    const { data: investments, error } = await supabase
      .from('investments')
      .select('id, user_id, initial_amount, current_amount, apy_at_stake, last_calculated_at')
      .eq('is_active', true);

    if (error) {
      console.error('[INVESTMENT GROWTH] Error fetching investments:', error.message);
      
      // If column doesn't exist, it means migration hasn't been run yet
      if (error.message.includes('does not exist')) {
        console.log('[INVESTMENT GROWTH] ⚠️  Database not migrated yet. Run MIGRATION.sql in Supabase.');
        console.log('[INVESTMENT GROWTH] Stopping growth calculator until migration is complete.');
        // Stop the calculator
        stopInvestmentGrowthCalculator();
      }
      return;
    }

    if (!investments || investments.length === 0) {
      return; // No active investments
    }

    console.log(`[INVESTMENT GROWTH] Processing ${investments.length} active investments`);

    for (const investment of investments) {
      try {
        await calculateInvestmentGrowth(investment);
      } catch (error: any) {
        console.error(`[INVESTMENT GROWTH] Error calculating growth for investment ${investment.id}:`, error.message);
      }
    }
  } catch (error: any) {
    console.error('[INVESTMENT GROWTH] Error in calculateAllInvestmentGrowth:', error.message);
  }
}

async function calculateInvestmentGrowth(investment: any) {
  const now = new Date();
  const lastCalculated = new Date(investment.last_calculated_at);
  const hoursElapsed = (now.getTime() - lastCalculated.getTime()) / (1000 * 60 * 60);

  if (hoursElapsed < 0.016) {
    // Less than 1 minute elapsed, skip
    return;
  }

  // Calculate earnings based on APY
  // Formula: new_amount = current_amount * (1 + (APY / 100 / 365 / 24 * hours_elapsed))
  const apyDecimal = parseFloat(investment.apy_at_stake) / 100;
  const hourlyRate = apyDecimal / 365 / 24;
  const growthFactor = 1 + (hourlyRate * hoursElapsed);
  
  const currentAmount = parseFloat(investment.current_amount);
  const newAmount = currentAmount * growthFactor;
  const earned = newAmount - currentAmount;

  if (earned > 0.00000001) { // Only update if meaningful growth
    // Update investment
    await supabase
      .from('investments')
      .update({
        current_amount: newAmount,
        last_calculated_at: now.toISOString()
      })
      .eq('id', investment.id);

    // Update user's invested_balance
    const { data: user } = await supabase
      .from('users')
      .select('invested_balance')
      .eq('id', investment.user_id)
      .single();

    if (user) {
      const newInvestedBalance = parseFloat(user.invested_balance || '0') + earned;
      await supabase
        .from('users')
        .update({ invested_balance: newInvestedBalance })
        .eq('id', investment.user_id);
    }

    console.log(`[INVESTMENT GROWTH] Investment ${investment.id}: +$${earned.toFixed(8)} (${hoursElapsed.toFixed(2)}h @ ${investment.apy_at_stake}% APY)`);
  }
}

/**
 * Calculate earnings for a specific investment (on-demand)
 * Used when unstaking to get the final amount
 */
export async function calculateFinalEarnings(investmentId: string): Promise<number> {
  const { data: investment, error } = await supabase
    .from('investments')
    .select('*')
    .eq('id', investmentId)
    .single();

  if (error || !investment) {
    throw new Error('Investment not found');
  }

  // Calculate one final time
  await calculateInvestmentGrowth(investment);

  // Fetch updated amount
  const { data: updated } = await supabase
    .from('investments')
    .select('current_amount')
    .eq('id', investmentId)
    .single();

  return parseFloat(updated?.current_amount || investment.current_amount);
}

