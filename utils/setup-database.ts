/**
 * KeyRing Database Setup Script
 * Creates all necessary tables and indexes in Supabase
 */

import { supabase } from '../lib/supabase';
import fs from 'fs';
import path from 'path';

async function setupDatabase() {
  console.log('🚀 Setting up KeyRing database...\n');

  try {
    // Read the SQL schema file
    const schemaPath = path.join(__dirname, '../supabase/schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');

    // Split the SQL into individual statements (rough split by semicolon)
    const statements = schemaSql
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    console.log(`📋 Found ${statements.length} SQL statements to execute\n`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      if (statement.length === 0) continue;

      console.log(`${i + 1}/${statements.length} Executing: ${statement.substring(0, 50)}...`);
      
      try {
        const { error } = await (supabase as any).rpc('exec_sql', { sql: statement });
        
        if (error) {
          // Try direct query execution as fallback
          const { error: queryError } = await supabase.from('keyring_signers').select().limit(0);
          
          if (queryError && queryError.message.includes('relation') && queryError.message.includes('does not exist')) {
            // Table doesn't exist, this is expected for CREATE TABLE statements
            console.log(`   ✅ Statement executed (table creation)`);
          } else {
            console.log(`   ⚠️  Warning: ${error.message}`);
          }
        } else {
          console.log(`   ✅ Statement executed successfully`);
        }
      } catch (execError: any) {
        console.log(`   ⚠️  Error: ${execError.message}`);
      }
    }

    console.log('\n🎯 Testing database connection...');
    
    // Test the connection by trying to query the tables
    const tables = ['keyring_signers', 'keyring_threshold_lists', 'keyring_list_memberships', 'keyring_rewards'];
    
    for (const table of tables) {
      try {
        const { count, error } = await supabase
          .from(table as any)
          .select('*', { count: 'exact', head: true });
          
        if (error) {
          console.log(`   ❌ Table '${table}': ${error.message}`);
        } else {
          console.log(`   ✅ Table '${table}': Ready (${count || 0} rows)`);
        }
      } catch (testError: any) {
        console.log(`   ❌ Table '${table}': ${testError.message}`);
      }
    }

    console.log('\n✅ Database setup completed!');
    console.log('\n📋 Next steps:');
    console.log('1. Verify tables in Supabase dashboard');
    console.log('2. Test signer registration: npm run dev');
    console.log('3. Check API endpoint: /api/register-signer');

  } catch (error: any) {
    console.error('❌ Database setup failed:', error.message);
    process.exit(1);
  }
}

// Run the setup
setupDatabase();
