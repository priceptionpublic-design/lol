import { Router, Response } from 'express';
import { supabase, queryRow, queryRows, insert, update } from '../config/database';
import { authenticateToken, requireAdmin, AuthRequest } from '../middleware/auth';

const router = Router();

// Create support ticket
router.post('/tickets', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { subject, description, depositId, transactionHash, priority } = req.body;

    if (!subject || !description) {
      return res.status(400).json({ error: 'Subject and description are required' });
    }

    const ticketData: any = {
      user_id: userId,
      subject,
      description,
      deposit_id: depositId || null,
      transaction_hash: transactionHash || null,
      priority: priority || 'normal',
      status: 'open'
    };

    const ticket = await insert('support_tickets', ticketData);

    res.json({
      message: 'Support ticket created successfully',
      ticket
    });
  } catch (error: any) {
    console.error('[SUPPORT] Create ticket error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user's tickets
router.get('/tickets', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;

    const { data: tickets, error } = await supabase
      .from('support_tickets')
      .select(`
        *,
        deposit_requests (id, amount, status, transaction_hash)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({ tickets: tickets || [] });
  } catch (error: any) {
    console.error('[SUPPORT] Get tickets error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get single ticket
router.get('/tickets/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { id } = req.params;

    const { data: ticket, error } = await supabase
      .from('support_tickets')
      .select(`
        *,
        deposit_requests (id, amount, status, transaction_hash, created_at)
      `)
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Ticket not found' });
      }
      throw error;
    }

    res.json({ ticket });
  } catch (error: any) {
    console.error('[SUPPORT] Get ticket error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update ticket (user can add more info)
router.put('/tickets/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { id } = req.params;
    const { description, transactionHash } = req.body;

    const ticket = await queryRow('support_tickets', { id, user_id: userId });
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    if (ticket.status === 'resolved' || ticket.status === 'closed') {
      return res.status(400).json({ error: 'Cannot update a resolved or closed ticket' });
    }

    const updateData: any = {};
    if (description) updateData.description = description;
    if (transactionHash) updateData.transaction_hash = transactionHash;

    await update('support_tickets', { id }, updateData);

    res.json({ message: 'Ticket updated' });
  } catch (error: any) {
    console.error('[SUPPORT] Update ticket error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==================== ADMIN ROUTES ====================

// Admin: Get all tickets
router.get('/admin/tickets', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { status, priority } = req.query;

    let query = supabase
      .from('support_tickets')
      .select(`
        *,
        users (id, username, email, wallet_address),
        deposit_requests (id, amount, status, transaction_hash)
      `)
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }
    if (priority) {
      query = query.eq('priority', priority);
    }

    const { data: tickets, error } = await query;

    if (error) throw error;

    res.json({ tickets: tickets || [] });
  } catch (error: any) {
    console.error('[SUPPORT] Admin get tickets error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin: Get ticket details
router.get('/admin/tickets/:id', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const { data: ticket, error } = await supabase
      .from('support_tickets')
      .select(`
        *,
        users (id, username, email, wallet_address, balance),
        deposit_requests (id, amount, status, transaction_hash, created_at, block_number)
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Ticket not found' });
      }
      throw error;
    }

    res.json({ ticket });
  } catch (error: any) {
    console.error('[SUPPORT] Admin get ticket error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin: Update ticket status
router.put('/admin/tickets/:id', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status, priority, adminNotes } = req.body;
    const adminId = req.userId!;

    const ticket = await queryRow('support_tickets', { id });
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    const updateData: any = {};
    if (status) updateData.status = status;
    if (priority) updateData.priority = priority;
    if (adminNotes) updateData.admin_notes = adminNotes;

    if (status === 'resolved') {
      updateData.resolved_by = adminId;
      updateData.resolved_at = new Date().toISOString();
    }

    await update('support_tickets', { id }, updateData);

    res.json({ message: 'Ticket updated' });
  } catch (error: any) {
    console.error('[SUPPORT] Admin update ticket error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin: Resolve ticket with deposit approval
router.post('/admin/tickets/:id/resolve-with-deposit', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { amount, notes } = req.body;
    const adminId = req.userId!;

    const ticket = await queryRow('support_tickets', { id });
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    if (!ticket.deposit_id) {
      return res.status(400).json({ error: 'This ticket is not linked to a deposit' });
    }

    // Approve the deposit
    const deposit = await queryRow('deposit_requests', { id: ticket.deposit_id });
    if (!deposit) {
      return res.status(400).json({ error: 'Linked deposit not found' });
    }

    const approveAmount = amount || deposit.amount;

    // Update deposit
    await update('deposit_requests', { id: deposit.id }, {
      status: 'verified',
      contract_verified: false,
      verified_at: new Date().toISOString()
    });

    // Credit user
    const user = await queryRow('users', { id: deposit.user_id });
    await supabase
      .from('users')
      .update({ balance: user.balance + approveAmount })
      .eq('id', deposit.user_id);

    // Resolve ticket
    await update('support_tickets', { id }, {
      status: 'resolved',
      resolved_by: adminId,
      resolved_at: new Date().toISOString(),
      admin_notes: notes || 'Deposit manually approved'
    });

    res.json({ 
      message: 'Ticket resolved and deposit credited',
      creditedAmount: approveAmount
    });
  } catch (error: any) {
    console.error('[SUPPORT] Resolve with deposit error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

