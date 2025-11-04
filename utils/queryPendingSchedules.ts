import fetch from "node-fetch";

/**
 * Query Hedera Mirror Node for pending scheduled transactions for a signer
 * @param signerAccountId - The account ID to check for pending schedules (e.g., "0.0.123456")
 * @returns Array of pending scheduled transactions
 */
async function queryPendingSchedules(signerAccountId: string): Promise<any[]> {
  console.log(`🔍 Querying pending schedules for signer: ${signerAccountId}\n`);
  
  try {
    // Mirror Node API endpoint for schedules
    const url = `https://testnet.mirrornode.hedera.com/api/v1/schedules?account.id=${signerAccountId}&executed=false`;
    
    console.log(`📡 Querying: ${url}\n`);
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (!data.schedules || data.schedules.length === 0) {
      console.log("✅ No pending schedules found for this signer.\n");
      return [];
    }
    
    console.log(`📋 Found ${data.schedules.length} pending schedule(s):\n`);
    
    data.schedules.forEach((schedule: any, index: number) => {
      console.log(`Schedule ${index + 1}:`);
      console.log(`   Schedule ID: ${schedule.schedule_id}`);
      console.log(`   Created: ${new Date(parseFloat(schedule.consensus_timestamp) * 1000).toLocaleString()}`);
      console.log(`   Memo: ${schedule.memo || '(none)'}`);
      console.log(`   Executed: ${schedule.executed_timestamp ? 'Yes' : 'No'}`);
      console.log(`   Deleted: ${schedule.deleted ? 'Yes' : 'No'}`);
      
      if (schedule.signatures) {
        console.log(`   Signatures: ${schedule.signatures.length}`);
      }
      
      console.log();
    });
    
    return data.schedules;
    
  } catch (error) {
    console.error("❌ Error querying Mirror Node:", error);
    throw error;
  }
}

/**
 * Query a specific schedule by ID
 */
async function queryScheduleById(scheduleId: string): Promise<any> {
  console.log(`🔍 Querying schedule: ${scheduleId}\n`);
  
  try {
    const url = `https://testnet.mirrornode.hedera.com/api/v1/schedules/${scheduleId}`;
    
    console.log(`📡 Querying: ${url}\n`);
    
    const response = await fetch(url);
    const data = await response.json();
    
    console.log("📋 Schedule Details:");
    console.log(`   Schedule ID: ${data.schedule_id}`);
    console.log(`   Creator: ${data.creator_account_id}`);
    console.log(`   Payer: ${data.payer_account_id}`);
    console.log(`   Memo: ${data.memo || '(none)'}`);
    console.log(`   Created: ${new Date(parseFloat(data.consensus_timestamp) * 1000).toLocaleString()}`);
    console.log(`   Executed: ${data.executed_timestamp ? 'Yes' : 'No'}`);
    
    if (data.signatures && data.signatures.length > 0) {
      console.log(`\n   Signatures (${data.signatures.length}):`);
      data.signatures.forEach((sig: any, i: number) => {
        console.log(`      ${i + 1}. ${sig.public_key_prefix || sig.consensus_timestamp}`);
      });
    }
    
    console.log();
    
    return data;
    
  } catch (error) {
    console.error("❌ Error querying schedule:", error);
    throw error;
  }
}

/**
 * Main function - can query by signer or schedule ID
 */
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log("Usage:");
    console.log("  Query by signer:      npm run schedules:query -- --signer 0.0.123456");
    console.log("  Query by schedule ID: npm run schedules:query -- --schedule 0.0.7098029");
    console.log();
    process.exit(1);
  }
  
  const mode = args[0];
  const value = args[1];
  
  if (mode === '--signer') {
    await queryPendingSchedules(value);
  } else if (mode === '--schedule') {
    await queryScheduleById(value);
  } else {
    console.log("Invalid mode. Use --signer or --schedule");
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { queryPendingSchedules, queryScheduleById };

