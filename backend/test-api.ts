import dotenv from 'dotenv';

dotenv.config();

const BASE_URL = process.env.API_URL || 'http://217.60.2.172:8080';

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  response?: any;
}

const results: TestResult[] = [];

async function test(name: string, fn: () => Promise<any>): Promise<void> {
  try {
    const response = await fn();
    results.push({ name, passed: true, response });
    console.log(`✅ ${name}`);
  } catch (error: any) {
    results.push({ name, passed: false, error: error.message });
    console.log(`❌ ${name}: ${error.message}`);
  }
}

async function request(method: string, path: string, body?: any, token?: string) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const options: RequestInit = {
    method,
    headers,
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(`${BASE_URL}${path}`, options);
  const data = await response.json().catch(() => ({ error: 'Invalid JSON response' }));
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${JSON.stringify(data)}`);
  }

  return data;
}

async function runTests() {
  console.log('🧪 Testing all API endpoints...\n');
  console.log(`📍 Base URL: ${BASE_URL}\n`);

  let adminToken = '';
  let userToken = '';
  let userId = '';
  let depositId = '';
  let investmentId = '';
  let withdrawalId = '';
  let poolId = 1;

  // ============================================
  // Health Check
  // ============================================
  await test('Health Check', async () => {
    return await request('GET', '/health');
  });

  // ============================================
  // Auth Tests
  // ============================================
  console.log('\n📝 Auth Endpoints:');
  
  await test('Register User', async () => {
    const email = `test_${Date.now()}@test.com`;
    const response = await request('POST', '/auth/register', {
      username: `testuser_${Date.now()}`,
      email,
      password: 'Test123!@#',
      walletAddress: '0x1234567890123456789012345678901234567890',
    });
    userToken = response.token;
    userId = response.user.id;
    return response;
  });

  await test('Login Admin', async () => {
    const response = await request('POST', '/auth/login', {
      email: 'luffy@69.com',
      password: 'Luffy#Privacy@69',
    });
    adminToken = response.token;
    return response;
  });

  await test('Get Current User (Me)', async () => {
    return await request('GET', '/auth/me', undefined, userToken);
  });

  // ============================================
  // Pools Tests
  // ============================================
  console.log('\n🏊 Pools Endpoints:');
  
  await test('Get All Pools', async () => {
    const response = await request('GET', '/pools');
    if (response.pools && response.pools.length > 0) {
      poolId = response.pools[0].id;
    }
    return response;
  });

  await test('Get Pool by ID', async () => {
    return await request('GET', `/pools/${poolId}`);
  });

  await test('Get Pools by Risk Level (low)', async () => {
    return await request('GET', '/pools/risk/low');
  });

  // ============================================
  // Deposits Tests
  // ============================================
  console.log('\n💰 Deposits Endpoints:');
  
  await test('Submit Deposit Request', async () => {
    const response = await request('POST', '/deposits/submit', {
      amount: 100,
      transactionHash: '0x' + 'a'.repeat(64),
    }, userToken);
    depositId = response.depositRequest.id;
    return response;
  });

  await test('Get My Deposits', async () => {
    return await request('GET', '/deposits/my-deposits', undefined, userToken);
  });

  await test('Update Deposit Transaction Hash', async () => {
    return await request('PUT', `/deposits/${depositId}/transaction-hash`, {
      transactionHash: '0x' + 'b'.repeat(64),
    }, userToken);
  });

  await test('Admin: Get Pending Deposits', async () => {
    return await request('GET', '/deposits/pending', undefined, adminToken);
  });

  await test('Admin: Approve Deposit', async () => {
    return await request('POST', `/deposits/${depositId}/approve`, {}, adminToken);
  });

  // ============================================
  // Investments Tests
  // ============================================
  console.log('\n📈 Investments Endpoints:');
  
  await test('Create Investment', async () => {
    const response = await request('POST', '/investments', {
      poolId,
      amount: 50,
    }, userToken);
    investmentId = response.investment.id;
    return response;
  });

  await test('Get My Investments', async () => {
    return await request('GET', '/investments', undefined, userToken);
  });

  await test('Get Investment by ID', async () => {
    return await request('GET', `/investments/${investmentId}`, undefined, userToken);
  });

  // ============================================
  // Wallet Tests
  // ============================================
  console.log('\n💼 Wallet Endpoints:');
  
  await test('Get Wallet Dashboard', async () => {
    return await request('GET', '/wallet/dashboard', undefined, userToken);
  });

  // ============================================
  // Portfolio Tests
  // ============================================
  console.log('\n📊 Portfolio Endpoints:');
  
  await test('Get Portfolio History', async () => {
    return await request('GET', '/portfolio/history?days=7', undefined, userToken);
  });

  // ============================================
  // Referrals Tests
  // ============================================
  console.log('\n👥 Referrals Endpoints:');
  
  await test('Get My Referral Info', async () => {
    return await request('GET', '/referrals/my-referral', undefined, userToken);
  });

  await test('Get Referral Network', async () => {
    return await request('GET', '/referrals/network', undefined, userToken);
  });

  await test('Get Referral Commissions', async () => {
    return await request('GET', '/referrals/commissions', undefined, userToken);
  });

  // ============================================
  // Withdrawals Tests
  // ============================================
  console.log('\n💸 Withdrawals Endpoints:');
  
  await test('Create Withdrawal Request', async () => {
    const response = await request('POST', '/withdrawals/request', {
      amount: 25,
      toAddress: '0x9876543210987654321098765432109876543210',
    }, userToken);
    withdrawalId = response.withdrawalRequest.id;
    return response;
  });

  await test('Get My Withdrawals', async () => {
    return await request('GET', '/withdrawals/my-withdrawals', undefined, userToken);
  });

  await test('Admin: Get Pending Withdrawals', async () => {
    return await request('GET', '/withdrawals/pending', undefined, adminToken);
  });

  // ============================================
  // Admin Tests
  // ============================================
  console.log('\n👑 Admin Endpoints:');
  
  await test('Admin: Get All Users', async () => {
    return await request('GET', '/admin/users', undefined, adminToken);
  });

  // ============================================
  // Summary
  // ============================================
  console.log('\n' + '='.repeat(50));
  console.log('📊 Test Summary');
  console.log('='.repeat(50));
  
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Total: ${results.length}`);
  console.log(`🎯 Success Rate: ${((passed / results.length) * 100).toFixed(1)}%`);
  
  if (failed > 0) {
    console.log('\n❌ Failed Tests:');
    results.filter(r => !r.passed).forEach(r => {
      console.log(`   - ${r.name}: ${r.error}`);
    });
  }
  
  console.log('\n' + '='.repeat(50));
  
  process.exit(failed > 0 ? 1 : 0);
}

// Run tests
runTests().catch((error) => {
  console.error('❌ Test runner error:', error);
  process.exit(1);
});

