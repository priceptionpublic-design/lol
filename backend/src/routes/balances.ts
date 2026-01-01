import { Router, Response } from 'express';
import { supabase } from '../config/database';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = Router();

/**
 * Transfer money between vault and investment
 * POST /balances/transfer
 */
router.post('/transfer', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { from, to, amount } = req.body;
    const userId = req.userId!;

    if (!from || !to || !amount) {
      return res.status(400).json({ error: 'Missing required fields: from, to, amount' });
    }

    if (from === to) {
      return res.status(400).json({ error: 'Cannot transfer to the same balance' });
    }

    if (!['vault', 'investment'].includes(from) || !['vault', 'investment'].includes(to)) {
      return res.status(400).json({ error: 'Invalid balance type. Must be vault or investment' });
    }

    const transferAmount = parseFloat(amount);
    if (isNaN(transferAmount) || transferAmount <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    // Get user balances
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('vault_balance, invested_balance')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const fromBalance = from === 'vault' ? parseFloat(user.vault_balance || '0') : parseFloat(user.invested_balance || '0');

    if (fromBalance < transferAmount) {
      return res.status(400).json({ error: 'Insufficient balance' });
    }

    // Calculate new balances
    const newFromBalance = fromBalance - transferAmount;
    const toBalance = to === 'vault' ? parseFloat(user.vault_balance || '0') : parseFloat(user.invested_balance || '0');
    const newToBalance = toBalance + transferAmount;

    // Update user balances
    const updateData: any = {};
    if (from === 'vault') {
      updateData.vault_balance = newFromBalance;
      updateData.invested_balance = newToBalance;
    } else {
      updateData.invested_balance = newFromBalance;
      updateData.vault_balance = newToBalance;
    }

    const { error: updateError } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', userId);

    if (updateError) {
      return res.status(500).json({ error: 'Failed to update balances' });
    }

    // Record the transfer
    await supabase.from('balance_transfers').insert({
      user_id: userId,
      from_balance: from,
      to_balance: to,
      amount: transferAmount
    });

    res.json({
      message: 'Transfer successful',
      from,
      to,
      amount: transferAmount,
      newBalances: {
        vault: from === 'vault' ? newFromBalance : newToBalance,
        invested: from === 'investment' ? newFromBalance : newToBalance
      }
    });
  } catch (error: any) {
    console.error('[BALANCE TRANSFER] Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Get current balances
 * GET /balances/me
 */
router.get('/me', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;

    const { data: user, error } = await supabase
      .from('users')
      .select('vault_balance, invested_balance, referral_balance')
      .eq('id', userId)
      .single();

    if (error || !user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const vaultBalance = parseFloat(user.vault_balance || '0');
    const investedBalance = parseFloat(user.invested_balance || '0');
    const referralBalance = parseFloat(user.referral_balance || '0');

    res.json({
      vault: vaultBalance,
      invested: investedBalance,
      referral: referralBalance,
      total: vaultBalance + investedBalance + referralBalance
    });
  } catch (error: any) {
    console.error('[BALANCE] Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Get transfer history
 * GET /balances/transfers
 */
router.get('/transfers', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;

    const { data: transfers, error } = await supabase
      .from('balance_transfers')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      return res.status(500).json({ error: 'Failed to fetch transfers' });
    }

    res.json({ transfers: transfers || [] });
  } catch (error: any) {
    console.error('[BALANCE TRANSFERS] Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Claim referral earnings (minimum $100)
 * POST /balances/claim-referral
 */
router.post('/claim-referral', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;

    // Get user referral balance
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('referral_balance, vault_balance')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const referralBalance = parseFloat(user.referral_balance || '0');

    if (referralBalance < 100) {
      return res.status(400).json({ 
        error: 'Minimum claim amount is $100',
        current: referralBalance,
        required: 100,
        remaining: 100 - referralBalance
      });
    }

    // Transfer referral balance to vault
    const newReferralBalance = 0;
    const newVaultBalance = parseFloat(user.vault_balance || '0') + referralBalance;

    const { error: updateError } = await supabase
      .from('users')
      .update({
        referral_balance: newReferralBalance,
        vault_balance: newVaultBalance
      })
      .eq('id', userId);

    if (updateError) {
      return res.status(500).json({ error: 'Failed to claim referral earnings' });
    }

    // Update all pending referral commissions to claimed
    await supabase
      .from('referral_commissions')
      .update({ 
        status: 'claimed',
        claimed_at: new Date().toISOString()
      })
      .eq('referrer_id', userId)
      .eq('status', 'pending');

    res.json({
      message: 'Referral earnings claimed successfully',
      claimed: referralBalance,
      newVaultBalance: newVaultBalance,
      newReferralBalance: 0
    });
  } catch (error: any) {
    console.error('[CLAIM REFERRAL] Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

