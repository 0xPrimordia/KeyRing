import { createClient } from '@supabase/supabase-js';
import { Database } from './database.types';

// Supabase configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SECRET!;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables');
}

// Create a Supabase client with service role key for backend operations
// This bypasses RLS and gives full database access for server-side operations
export const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Helper function to generate signer ID
export function generateSignerId(): string {
  const crypto = require('crypto');
  return crypto.randomUUID();
}
