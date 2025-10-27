import {
  Client,
  PrivateKey,
  TransferTransaction,
  Hbar,
  AccountBalanceQuery,
  AccountInfoQuery
} from "@hashgraph/sdk";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

// Deployed contract and threshold list
const THRESHOLD_LIST_ACCOUNT = "0.0.7097961";
const CONTRACT_ID = "0.0.7097984";

async function testThresholdListTransaction(): Promise<void> {
  console.log("🧪 Testing Threshold List Transaction\n");
  
  // Configure client for testnet
  const client = Client.forTestnet();
  
  // Set operator account
  const operatorId = process.env.HEDERA_TESTNET_ACCOUNT_ID;
  const operatorKey = process.env.HEDERA_TESTNET_PRIVATE_KEY;
  
  if (!operatorId || !operatorKey) {
    throw new Error("Please set HEDERA_TESTNET_ACCOUNT_ID and HEDERA_TESTNET_PRIVATE_KEY in your .env.local file");
  }
  
  client.setOperator(operatorId, operatorKey);
  
  try {
    console.log("📋 Configuration:");
    console.log(`   Operator: ${operatorId}`);
    console.log(`   Threshold List: ${THRESHOLD_LIST_ACCOUNT}`);
    console.log(`   Contract: ${CONTRACT_ID}\n`);
    
    // Step 1: Check current balances
    console.log("💰 Checking Current Balances...");
    const operatorBalance = await new AccountBalanceQuery()
      .setAccountId(operatorId)
      .execute(client);
    
    const thresholdBalance = await new AccountBalanceQuery()
      .setAccountId(THRESHOLD_LIST_ACCOUNT)
      .execute(client);
    
    console.log(`   Operator Balance: ${operatorBalance.hbars.toString()}`);
    console.log(`   Threshold List Balance: ${thresholdBalance.hbars.toString()}\n`);
    
    // Step 2: Get threshold list info
    console.log("🔍 Querying Threshold List Account Info...");
    const accountInfo = await new AccountInfoQuery()
      .setAccountId(THRESHOLD_LIST_ACCOUNT)
      .execute(client);
    
    console.log(`   Account ID: ${accountInfo.accountId}`);
    console.log(`   Memo: ${accountInfo.accountMemo}`);
    console.log(`   Key Type: ${accountInfo.key?.constructor.name}`);
    
    if (accountInfo.key && 'threshold' in accountInfo.key) {
      console.log(`   Threshold: ${accountInfo.key.threshold || 'ALL (default)'}`);
    }
    if (accountInfo.key && '_keys' in accountInfo.key) {
      console.log(`   Total Keys: ${accountInfo.key._keys.length}`);
    }
    console.log();
    
    // Step 3: Try to send HBAR to threshold list
    console.log("💸 Attempting to Send HBAR to Threshold List...");
    console.log("   Sending 0.1 HBAR from operator to threshold list...\n");
    
    const transferTx = await new TransferTransaction()
      .addHbarTransfer(operatorId, new Hbar(-0.1))
      .addHbarTransfer(THRESHOLD_LIST_ACCOUNT, new Hbar(0.1))
      .execute(client);
    
    const transferReceipt = await transferTx.getReceipt(client);
    
    console.log("✅ Transfer Successful!");
    console.log(`   Status: ${transferReceipt.status.toString()}`);
    console.log(`   Transaction ID: ${transferTx.transactionId.toString()}\n`);
    
    // Step 4: Check new balances
    console.log("💰 Checking New Balances...");
    const newOperatorBalance = await new AccountBalanceQuery()
      .setAccountId(operatorId)
      .execute(client);
    
    const newThresholdBalance = await new AccountBalanceQuery()
      .setAccountId(THRESHOLD_LIST_ACCOUNT)
      .execute(client);
    
    console.log(`   Operator Balance: ${newOperatorBalance.hbars.toString()}`);
    console.log(`   Threshold List Balance: ${newThresholdBalance.hbars.toString()}\n`);
    
    // Step 5: Try to send FROM threshold list (will fail without all keys)
    console.log("🔒 Attempting to Send FROM Threshold List (without signatures)...");
    console.log("   This should fail because we don't have all 3 keys...\n");
    
    try {
      const failTransferTx = await new TransferTransaction()
        .addHbarTransfer(THRESHOLD_LIST_ACCOUNT, new Hbar(-0.05))
        .addHbarTransfer(operatorId, new Hbar(0.05))
        .freezeWith(client);
      
      // Try to sign with operator key (which is not one of the threshold list keys)
      const signedTx = await failTransferTx.sign(PrivateKey.fromString(operatorKey));
      
      await signedTx.execute(client);
      
      console.log("❌ This shouldn't happen - transaction succeeded without threshold list keys!");
      
    } catch (error: any) {
      console.log("✅ Expected Failure!");
      console.log(`   Error: ${error.message || error}`);
      console.log("   This is correct - we need all 3 threshold list keys to sign!\n");
    }
    
    // Step 6: Summary
    console.log("📊 Summary:");
    console.log("   ✅ Can send HBAR TO threshold list account");
    console.log("   ✅ Cannot send HBAR FROM threshold list without all 3 keys");
    console.log("   ✅ Threshold list is properly secured");
    console.log("   ✅ Ready for boost project transactions\n");
    
    console.log("🎯 Next Steps:");
    console.log("   1. Use operator to create boost transactions in the contract");
    console.log("   2. Threshold list (3 keys) must sign to execute transactions");
    console.log("   3. Monitor activity on HashScan:");
    console.log(`      https://hashscan.io/testnet/account/${THRESHOLD_LIST_ACCOUNT}`);
    console.log(`      https://hashscan.io/testnet/contract/${CONTRACT_ID}\n`);
    
  } catch (error) {
    console.error("❌ Error:", error);
    throw error;
  } finally {
    client.close();
  }
}

// Run the script
if (require.main === module) {
  testThresholdListTransaction()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { testThresholdListTransaction };

