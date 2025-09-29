import fetch from 'node-fetch';

const MIRROR_NODE_BASE_URL = 'https://testnet.mirrornode.hedera.com/api/v1';
const ACCOUNT_ID = '0.0.6919888'; // The threshold account we created

async function queryAccountData(): Promise<void> {
  console.log(`🔍 Querying Mirror Node data for account: ${ACCOUNT_ID}\n`);
  
  try {
    // 1. Account Information
    console.log("📊 ACCOUNT INFORMATION");
    console.log("=" .repeat(50));
    const accountResponse = await fetch(`${MIRROR_NODE_BASE_URL}/accounts/${ACCOUNT_ID}`);
    const accountData = await accountResponse.json();
    
    console.log("Raw Account Data:");
    console.log(JSON.stringify(accountData, null, 2));
    console.log("\n");

    // 2. Account Transactions
    console.log("📋 RECENT TRANSACTIONS");
    console.log("=" .repeat(50));
    const transactionsResponse = await fetch(`${MIRROR_NODE_BASE_URL}/accounts/${ACCOUNT_ID}/transactions?limit=10`);
    const transactionsData = await transactionsResponse.json();
    
    console.log("Recent Transactions:");
    console.log(JSON.stringify(transactionsData, null, 2));
    console.log("\n");

    // 3. Account Balances
    console.log("💰 ACCOUNT BALANCES");
    console.log("=" .repeat(50));
    const balancesResponse = await fetch(`${MIRROR_NODE_BASE_URL}/balances?account.id=${ACCOUNT_ID}`);
    const balancesData = await balancesResponse.json();
    
    console.log("Balance Information:");
    console.log(JSON.stringify(balancesData, null, 2));
    console.log("\n");

    // 4. Parse Key Structure for KeyRing Protocol
    console.log("🔑 KEYRING PROTOCOL ANALYSIS");
    console.log("=" .repeat(50));
    
    if (accountData.key) {
      console.log("Key Structure Analysis:");
      console.log(`- Key Type: ${accountData.key._type || 'Unknown'}`);
      console.log(`- Threshold: ${accountData.key.threshold || 'All keys required'}`);
      
      if (accountData.key.keys) {
        console.log(`- Number of Keys: ${accountData.key.keys.length}`);
        console.log("- Individual Public Keys:");
        
        accountData.key.keys.forEach((keyData: any, index: number) => {
          console.log(`  Key ${index + 1}:`);
          console.log(`    Type: ${keyData._type || 'Unknown'}`);
          console.log(`    Public Key: ${keyData.key || 'N/A'}`);
          
          // Extract the actual key bytes for KeyRing registry
          if (keyData.key) {
            const keyHex = keyData.key;
            console.log(`    Key Length: ${keyHex.length / 2} bytes`);
            console.log(`    First 10 chars: ${keyHex.substring(0, 20)}...`);
            console.log(`    Last 6 chars: ...${keyHex.substring(keyHex.length - 12)}`);
          }
        });
      }
      
      console.log("\nKeyRing Protocol Metadata Available:");
      console.log("✅ Account ID for verification");
      console.log("✅ Complete key structure");
      console.log("✅ Individual signer public keys");
      console.log("✅ Threshold requirements");
      console.log("✅ Account creation timestamp");
      console.log("✅ Account memo/description");
      console.log("✅ Current balance");
      console.log("✅ Transaction history");
    }

    // 5. KeyRing Registry Format
    console.log("\n📋 KEYRING REGISTRY FORMAT");
    console.log("=" .repeat(50));
    
    const keyRingMetadata = {
      listId: `tl-${ACCOUNT_ID.replace(/\./g, '-')}`,
      name: accountData.memo || "Threshold List",
      accountId: ACCOUNT_ID,
      threshold: accountData.key?.threshold || accountData.key?.keys?.length || 0,
      totalMembers: accountData.key?.keys?.length || 0,
      certified: true,
      createdAt: accountData.created_timestamp,
      balance: accountData.balance?.balance || 0,
      network: "testnet",
      keyStructure: accountData.key,
      members: accountData.key?.keys?.map((keyData: any, index: number) => ({
        codeName: `signer-${index + 1}`,
        publicKey: keyData.key,
        publicKeyShort: keyData.key ? `${keyData.key.substring(0, 10)}...${keyData.key.substring(keyData.key.length - 6)}` : 'N/A',
        keyType: keyData._type || 'ED25519',
        status: 'Active',
        joinDate: accountData.created_timestamp
      })) || [],
      mirrorNodeData: {
        accountInfo: accountData,
        recentTransactions: transactionsData.transactions?.slice(0, 3) || []
      }
    };
    
    console.log("KeyRing Protocol Metadata:");
    console.log(JSON.stringify(keyRingMetadata, null, 2));

  } catch (error) {
    console.error("❌ Error querying Mirror Node:", error);
  }
}

// Run the script
if (require.main === module) {
  queryAccountData();
}

export { queryAccountData };
