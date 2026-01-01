import { Router, Response } from 'express';
import { supabase, queryRow, update } from '../config/database';
import { authenticateToken, requireAdmin, AuthRequest } from '../middleware/auth';

const router = Router();

// Make user admin
router.post('/make-admin', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    await update('users', { id: userId }, { role: 'admin' });

    res.json({ message: 'User is now an admin' });
  } catch (error) {
    console.error('Make admin error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all users
router.get('/users', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { data: users, error } = await supabase
      .from('users')
      .select('id, username, email, wallet_address, balance, role, created_at')
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({ users: users || [] });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get dashboard stats
router.get('/stats', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    // Get counts
    const { count: usersCount } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });

    const { count: depositsCount } = await supabase
      .from('deposit_requests')
      .select('*', { count: 'exact', head: true });

    const { count: pendingDepositsCount } = await supabase
      .from('deposit_requests')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');

    const { count: investmentsCount } = await supabase
      .from('investments')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);

    const { count: pendingWithdrawalsCount } = await supabase
      .from('withdrawal_requests')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');

    const { count: openTicketsCount } = await supabase
      .from('support_tickets')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'open');

    // Get total deposits value
    const { data: depositsSum } = await supabase
      .from('deposit_requests')
      .select('amount')
      .eq('status', 'verified');

    const totalDeposits = (depositsSum || []).reduce((sum: number, d: any) => sum + parseFloat(d.amount), 0);

    // Get total investments value
    const { data: investmentsSum } = await supabase
      .from('investments')
      .select('amount')
      .eq('is_active', true);

    const totalInvestments = (investmentsSum || []).reduce((sum: number, i: any) => sum + parseFloat(i.amount), 0);

    res.json({
      users: usersCount || 0,
      deposits: {
        total: depositsCount || 0,
        pending: pendingDepositsCount || 0,
        totalValue: totalDeposits
      },
      investments: {
        active: investmentsCount || 0,
        totalValue: totalInvestments
      },
      withdrawals: {
        pending: pendingWithdrawalsCount || 0
      },
      support: {
        openTickets: openTicketsCount || 0
      }
    });
  } catch (error) {
    console.error('Get admin stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
