import { Router, Response } from 'express';
import { supabase, queryRow, insert, update } from '../config/database';
import { authenticateToken, requireAdmin, AuthRequest } from '../middleware/auth';

const router = Router();

// Create withdrawal request
router.post('/request', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    console.log('[WITHDRAWALS] Create withdrawal request received');
    const { amount } = req.body;
    const userId = req.userId!;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Valid amount is required' });
    }

    // Get user balance and wallet address
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('vault_balance, wallet_address')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const vaultBalance = parseFloat(user.vault_balance || '0');

    if (vaultBalance < amount) {
      return res.status(400).json({ 
        error: 'Insufficient vault balance. Transfer from investment to vault first.',
        vaultBalance: vaultBalance,
        requested: amount
      });
    }

    // Use user's wallet address from their account
    const toAddress = user.wallet_address;

    // Create withdrawal request (doesn't deduct balance yet - only when admin approves)
    const { data: withdrawalRequest, error: insertError } = await supabase
      .from('withdrawal_requests')
      .insert({
        user_id: userId,
        amount,
        to_address: toAddress,
        status: 'pending',
        requested_at: new Date().toISOString()
      })
      .select()
      .single();

    if (insertError || !withdrawalRequest) {
      return res.status(500).json({ error: 'Failed to create withdrawal request' });
    }

    console.log('[WITHDRAWALS] Withdrawal request created:', withdrawalRequest.id);
    res.json({
      message: 'Withdrawal request submitted successfully. Admin will process it shortly.',
      withdrawalRequest: {
        id: withdrawalRequest.id,
        amount: withdrawalRequest.amount,
        toAddress: withdrawalRequest.to_address,
        status: withdrawalRequest.status,
        requestedAt: withdrawalRequest.requested_at,
        createdAt: withdrawalRequest.created_at,
      },
    });
  } catch (error) {
    console.error('[WITHDRAWALS] Create withdrawal error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user's withdrawal requests
router.get('/my-withdrawals', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;

    const { data: withdrawals, error } = await supabase
      .from('withdrawal_requests')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({ withdrawals: withdrawals || [] });
  } catch (error) {
    console.error('[WITHDRAWALS] Get withdrawals error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get pending withdrawals (admin only)
router.get('/pending', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { data: withdrawals, error } = await supabase
      .from('withdrawal_requests')
      .select(`
        *,
        user:users (id, username, email, wallet_address, vault_balance)
      `)
      .eq('status', 'pending')
      .order('requested_at', { ascending: true });

    if (error) throw error;

    res.json({ withdrawals: withdrawals || [] });
  } catch (error) {
    console.error('[WITHDRAWALS] Get pending withdrawals error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all withdrawals (admin only)
router.get('/all', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { status } = req.query;
    
    let query = supabase
      .from('withdrawal_requests')
      .select(`
        *,
        user:users (id, username, email, wallet_address),
        approved_by_user:users!withdrawal_requests_approved_by_fkey (username)
      `)
      .order('created_at', { ascending: false })
      .limit(100);

    if (status && typeof status === 'string') {
      query = query.eq('status', status);
    }

    const { data: withdrawals, error } = await query;

    if (error) throw error;

    res.json({ withdrawals: withdrawals || [] });
  } catch (error) {
    console.error('[WITHDRAWALS] Get all withdrawals error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Approve withdrawal (admin only) - Admin must provide transaction hash after manual transfer
router.post('/:id/approve', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { transactionHash } = req.body;
    const adminId = req.userId!;

    if (!transactionHash) {
      return res.status(400).json({ error: 'Transaction hash is required after completing the transfer' });
    }

    // Get withdrawal request
    const { data: withdrawal, error: withdrawalError } = await supabase
      .from('withdrawal_requests')
      .select('*')
      .eq('id', id)
      .single();

    if (withdrawalError || !withdrawal) {
      return res.status(404).json({ error: 'Withdrawal request not found' });
    }

    if (withdrawal.status !== 'pending') {
      return res.status(400).json({ error: 'Withdrawal request is not pending' });
    }

    // Get user's current vault balance
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('vault_balance')
      .eq('id', withdrawal.user_id)
      .single();

    if (userError || !user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const vaultBalance = parseFloat(user.vault_balance || '0');

    if (vaultBalance < parseFloat(withdrawal.amount.toString())) {
      return res.status(400).json({ error: 'User has insufficient vault balance' });
    }

    // Deduct from vault_balance
    await supabase
      .from('users')
      .update({ vault_balance: vaultBalance - parseFloat(withdrawal.amount.toString()) })
      .eq('id', withdrawal.user_id);

    // Update withdrawal request
    await supabase
      .from('withdrawal_requests')
      .update({
        status: 'approved',
        approved_at: new Date().toISOString(),
        approved_by: adminId,
        completed_at: new Date().toISOString(),
        transaction_hash: transactionHash
      })
      .eq('id', id);

    const { data: updatedWithdrawal } = await supabase
      .from('withdrawal_requests')
      .select('*')
      .eq('id', id)
      .single();

    console.log('[WITHDRAWALS] Withdrawal approved and processed:', id);
    res.json({
      message: 'Withdrawal approved and balance deducted successfully',
      withdrawal: updatedWithdrawal,
    });
  } catch (error) {
    console.error('[WITHDRAWALS] Approve withdrawal error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Reject withdrawal (admin only)
router.post('/:id/reject', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const adminId = req.userId!;

    // Get withdrawal request
    const { data: withdrawal, error: withdrawalError } = await supabase
      .from('withdrawal_requests')
      .select('*')
      .eq('id', id)
      .single();

    if (withdrawalError || !withdrawal) {
      return res.status(404).json({ error: 'Withdrawal request not found' });
    }

    if (withdrawal.status !== 'pending') {
      return res.status(400).json({ error: 'Withdrawal request is not pending' });
    }

    // Update withdrawal request
    await supabase
      .from('withdrawal_requests')
      .update({
        status: 'rejected',
        approved_by: adminId,
        rejection_reason: reason || 'Rejected by admin'
      })
      .eq('id', id);

    const { data: updatedWithdrawal } = await supabase
      .from('withdrawal_requests')
      .select('*')
      .eq('id', id)
      .single();

    console.log('[WITHDRAWALS] Withdrawal rejected:', id);
    res.json({
      message: 'Withdrawal rejected successfully',
      withdrawal: updatedWithdrawal,
    });
  } catch (error) {
    console.error('[WITHDRAWALS] Reject withdrawal error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
