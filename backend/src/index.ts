import dotenv from 'dotenv';
import app from './app';
import { startDepositMonitor } from './services/depositMonitor';
import { startInvestmentGrowthCalculator } from './services/investmentGrowth';

dotenv.config();

const PORT = parseInt(process.env.PORT || '8080', 10);

// Start the server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 API available at http://localhost:${PORT} (Local Dev)`);
  console.log(`📡 API available at http://0.0.0.0:${PORT} (Network)`);
  console.log(`🏥 Health check: http://localhost:${PORT}/health`);
  console.log('');
  console.log('📝 Note: Run supabase-schema.sql in Supabase SQL Editor to initialize database');
  console.log('👤 Create admin users directly in Supabase dashboard');
  console.log('');
  
  // Start background services
  startDepositMonitor();
  startInvestmentGrowthCalculator();
});

