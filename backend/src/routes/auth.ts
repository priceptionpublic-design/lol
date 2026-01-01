import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { supabase, queryRow, insert } from '../config/database';
import { generateToken } from '../middleware/auth';
import { isValidBNBAddress, isValidEmail } from '../utils/validation';

const router = Router();

// Generate unique referral code
async function generateReferralCode(): Promise<string> {
  let code = '';
  let exists = true;
  
  while (exists) {
    code = Math.random().toString(36).substring(2, 10).toUpperCase();
    const existing = await queryRow('users', { referral_code: code });
    exists = !!existing;
  }
  
  return code;
}

// Register
router.post('/register', async (req: Request, res: Response) => {
  try {
    console.log('[AUTH] Register request received');
    const { username, email, password, walletAddress, referralCode } = req.body;

    if (!username || !email || !password || !walletAddress) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    if (!isValidBNBAddress(walletAddress)) {
      return res.status(400).json({ error: 'Invalid BNB wallet address. Must be a valid 0x address with 42 characters.' });
    }

    // Check if user exists
    const { data: existingEmail } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (existingEmail) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const { data: existingUsername } = await supabase
      .from('users')
      .select('id')
      .eq('username', username)
      .single();

    if (existingUsername) {
      return res.status(400).json({ error: 'Username already taken' });
    }

    // Validate referral code if provided
    let referrerId = null;
    if (referralCode) {
      const referrer = await queryRow('users', { referral_code: referralCode.toUpperCase() });
      if (!referrer) {
        return res.status(400).json({ error: 'Invalid referral code' });
      }
      referrerId = referrer.id;
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Generate unique referral code
    const newReferralCode = await generateReferralCode();

    // Create user
    const userData = {
      username,
      email,
      password_hash: passwordHash,
      wallet_address: walletAddress,
      balance: 0,
      role: 'user',
      referrer_id: referrerId,
      referral_code: newReferralCode
    };

    const user = await insert('users', userData);

    console.log('[AUTH] User created successfully:', user.id);
    const token = generateToken(user.id, user.role);

    res.json({
      message: 'User created successfully',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        walletAddress: user.wallet_address,
        balance: user.balance,
        role: user.role,
        referralCode: user.referral_code,
      },
      token,
    });
  } catch (error: any) {
    console.error('[AUTH] Register error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Login
router.post('/login', async (req: Request, res: Response) => {
  try {
    console.log('[AUTH] Login request received');
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Get user
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (error || !user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    console.log('[AUTH] Login successful for user:', user.id);
    const token = generateToken(user.id, user.role);

    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        walletAddress: user.wallet_address,
        balance: user.balance,
        role: user.role,
        referralCode: user.referral_code,
      },
      token,
    });
  } catch (error: any) {
    console.error('[AUTH] Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get current user
router.get('/me', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }

    const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
    
    let decoded: { userId: string };
    try {
      decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    } catch (error) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }

    const { data: user, error } = await supabase
      .from('users')
      .select('id, username, email, wallet_address, vault_balance, invested_balance, referral_balance, balance, role, referral_code')
      .eq('id', decoded.userId)
      .single();

    if (error || !user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        walletAddress: user.wallet_address,
        vaultBalance: parseFloat(user.vault_balance || '0'),
        investedBalance: parseFloat(user.invested_balance || '0'),
        referralBalance: parseFloat(user.referral_balance || '0'),
        balance: parseFloat(user.vault_balance || '0') + parseFloat(user.invested_balance || '0'), // Total (excluding referral until claimed)
        role: user.role,
        referralCode: user.referral_code,
      },
    });
  } catch (error: any) {
    console.error('[AUTH] Get user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
