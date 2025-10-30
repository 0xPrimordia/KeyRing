import {
  Client,
  PrivateKey,
  PublicKey,
  KeyList,
  AccountCreateTransaction,
  Hbar
} from "@hashgraph/sdk";
import * as dotenv from "dotenv";
import * as path from "path";

// Load .env.local from the project root
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

// Existing testnet threshold list keys
const EXISTING_PUBLIC_KEYS = [
  "302a300506032b65700321005f2a9826bef0c082e6e885c46022969da4120f5143b9c5413f79eabbba0cb399",
  "59345a9c8b6112ccc1a3c636d6bc0d2c42477013f3d9f107f0db39b53a5cbb07",
  "0158a26e9dc97312aaf7e8811f3223e5a30b6676a0b58518d062d38418de8eb8"
];

/**
 * Creates a new threshold list account with the connected user's account + existing threshold keys
 * @param connectedAccountId - The user's connected wallet account ID
 * @returns The newly created threshold list account ID
 */
export async function generateDemoThresholdList(connectedAccountId: string): Promise<string> {
  const client = Client.forTestnet();
  
  const operatorId = process.env.HEDERA_TESTNET_ACCOUNT_ID;
  const operatorKey = process.env.HEDERA_TESTNET_PRIVATE_KEY;
  
  if (!operatorId || !operatorKey) {
    throw new Error("Please set HEDERA_TESTNET_ACCOUNT_ID and HEDERA_TESTNET_PRIVATE_KEY in .env.local");
  }
  
  client.setOperator(operatorId, operatorKey);
  
  try {
    console.log(`\n🔑 Creating Demo Threshold List`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
    console.log(`Connected Account: ${connectedAccountId}`);
    
    // Fetch the connected account's public key from mirror node
    const accountResponse = await fetch(
      `https://testnet.mirrornode.hedera.com/api/v1/accounts/${connectedAccountId}`
    );
    
    if (!accountResponse.ok) {
      throw new Error(`Failed to fetch account info for ${connectedAccountId}`);
    }
    
    const accountData = await accountResponse.json();
    const connectedPublicKey = accountData.key?._type === 'ED25519' 
      ? accountData.key.key 
      : null;
    
    if (!connectedPublicKey) {
      throw new Error(`Could not retrieve public key for ${connectedAccountId}`);
    }
    
    console.log(`✓ Retrieved connected account public key`);
    
    // Combine connected account key with existing keys
    const allKeyStrings = [connectedPublicKey, ...EXISTING_PUBLIC_KEYS];
    
    // Convert all keys to PublicKey objects
    const publicKeys: PublicKey[] = allKeyStrings.map((keyString, index) => {
      try {
        // First try as DER format
        if (keyString.startsWith('302a')) {
          return PublicKey.fromString(keyString);
        }
        // If it's a private key DER format, extract the public key
        else if (keyString.startsWith('302e020100')) {
          const privateKey = PrivateKey.fromString(keyString);
          return privateKey.publicKey;
        }
        // If it's raw hex (32 bytes), try as ED25519 raw bytes
        else if (keyString.length === 64) {
          return PublicKey.fromBytesED25519(Buffer.from(keyString, 'hex'));
        }
        // Default fallback
        else {
          return PublicKey.fromString(keyString);
        }
      } catch (error) {
        console.error(`Error parsing key ${index + 1}: ${keyString}`);
        throw new Error(`Failed to parse public key ${index + 1}`);
      }
    });
    
    // Create a threshold KeyList - 2 of 4 keys required to sign
    const keyList = new KeyList(publicKeys, 2);
    
    console.log(`✓ Created KeyList with ${publicKeys.length} keys (2-of-4 threshold)`);
    
    // Create an account with this KeyList as admin key
    console.log(`\n📝 Creating threshold list account...`);
    
    const accountCreateTx = new AccountCreateTransaction()
      .setKey(keyList)
      .setInitialBalance(new Hbar(5))
      .setAccountMemo(`KeyRing Demo Threshold List for ${connectedAccountId}`)
      .freezeWith(client);
    
    const accountCreateSign = await accountCreateTx.sign(PrivateKey.fromString(operatorKey));
    const accountCreateSubmit = await accountCreateSign.execute(client);
    const accountCreateRx = await accountCreateSubmit.getReceipt(client);
    const accountId = accountCreateRx.accountId;
    
    if (!accountId) {
      throw new Error("Failed to create account - no account ID returned");
    }
    
    console.log(`✅ Threshold List Created: ${accountId}`);
    console.log(`   Threshold: 2-of-${publicKeys.length}`);
    console.log(`   Memo: KeyRing Demo Threshold List for ${connectedAccountId}`);
    console.log(`🔗 https://hashscan.io/testnet/account/${accountId}\n`);
    
    // Verify the account was created with correct details
    console.log('🔍 Verifying account creation...');
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for mirror node
    
    try {
      const verifyResponse = await fetch(
        `https://testnet.mirrornode.hedera.com/api/v1/accounts/${accountId}`
      );
      
      if (verifyResponse.ok) {
        const verifyData = await verifyResponse.json();
        console.log('✓ Account verified on mirror node');
        console.log(`  Memo: ${verifyData.memo || '(none)'}`);
        console.log(`  Key Type: ${verifyData.key?._type || '(none)'}`);
        if (verifyData.key?._type === 'KeyList') {
          const keys = verifyData.key.keys || [];
          const threshold = verifyData.key.threshold || keys.length;
          console.log(`  Threshold: ${threshold}-of-${keys.length}`);
        }
      }
    } catch (verifyError) {
      console.warn('⚠️  Could not verify account on mirror node (may need more time to propagate)');
    }
    
    return accountId.toString();
    
  } catch (error) {
    console.error("❌ Error creating threshold list:", error);
    throw error;
  } finally {
    client.close();
  }
}

// Run directly if called from command line
if (require.main === module) {
  const connectedAccount = process.argv[2];
  
  if (!connectedAccount) {
    console.error("❌ Error: Please provide a connected account ID");
    console.error("Usage: npm run demo:threshold <account-id>");
    process.exit(1);
  }
  
  generateDemoThresholdList(connectedAccount)
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

