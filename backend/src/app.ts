import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import authRoutes from './routes/auth';
import poolsRoutes from './routes/pools';
import depositsRoutes from './routes/deposits';
import investmentsRoutes from './routes/investments';
import walletRoutes from './routes/wallet';
import adminRoutes from './routes/admin';
import referralRoutes from './routes/referrals';
import portfolioRoutes from './routes/portfolio';
import withdrawalRoutes from './routes/withdrawals';
import supportRoutes from './routes/support';
import balancesRoutes from './routes/balances';
import { supabase } from './config/database';

const app = express();

// Request logging middleware (only in non-test environments)
if (process.env.NODE_ENV !== 'test') {
  app.use((req: Request, res: Response, next: NextFunction) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${req.method} ${req.path}`);
    if (req.body && Object.keys(req.body).length > 0) {
      console.log('Request body:', JSON.stringify(req.body, null, 2));
    }
    if (req.query && Object.keys(req.query).length > 0) {
      console.log('Query params:', JSON.stringify(req.query, null, 2));
    }
    
    // Log response
    const originalSend = res.send;
    res.send = function (body) {
      console.log(`[${timestamp}] ${req.method} ${req.path} - Status: ${res.statusCode}`);
      if (res.statusCode >= 400) {
        console.error('Error response:', body);
      }
      return originalSend.call(this, body);
    };
    
    next();
  });
}

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/auth', authRoutes);
app.use('/pools', poolsRoutes);
app.use('/deposits', depositsRoutes);
app.use('/investments', investmentsRoutes);
app.use('/wallet', walletRoutes);
app.use('/admin', adminRoutes);
app.use('/referrals', referralRoutes);
app.use('/portfolio', portfolioRoutes);
app.use('/withdrawals', withdrawalRoutes);
app.use('/support', supportRoutes);
app.use('/balances', balancesRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Database test endpoint - fetches data to verify Supabase is working
app.get('/db-test', async (req, res) => {
  try {
    // Get counts from all tables
    const { count: usersCount } = await supabase.from('users').select('*', { count: 'exact', head: true });
    const { count: poolsCount } = await supabase.from('pools').select('*', { count: 'exact', head: true });
    const { count: depositsCount } = await supabase.from('deposit_requests').select('*', { count: 'exact', head: true });
    const { count: investmentsCount } = await supabase.from('investments').select('*', { count: 'exact', head: true });
    const { count: withdrawalsCount } = await supabase.from('withdrawal_requests').select('*', { count: 'exact', head: true });
    const { count: referralsCount } = await supabase.from('referral_commissions').select('*', { count: 'exact', head: true });
    const { count: ticketsCount } = await supabase.from('support_tickets').select('*', { count: 'exact', head: true });

    // Get sample data
    const { data: users } = await supabase.from('users').select('id, username, email, role, balance, created_at').limit(5);
    const { data: pools } = await supabase.from('pools').select('id, name, risk_level, min_apy, max_apy');

    res.json({
      status: 'ok',
      database: 'supabase',
      timestamp: new Date().toISOString(),
      counts: {
        users: usersCount || 0,
        pools: poolsCount || 0,
        deposits: depositsCount || 0,
        investments: investmentsCount || 0,
        withdrawals: withdrawalsCount || 0,
        referral_commissions: referralsCount || 0,
        support_tickets: ticketsCount || 0,
      },
      sample_data: {
        users: users || [],
        pools: pools || [],
      }
    });
  } catch (error: any) {
    res.status(500).json({
      status: 'error',
      database: 'connection_failed',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled error:', err);
  console.error('Stack:', err.stack);
  res.status(500).json({ 
    error: 'Internal server error',
    message: err.message 
  });
});

export default app;
