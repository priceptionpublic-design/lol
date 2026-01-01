import { Router, Response } from 'express';
import { supabase, queryRow, insert } from '../config/database';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { calculateReferralCommissions, payReferralCommissions } from './referrals';

const router = Router();

// Get user's investments
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;

    const { data: investments, error } = await supabase
      .from('investments')
      .select(`
        *,
        pool:pools (id, name, risk_level, min_apy, max_apy)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Calculate earnings for each investment
    const formattedInvestments = (investments || []).map((inv: any) => {
      const stakedAt = new Date(inv.staked_at);
      const now = new Date();
      const durationMs = now.getTime() - stakedAt.getTime();
      const durationHours = durationMs / (1000 * 60 * 60);
      const durationDays = durationHours / 24;

      const avgApy = (parseFloat(inv.pool.min_apy.toString()) + parseFloat(inv.pool.max_apy.toString())) / 2;
      const apyDecimal = avgApy / 100;
      const earnedAmount = inv.amount * apyDecimal * (durationDays / 365);
      const currentValue = inv.amount + earnedAmount;
      const percentageGain = (earnedAmount / inv.amount) * 100;

      let riskLabel: string;
      if (inv.pool.risk_level === 'low') {
        riskLabel = 'Low Risk';
      } else if (inv.pool.risk_level === 'mid') {
        riskLabel = 'Medium Risk';
      } else {
        riskLabel = 'High Risk';
      }

      return {
        id: inv.id,
        pool: {
          id: inv.pool.id,
          pair: `${inv.pool.name} Pool`,
          symbol: inv.pool.name,
          protocol: 'Yieldium',
          risk: riskLabel,
          apy: `${inv.pool.min_apy}% - ${inv.pool.max_apy}%`,
          apyValue: avgApy,
          tvl: '$0',
          volume: '$0',
          gradient: inv.pool.risk_level === 'low' ? ['#10B981', '#059669'] : inv.pool.risk_level === 'mid' ? ['#F59E0B', '#D97706'] : ['#EF4444', '#DC2626'],
          riskColor: inv.pool.risk_level === 'low' ? { bg: '#D1FAE5', text: '#065F46' } : inv.pool.risk_level === 'mid' ? { bg: '#FEF3C7', text: '#92400E' } : { bg: '#FEE2E2', text: '#991B1B' },
        },
        stakedAmount: inv.amount,
        stakedAt: inv.staked_at,
        isActive: inv.is_active,
        earnings: {
          durationHours,
          durationDays,
          earnedAmount,
          currentValue,
          percentageGain,
        },
      };
    });

    // Calculate summary
    const totalStaked = formattedInvestments.reduce((sum: number, inv: any) => sum + inv.stakedAmount, 0);
    const totalEarnings = formattedInvestments.reduce((sum: number, inv: any) => sum + inv.earnings.earnedAmount, 0);
    const totalValue = formattedInvestments.reduce((sum: number, inv: any) => sum + inv.earnings.currentValue, 0);

    res.json({
      investments: formattedInvestments,
      summary: {
        totalInvestments: formattedInvestments.length,
        totalStaked,
        totalEarnings,
        totalValue,
      },
    });
  } catch (error) {
    console.error('Get investments error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get investment by ID
router.get('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.userId!;

    const { data: investment, error } = await supabase
      .from('investments')
      .select(`
        *,
        pool:pools (id, name, risk_level, min_apy, max_apy)
      `)
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (error || !investment) {
      return res.status(404).json({ error: 'Investment not found' });
    }

    const stakedAt = new Date(investment.staked_at);
    const now = new Date();
    const durationMs = now.getTime() - stakedAt.getTime();
    const durationHours = durationMs / (1000 * 60 * 60);
    const durationDays = durationHours / 24;

    const avgApy = (parseFloat(investment.pool.min_apy.toString()) + parseFloat(investment.pool.max_apy.toString())) / 2;
    const apyDecimal = avgApy / 100;
    const earnedAmount = investment.amount * apyDecimal * (durationDays / 365);
    const currentValue = investment.amount + earnedAmount;
    const percentageGain = (earnedAmount / investment.amount) * 100;

    let riskLabel: string;
    if (investment.pool.risk_level === 'low') {
      riskLabel = 'Low Risk';
    } else if (investment.pool.risk_level === 'mid') {
      riskLabel = 'Medium Risk';
    } else {
      riskLabel = 'High Risk';
    }

    res.json({
      investment: {
        id: investment.id,
        pool: {
          id: investment.pool.id,
          pair: `${investment.pool.name} Pool`,
          symbol: investment.pool.name,
          protocol: 'Yieldium',
          risk: riskLabel,
          apy: `${investment.pool.min_apy}% - ${investment.pool.max_apy}%`,
          apyValue: avgApy,
          tvl: '$0',
          volume: '$0',
          gradient: investment.pool.risk_level === 'low' ? ['#10B981', '#059669'] : investment.pool.risk_level === 'mid' ? ['#F59E0B', '#D97706'] : ['#EF4444', '#DC2626'],
          riskColor: investment.pool.risk_level === 'low' ? { bg: '#D1FAE5', text: '#065F46' } : investment.pool.risk_level === 'mid' ? { bg: '#FEF3C7', text: '#92400E' } : { bg: '#FEE2E2', text: '#991B1B' },
        },
        stakedAmount: investment.amount,
        stakedAt: investment.staked_at,
        isActive: investment.is_active,
        earnings: {
          durationHours,
          durationDays,
          earnedAmount,
          currentValue,
          percentageGain,
        },
      },
    });
  } catch (error) {
    console.error('Get investment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create investment
router.post('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { poolId, amount } = req.body;
    const userId = req.userId!;

    if (!poolId || !amount || amount <= 0) {
      return res.status(400).json({ error: 'Valid poolId and amount are required' });
    }

    // Check user balances (prefer invested_balance, fallback to vault_balance)
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('invested_balance, vault_balance')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const investedBalance = parseFloat(user.invested_balance?.toString() || '0');
    const vaultBalance = parseFloat(user.vault_balance?.toString() || '0');
    const totalAvailable = investedBalance + vaultBalance;

    if (totalAvailable < amount) {
      return res.status(400).json({ error: `Insufficient balance. Available: $${totalAvailable.toFixed(2)}` });
    }

    // Auto-transfer from vault to investment if needed
    if (investedBalance < amount) {
      const transferNeeded = amount - investedBalance;
      const newVaultBalance = vaultBalance - transferNeeded;
      const newInvestedBalance = investedBalance + transferNeeded;

      await supabase
        .from('users')
        .update({
          vault_balance: newVaultBalance,
          invested_balance: newInvestedBalance,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      // Record the transfer
      await supabase.from('balance_transfers').insert({
        user_id: userId,
        from_balance_type: 'vault',
        to_balance_type: 'investment',
        amount: transferNeeded,
        status: 'completed',
      });
    }

    // Check pool exists
    const pool = await queryRow('pools', { id: poolId });

    if (!pool) {
      return res.status(404).json({ error: 'Pool not found' });
    }

    // Get updated invested_balance (after potential auto-transfer)
    const { data: updatedUser } = await supabase
      .from('users')
      .select('invested_balance')
      .eq('id', userId)
      .single();

    const currentInvestedBalance = parseFloat(updatedUser?.invested_balance?.toString() || '0');

    // Deduct from invested_balance
    const newInvestedBalance = currentInvestedBalance - amount;
    await supabase
      .from('users')
      .update({ invested_balance: newInvestedBalance, updated_at: new Date().toISOString() })
      .eq('id', userId);

    // Create investment
    const investment = await insert('investments', {
      user_id: userId,
      pool_id: poolId,
      amount,
      staked_at: new Date().toISOString(),
      is_active: true
    });

    // Calculate and pay referral commissions
    await calculateReferralCommissions(userId, amount, investment.id, 'investment');
    await payReferralCommissions(investment.id, 'investment');

    res.json({
      message: 'Investment created successfully',
      investment,
    });
  } catch (error) {
    console.error('Create investment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Unstake investment
router.delete('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.userId!;

    // Get investment with pool data
    const { data: investment, error } = await supabase
      .from('investments')
      .select(`
        *,
        pool:pools (min_apy, max_apy)
      `)
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (error || !investment) {
      return res.status(404).json({ error: 'Investment not found' });
    }

    if (!investment.is_active) {
      return res.status(400).json({ error: 'Investment is already unstaked' });
    }

    // Calculate returns
    const stakedAt = new Date(investment.staked_at);
    const now = new Date();
    const durationMs = now.getTime() - stakedAt.getTime();
    const durationDays = durationMs / (1000 * 60 * 60 * 24);

    const avgApy = (parseFloat(investment.pool.min_apy.toString()) + parseFloat(investment.pool.max_apy.toString())) / 2;
    const apyDecimal = avgApy / 100;
    const earnedAmount = investment.amount * apyDecimal * (durationDays / 365);
    const totalReturn = investment.amount + earnedAmount;

    // Update investment
    await supabase
      .from('investments')
      .update({ is_active: false })
      .eq('id', id);

    // Return funds to user invested_balance (so they can reinvest or transfer to vault)
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('invested_balance')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const currentInvestedBalance = parseFloat(user.invested_balance?.toString() || '0');
    const newInvestedBalance = currentInvestedBalance + totalReturn;

    await supabase
      .from('users')
      .update({ invested_balance: newInvestedBalance, updated_at: new Date().toISOString() })
      .eq('id', userId);

    res.json({
      message: 'Investment unstaked successfully',
      returnedAmount: totalReturn,
      earnedAmount,
    });
  } catch (error) {
    console.error('Unstake investment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
