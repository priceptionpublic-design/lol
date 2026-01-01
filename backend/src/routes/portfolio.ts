import { Router, Response } from 'express';
import { supabase, queryRow } from '../config/database';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = Router();

// Get portfolio history
router.get('/history', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const days = parseInt(req.query.days as string) || 7;
    console.log('[PORTFOLIO] Fetching history for user:', userId, 'days:', days);

    // Get user balance
    const user = await queryRow('users', { id: userId });

    if (!user) {
      console.log('[PORTFOLIO] User not found');
      return res.status(404).json({ error: 'User not found' });
    }

    // Get active investments with pool data
    const { data: investments, error } = await supabase
      .from('investments')
      .select(`
        *,
        pool:pools (min_apy, max_apy)
      `)
      .eq('user_id', userId)
      .eq('is_active', true);

    if (error) throw error;

    // Calculate current portfolio value
    let totalStaked = 0;
    let totalEarnings = 0;

    if (investments) {
      investments.forEach((inv: any) => {
        totalStaked += parseFloat(inv.amount.toString());
        const stakedAt = new Date(inv.staked_at);
        const now = new Date();
        const durationDays = (now.getTime() - stakedAt.getTime()) / (1000 * 60 * 60 * 24);
        const avgApy = (parseFloat(inv.pool.min_apy.toString()) + parseFloat(inv.pool.max_apy.toString())) / 2;
        const apyDecimal = avgApy / 100;
        const earnedAmount = parseFloat(inv.amount.toString()) * apyDecimal * (durationDays / 365);
        totalEarnings += earnedAmount;
      });
    }

    const currentValue = parseFloat(user.balance.toString()) + totalStaked + totalEarnings;

    // Generate historical data points
    const history: Array<{ value: number; date: string; label?: string }> = [];
    const now = new Date();
    
    for (let i = days; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      
      // Calculate value for this date (simplified - assumes linear growth)
      const daysAgo = days - i;
      const growthFactor = totalStaked > 0 ? 1 + (totalEarnings / totalStaked) * (daysAgo / days) : 1;
      const historicalValue = parseFloat(user.balance.toString()) + totalStaked * growthFactor;
      
      history.push({
        value: Math.max(historicalValue, parseFloat(user.balance.toString())),
        date: date.toISOString(),
        label: i === 0 ? 'Today' : i === days ? `${days} days ago` : undefined,
      });
    }

    // Calculate change
    const previousValue = history[0]?.value || currentValue;
    const changeAmount = currentValue - previousValue;
    const changePercentage = previousValue > 0 ? (changeAmount / previousValue) * 100 : 0;

    console.log('[PORTFOLIO] History generated:', history.length, 'points');
    console.log('[PORTFOLIO] Current value:', currentValue, 'Change:', changeAmount);

    res.json({
      history,
      currentValue,
      change: {
        amount: changeAmount,
        percentage: changePercentage,
      },
    });
  } catch (error: any) {
    console.error('[PORTFOLIO] Get history error:', error);
    console.error('[PORTFOLIO] Get history error stack:', error?.stack);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
