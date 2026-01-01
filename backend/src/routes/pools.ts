import { Router, Request, Response } from 'express';
import { supabase, queryRow } from '../config/database';

const router = Router();

// Get all pools
router.get('/', async (req: Request, res: Response) => {
  try {
    const { data: pools, error } = await supabase
      .from('pools')
      .select('*')
      .order('risk_level', { ascending: true });

    if (error) throw error;

    // Format pools for frontend
    const formattedPools = (pools || []).map((pool: any) => {
      const apyRange = `${pool.min_apy}% - ${pool.max_apy}%`;
      const avgApy = (parseFloat(pool.min_apy) + parseFloat(pool.max_apy)) / 2;
      
      // Risk level formatting
      let riskLabel: string;
      let riskColor: { bg: string; text: string };
      let gradient: [string, string];

      if (pool.risk_level === 'low') {
        riskLabel = 'Low Risk';
        riskColor = { bg: '#D1FAE5', text: '#065F46' };
        gradient = ['#10B981', '#059669'];
      } else if (pool.risk_level === 'mid') {
        riskLabel = 'Medium Risk';
        riskColor = { bg: '#FEF3C7', text: '#92400E' };
        gradient = ['#F59E0B', '#D97706'];
      } else {
        riskLabel = 'High Risk';
        riskColor = { bg: '#FEE2E2', text: '#991B1B' };
        gradient = ['#EF4444', '#DC2626'];
      }

      return {
        id: pool.id,
        pair: `${pool.name} Pool`,
        symbol: pool.name,
        protocol: 'Yieldium',
        risk: riskLabel,
        apy: apyRange,
        apyValue: avgApy,
        tvl: '$0',
        volume: '$0',
        gradient,
        riskColor,
      };
    });

    res.json({ pools: formattedPools });
  } catch (error) {
    console.error('Get pools error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get pool by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const { data: pool, error } = await supabase
      .from('pools')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !pool) {
      return res.status(404).json({ error: 'Pool not found' });
    }

    const apyRange = `${pool.min_apy}% - ${pool.max_apy}%`;
    const avgApy = (parseFloat(pool.min_apy) + parseFloat(pool.max_apy)) / 2;
    
    let riskLabel: string;
    let riskColor: { bg: string; text: string };
    let gradient: [string, string];

    if (pool.risk_level === 'low') {
      riskLabel = 'Low Risk';
      riskColor = { bg: '#D1FAE5', text: '#065F46' };
      gradient = ['#10B981', '#059669'];
    } else if (pool.risk_level === 'mid') {
      riskLabel = 'Medium Risk';
      riskColor = { bg: '#FEF3C7', text: '#92400E' };
      gradient = ['#F59E0B', '#D97706'];
    } else {
      riskLabel = 'High Risk';
      riskColor = { bg: '#FEE2E2', text: '#991B1B' };
      gradient = ['#EF4444', '#DC2626'];
    }

    res.json({
      pool: {
        id: pool.id,
        pair: `${pool.name} Pool`,
        symbol: pool.name,
        protocol: 'Yieldium',
        risk: riskLabel,
        apy: apyRange,
        apyValue: avgApy,
        tvl: '$0',
        volume: '$0',
        gradient,
        riskColor,
      },
    });
  } catch (error) {
    console.error('Get pool error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get pools by risk level
router.get('/risk/:risk', async (req: Request, res: Response) => {
  try {
    const { risk } = req.params;

    if (!['low', 'mid', 'high'].includes(risk)) {
      return res.status(400).json({ error: 'Invalid risk level' });
    }

    const { data: pools, error } = await supabase
      .from('pools')
      .select('*')
      .eq('risk_level', risk);

    if (error) throw error;

    const formattedPools = (pools || []).map((pool: any) => {
      const apyRange = `${pool.min_apy}% - ${pool.max_apy}%`;
      const avgApy = (parseFloat(pool.min_apy) + parseFloat(pool.max_apy)) / 2;
      
      let riskLabel: string;
      let riskColor: { bg: string; text: string };
      let gradient: [string, string];

      if (pool.risk_level === 'low') {
        riskLabel = 'Low Risk';
        riskColor = { bg: '#D1FAE5', text: '#065F46' };
        gradient = ['#10B981', '#059669'];
      } else if (pool.risk_level === 'mid') {
        riskLabel = 'Medium Risk';
        riskColor = { bg: '#FEF3C7', text: '#92400E' };
        gradient = ['#F59E0B', '#D97706'];
      } else {
        riskLabel = 'High Risk';
        riskColor = { bg: '#FEE2E2', text: '#991B1B' };
        gradient = ['#EF4444', '#DC2626'];
      }

      return {
        id: pool.id,
        pair: `${pool.name} Pool`,
        symbol: pool.name,
        protocol: 'Yieldium',
        risk: riskLabel,
        apy: apyRange,
        apyValue: avgApy,
        tvl: '$0',
        volume: '$0',
        gradient,
        riskColor,
      };
    });

    res.json({ pools: formattedPools });
  } catch (error) {
    console.error('Get pools by risk error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
