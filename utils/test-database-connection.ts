/**
 * Test KeyRing Database Connection
 * Verifies Supabase connection and checks if tables exist
 */

// Load environment variables from .env.local
import { config } from 'dotenv';
import path from 'path';

config({ path: path.join(__dirname, '../.env.local') });

async function testDatabaseConnection() {
  // Import supabase after environment variables are loaded
  const { supabase } = await import('../lib/supabase');
  console.log('🔍 Testing KeyRing database connection...\n');

  try {
    // Test basic connection
    console.log('1. Testing Supabase connection...');
    const { data, error } = await supabase.auth.getSession();
    
    if (error && !error.message.includes('session')) {
      throw new Error(`Connection failed: ${error.message}`);
    }
    console.log('   ✅ Supabase connection successful');

    // Check if tables exist
    console.log('\n2. Checking database tables...');
    const tables = [
      'keyring_signers',
      'keyring_threshold_lists', 
      'keyring_list_memberships',
      'keyring_rewards'
    ];

    let allTablesExist = true;

    for (const table of tables) {
      try {
        const { count, error } = await supabase
          .from(table as any)
          .select('*', { count: 'exact', head: true });
          
        if (error) {
          console.log(`   ❌ Table '${table}': ${error.message}`);
          allTablesExist = false;
        } else {
          console.log(`   ✅ Table '${table}': Ready (${count || 0} rows)`);
        }
      } catch (testError: any) {
        console.log(`   ❌ Table '${table}': ${testError.message}`);
        allTablesExist = false;
      }
    }

    if (!allTablesExist) {
      console.log('\n❌ Some tables are missing. Please create them manually:');
      console.log('\n📋 **Manual Setup Instructions:**');
      console.log('1. Go to your Supabase dashboard');
      console.log('2. Navigate to SQL Editor');
      console.log('3. Copy and paste the contents of: supabase/schema.sql');
      console.log('4. Run the SQL script');
      console.log('5. Re-run this test: npm run test:db');
    } else {
      console.log('\n✅ All tables exist and are ready!');
      
      // Test a simple insert/delete to verify permissions
      console.log('\n3. Testing database permissions...');
      try {
        const testData = {
          account_id: 'test-account-123',
          public_key: 'test-public-key-456',
          profile_topic_id: '0.0.123456',
          code_name: 'test-signer',
          verification_status: 'pending' as const,
          verification_provider: 'entrust' as const
        };

        // Insert test record
        const { data: insertData, error: insertError } = await supabase
          .from('keyring_signers')
          .insert(testData)
          .select()
          .single();

        if (insertError) {
          console.log(`   ❌ Insert test failed: ${insertError.message}`);
        } else {
          console.log('   ✅ Insert test successful');
          
          // Delete test record
          const { error: deleteError } = await supabase
            .from('keyring_signers')
            .delete()
            .eq('id', insertData.id);
            
          if (deleteError) {
            console.log(`   ⚠️  Delete test failed: ${deleteError.message}`);
          } else {
            console.log('   ✅ Delete test successful');
          }
        }
      } catch (permError: any) {
        console.log(`   ❌ Permission test failed: ${permError.message}`);
      }
    }

    console.log('\n🎯 Database status summary:');
    console.log(`   Connection: ✅ Working`);
    console.log(`   Tables: ${allTablesExist ? '✅' : '❌'} ${allTablesExist ? 'Ready' : 'Missing'}`);
    console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);

  } catch (error: any) {
    console.error('❌ Database test failed:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('1. Check your .env.local file has:');
    console.log('   - NEXT_PUBLIC_SUPABASE_URL');
    console.log('   - SUPABASE_SECRET (service role key)');
    console.log('2. Verify the Supabase project is active');
    console.log('3. Check the service role key has proper permissions');
    process.exit(1);
  }
}

// Run the test
testDatabaseConnection();
