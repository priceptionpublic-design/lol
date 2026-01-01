import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Bun automatically loads .env files, no need for dotenv package
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  console.error('   Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env');
}

// Create Supabase client with service role key (bypasses RLS)
export const supabase: SupabaseClient = createClient(
  supabaseUrl || '',
  supabaseServiceKey || '',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// Test connection
async function testConnection() {
  try {
    const { data, error } = await supabase.from('pools').select('count').limit(1);
    if (error) throw error;
    console.log('✅ Supabase connected successfully');
  } catch (error: any) {
    console.error('❌ Supabase connection failed:', error.message);
  }
}

// Initialize on import
if (supabaseUrl && supabaseServiceKey) {
  testConnection();
}

// Helper functions for compatibility with existing code

/**
 * Query single row
 */
export async function queryRow(table: string, conditions: Record<string, any>): Promise<any> {
  let query = supabase.from(table).select('*');
  
  for (const [key, value] of Object.entries(conditions)) {
    query = query.eq(key, value);
  }
  
  const { data, error } = await query.single();
  if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
    throw error;
  }
  return data;
}

/**
 * Query multiple rows
 */
export async function queryRows(table: string, conditions?: Record<string, any>, options?: {
  orderBy?: string;
  ascending?: boolean;
  limit?: number;
}): Promise<any[]> {
  let query = supabase.from(table).select('*');
  
  if (conditions) {
    for (const [key, value] of Object.entries(conditions)) {
      query = query.eq(key, value);
    }
  }
  
  if (options?.orderBy) {
    query = query.order(options.orderBy, { ascending: options.ascending ?? false });
  }
  
  if (options?.limit) {
    query = query.limit(options.limit);
  }
  
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

/**
 * Insert row
 */
export async function insert(table: string, data: Record<string, any>): Promise<any> {
  const { data: result, error } = await supabase
    .from(table)
    .insert(data)
    .select()
    .single();
  
  if (error) throw error;
  return result;
}

/**
 * Update rows
 */
export async function update(table: string, conditions: Record<string, any>, data: Record<string, any>): Promise<any[]> {
  let query = supabase.from(table).update(data);
  
  for (const [key, value] of Object.entries(conditions)) {
    query = query.eq(key, value);
  }
  
  const { data: result, error } = await query.select();
  if (error) throw error;
  return result || [];
}

/**
 * Delete rows
 */
export async function remove(table: string, conditions: Record<string, any>): Promise<void> {
  let query = supabase.from(table).delete();
  
  for (const [key, value] of Object.entries(conditions)) {
    query = query.eq(key, value);
  }
  
  const { error } = await query;
  if (error) throw error;
}

/**
 * Raw SQL query (use with caution)
 */
export async function rawQuery(sql: string): Promise<any> {
  const { data, error } = await supabase.rpc('exec_sql', { query: sql });
  if (error) throw error;
  return data;
}

/**
 * Legacy query function for backward compatibility
 * Note: Supabase doesn't support raw SQL like SQLite. Use queryRow/queryRows instead.
 */
export async function query(sql: string, params: any[] = []): Promise<any> {
  console.warn('⚠️  query() function is deprecated. Use queryRow/queryRows/insert/update instead.');
  throw new Error('Raw SQL queries not supported with Supabase. Please use the Supabase client methods or run SQL via Supabase dashboard.');
}

/**
 * Legacy batch function for backward compatibility
 */
export async function batch(statements: Array<{ sql: string; args?: any[] }>): Promise<any> {
  console.warn('⚠️  batch() function is deprecated. Use Supabase transactions or individual operations.');
  throw new Error('Batch operations not supported. Use individual insert/update operations or Supabase transactions.');
}

export default supabase;
