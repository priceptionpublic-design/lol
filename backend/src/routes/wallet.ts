import { Router, Response } from 'express';
import { supabase, queryRow } from '../config/database';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = Router();

// Get wallet dashboard
router.get('/dashboard', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;

    // Get user
    const user = await queryRow('users', { id: userId });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get investments with pool data
    const { data: investments, error } = await supabase
      .from('investments')
      .select(`
        *,
        pool:pools (min_apy, max_apy)
      `)
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Calculate totals
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

    const totalValue = user.balance + totalStaked + totalEarnings;

    // Get recent transactions (deposit requests)
    const { data: deposits } = await supabase
      .from('deposit_requests')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);

    const transactions = (deposits || []).map((dep: any) => ({
      id: dep.id,
      type: 'DEPOSIT' as const,
      amount: dep.amount,
      status: dep.status.toUpperCase() as 'COMPLETED' | 'PENDING' | 'FAILED',
      date: dep.created_at,
    }));

    res.json({
      wallet: {
        publicKey: user.wallet_address,
        balance: user.balance,
        totalStaked,
        totalEarnings,
        totalValue,
      },
      investments: {
        active: investments || [],
        completed: [],
        totalCount: investments?.length || 0,
      },
      recentTransactions: transactions,
    });
  } catch (error) {
    console.error('Get dashboard error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Withdraw (placeholder - redirect to proper withdrawal system)
router.post('/withdraw', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    return res.status(400).json({ 
      error: 'Please use /withdrawals/request endpoint to create a withdrawal request',
      hint: 'Withdrawals require a 72-hour confirmation period'
    });
  } catch (error) {
    console.error('Withdraw error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
