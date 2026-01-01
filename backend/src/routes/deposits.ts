import { Router, Response } from 'express';
import { supabase } from '../config/database';
import { authenticateToken, requireAdmin, AuthRequest } from '../middleware/auth';
import { getContractConfig } from '../services/contractService';

const router = Router();

// Get contract configuration
router.get('/contract-info', async (req, res: Response) => {
  try {
    const config = getContractConfig();
    res.json(config);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get user's deposit history
router.get('/my-history', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    
    // Get user's wallet address
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('wallet_address')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get deposit history for this wallet
    const { data: deposits, error } = await supabase
      .from('deposit_history')
      .select('*')
      .eq('wallet_address', user.wallet_address.toLowerCase())
      .order('timestamp', { ascending: false });

    if (error) throw error;

    res.json({ 
      deposits: deposits || [],
      walletAddress: user.wallet_address
    });
  } catch (error: any) {
    console.error('[DEPOSITS] Get history error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get deposit statistics for user
router.get('/my-stats', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('wallet_address')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get total deposited
    const { data: deposits, error } = await supabase
      .from('deposit_history')
      .select('amount')
      .eq('wallet_address', user.wallet_address.toLowerCase());

    if (error) throw error;

    const totalDeposited = deposits?.reduce((sum, d) => sum + parseFloat(d.amount), 0) || 0;
    const depositCount = deposits?.length || 0;

    res.json({ 
      totalDeposited,
      depositCount,
      walletAddress: user.wallet_address
    });
  } catch (error: any) {
    console.error('[DEPOSITS] Get stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin: Get all deposit history
router.get('/all-history', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { limit = 100, offset = 0 } = req.query;

    const { data: deposits, error } = await supabase
      .from('deposit_history')
      .select(`
        *,
        users (id, username, email)
      `)
      .order('timestamp', { ascending: false })
      .range(parseInt(offset as string), parseInt(offset as string) + parseInt(limit as string) - 1);

    if (error) throw error;

    res.json({ deposits: deposits || [] });
  } catch (error: any) {
    console.error('[DEPOSITS] Get all history error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin: Get deposit statistics
router.get('/stats', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    // Total deposits
    const { data: deposits, error } = await supabase
      .from('deposit_history')
      .select('amount');

    if (error) throw error;

    const totalDeposited = deposits?.reduce((sum, d) => sum + parseFloat(d.amount), 0) || 0;
    const depositCount = deposits?.length || 0;

    // Unique depositors
    const uniqueWallets = new Set(deposits?.map(d => d.wallet_address) || []).size;

    res.json({
      totalDeposited,
      depositCount,
      uniqueDepositors: uniqueWallets
    });
  } catch (error: any) {
    console.error('[DEPOSITS] Get stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
