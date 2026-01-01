import { Router, Response } from 'express';
import { supabase, queryRow, insert } from '../config/database';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = Router();

// Commission percentages for each level (1-7)
const COMMISSION_PERCENTAGES = {
  deposit: [5, 3, 2, 1.5, 1, 0.5, 0.5], // 5%, 3%, 2%, 1.5%, 1%, 0.5%, 0.5%
  investment: [3, 2, 1.5, 1, 0.5, 0.5, 0.5], // 3%, 2%, 1.5%, 1%, 0.5%, 0.5%, 0.5%
};

// Get user's referral code and stats
router.get('/stats', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;

    const user = await queryRow('users', { id: userId });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get downline stats
    const downlineStats = await getDownlineStats(userId);

    // Get total commissions earned from the database
    // totalEarned = commissions already claimed or pending
    const { data: commissions } = await supabase
      .from('referral_commissions')
      .select('commission_amount, status')
      .eq('referrer_id', userId);

    const totalEarned = (commissions || [])
      .filter((c: any) => c.status === 'claimed')
      .reduce((sum: number, c: any) => sum + parseFloat(c.commission_amount.toString()), 0) || 0;

    const pendingEarned = (commissions || [])
      .filter((c: any) => c.status === 'pending')
      .reduce((sum: number, c: any) => sum + parseFloat(c.commission_amount.toString()), 0) || 0;

    // Get direct referrals count
    const { count: directReferrals } = await supabase
      .from('users')
      .select('id', { count: 'exact', head: true })
      .eq('referrer_id', userId);

    res.json({
      referralCode: user.referral_code,
      stats: {
        directReferrals: directReferrals || 0,
        downlineByLevel: downlineStats || [],
        totalEarned,
        pendingEarned,
        totalCommissions: totalEarned + pendingEarned,
      },
    });
  } catch (error) {
    console.error('Get referral stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get referral network tree
router.get('/network', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;

    // Get downline tree
    const downlineStats = await getDownlineStats(userId);

    // Get direct referrals with details
    const { data: directReferrals } = await supabase
      .from('users')
      .select('id, username, email, referral_code, created_at')
      .eq('referrer_id', userId)
      .order('created_at', { ascending: false });

    // Get referral chain (upline)
    const upline = await getReferralChain(userId);

    res.json({
      upline: upline || [],
      downline: {
        direct: directReferrals || [],
        stats: downlineStats || [],
      },
    });
  } catch (error) {
    console.error('Get network error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get referral commissions history
router.get('/commissions', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { status, limit = 50 } = req.query;

    let query = supabase
      .from('referral_commissions')
      .select(`
        *,
        referred_user:users!referral_commissions_referred_user_id_fkey (id, username, email)
      `)
      .eq('referrer_id', userId)
      .order('created_at', { ascending: false })
      .limit(Number(limit));

    if (status) {
      query = query.eq('status', status);
    }

    const { data: commissions, error } = await query;

    if (error) throw error;

    res.json({ commissions: commissions || [] });
  } catch (error) {
    console.error('Get commissions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Function to calculate and distribute referral commissions
export async function calculateReferralCommissions(
  userId: string,
  amount: number,
  transactionId: string,
  type: 'deposit' | 'investment'
) {
  try {
    // Get referral chain (up to 7 levels)
    const referralChain = await getReferralChain(userId);

    if (!referralChain || referralChain.length === 0) {
      return; // No referrers
    }

    const commissions = [];
    const percentages = COMMISSION_PERCENTAGES[type];

    for (let i = 0; i < Math.min(referralChain.length, 7); i++) {
      const referrer = referralChain[i];
      const level = i + 1;
      const percentage = percentages[i] || 0;

      if (percentage > 0) {
        const commissionAmount = (amount * percentage) / 100;

        commissions.push({
          referrer_id: referrer.user_id,
          referred_user_id: userId,
          level,
          commission_type: type,
          transaction_id: transactionId,
          amount,
          commission_percentage: percentage,
          commission_amount: commissionAmount,
          status: 'pending',
        });
      }
    }

    if (commissions.length > 0) {
      const { error } = await supabase
        .from('referral_commissions')
        .insert(commissions);
      
      if (error) throw error;
    }
  } catch (error) {
    console.error('Calculate referral commissions error:', error);
  }
}

// Function to pay out commissions (call when deposit/investment is approved)
export async function payReferralCommissions(transactionId: string, type: 'deposit' | 'investment') {
  try {
    // Get pending commissions for this transaction
    const { data: commissions, error } = await supabase
      .from('referral_commissions')
      .select('*')
      .eq('transaction_id', transactionId)
      .eq('commission_type', type)
      .eq('status', 'pending');

    if (error) throw error;
    if (!commissions || commissions.length === 0) return;

    // Update commission status and add to user balance
    for (const commission of commissions) {
      // Update commission status
      await supabase
        .from('referral_commissions')
        .update({ status: 'paid', paid_at: new Date().toISOString() })
        .eq('id', commission.id);

      // Add commission to referrer's balance
      const { data: referrer } = await supabase
        .from('users')
        .select('balance')
        .eq('id', commission.referrer_id)
        .single();

      if (referrer) {
        await supabase
          .from('users')
          .update({ balance: referrer.balance + commission.commission_amount })
          .eq('id', commission.referrer_id);
      }
    }
  } catch (error) {
    console.error('Pay referral commissions error:', error);
  }
}

// Helper function to get referral chain (upline)
async function getReferralChain(userId: string): Promise<any[]> {
  const chain: any[] = [];
  let currentUserId: string | null = userId;
  let level = 0;

  while (currentUserId && level < 7) {
    const foundUser = await queryRow('users', { id: currentUserId });

    if (!foundUser || !foundUser.referrer_id) {
      break;
    }

    const referrer = await queryRow('users', { id: foundUser.referrer_id });

    if (!referrer) {
      break;
    }

    chain.push({
      level: level + 1,
      user_id: referrer.id,
      username: referrer.username,
      email: referrer.email,
      referral_code: referrer.referral_code,
    });
    currentUserId = referrer.id;
    level++;
  }

  return chain;
}

// Helper function to get downline stats
async function getDownlineStats(userId: string): Promise<any[]> {
  const stats: any[] = [];
  
  for (let level = 1; level <= 7; level++) {
    // Get users at this level
    let levelUsers: any[] = [];
    
    if (level === 1) {
      const { data } = await supabase
        .from('users')
        .select('id')
        .eq('referrer_id', userId);
      levelUsers = data || [];
    } else {
      // Get users whose referrer is in the previous level
      const prevLevelUsers = await getDownlineUsersAtLevel(userId, level - 1);
      if (prevLevelUsers.length === 0) break;
      
      const prevLevelIds = prevLevelUsers.map((u: any) => u.id);
      if (prevLevelIds.length > 0) {
        const { data } = await supabase
          .from('users')
          .select('id')
          .in('referrer_id', prevLevelIds);
        levelUsers = data || [];
      }
    }

    if (levelUsers.length === 0) break;

    const levelUserIds = levelUsers.map((u: any) => u.id);
    
    // Get total deposits from deposit_history
    const { data: depositsData } = await supabase
      .from('deposit_history')
      .select('amount')
      .in('user_id', levelUserIds);

    const totalDeposits = (depositsData || [])
      .reduce((sum: number, d: any) => sum + parseFloat(d.amount.toString()), 0);

    // Get total investments
    const { data: investmentsData } = await supabase
      .from('investments')
      .select('initial_amount')
      .in('user_id', levelUserIds)
      .eq('is_active', true);

    const totalInvestments = (investmentsData || [])
      .reduce((sum: number, i: any) => sum + parseFloat(i.initial_amount.toString()), 0);

    stats.push({
      level,
      count: levelUsers.length,
      total_deposits: totalDeposits,
      total_investments: totalInvestments,
    });
  }

  return stats;
}

// Helper function to get users at a specific level
async function getDownlineUsersAtLevel(userId: string, targetLevel: number): Promise<any[]> {
  if (targetLevel === 1) {
    const { data } = await supabase
      .from('users')
      .select('id')
      .eq('referrer_id', userId);
    return data || [];
  }

  const prevLevel = await getDownlineUsersAtLevel(userId, targetLevel - 1);
  if (prevLevel.length === 0) return [];

  const prevLevelIds = prevLevel.map((u: any) => u.id);
  const { data } = await supabase
    .from('users')
    .select('id')
    .in('referrer_id', prevLevelIds);
  
  return data || [];
}

export default router;
