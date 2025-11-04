import {
  Client,
  TopicCreateTransaction,
  PrivateKey,
  PublicKey,
  KeyList,
  TopicId
} from "@hashgraph/sdk";
import * as dotenv from "dotenv";
import * as path from "path";

// Load .env.local from the project root
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

// Existing testnet threshold list keys (same as in generateDemoThresholdList.ts)
const EXISTING_PUBLIC_KEYS = [
  "302a300506032b65700321005f2a9826bef0c082e6e885c46022969da4120f5143b9c5413f79eabbba0cb399",
  "59345a9c8b6112ccc1a3c636d6bc0d2c42477013f3d9f107f0db39b53a5cbb07",
  "0158a26e9dc97312aaf7e8811f3223e5a30b6676a0b58518d062d38418de8eb8"
];

/**
 * Creates a new HCS-2 indexed topic for a threshold list
 * @param thresholdListId - The threshold list account ID
 * @param connectedAccountId - The connected user's account ID (to include their key)
 * @returns The newly created topic ID
 */
export async function generateDemoTopic(thresholdListId: string, connectedAccountId: string): Promise<string> {
  const client = Client.forTestnet();
  
  const operatorId = process.env.HEDERA_TESTNET_ACCOUNT_ID;
  const operatorKey = process.env.HEDERA_TESTNET_PRIVATE_KEY;
  
  if (!operatorId || !operatorKey) {
    throw new Error("Please set HEDERA_TESTNET_ACCOUNT_ID and HEDERA_TESTNET_PRIVATE_KEY in .env.local");
  }
  
  client.setOperator(operatorId, operatorKey);
  
  try {
    console.log(`\n📝 Creating HCS-2 Topic for Threshold List`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
    console.log(`Threshold List: ${thresholdListId}`);
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
    
    // Combine connected account key with only the first 2 existing keys (matching threshold list)
    const allKeyStrings = [connectedPublicKey, ...EXISTING_PUBLIC_KEYS.slice(0, 2)];
    
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
    
    // Create a KeyList with threshold of 1 - any single key can submit messages
    const submitKeyList = new KeyList(publicKeys, 1);
    
    console.log(`✓ Created KeyList with ${publicKeys.length} keys (1-of-${publicKeys.length} threshold - any can post)`);
    
    // Create HCS-2 indexed topic for rejection feedback and activity
    // submitKey set to KeyList of all threshold list members
    const createTopicTx = new TopicCreateTransaction()
      .setTopicMemo(`hcs-2:0:86400|${thresholdListId}`) // HCS-2 indexed, 24 hour TTL, includes threshold list ID
      .setSubmitKey(submitKeyList); // All threshold list members can post
    
    console.log(`✓ Creating topic with threshold list member keys as submitKey`);
    
    const createResponse = await createTopicTx.execute(client);
    const createReceipt = await createResponse.getReceipt(client);
    const topicId = createReceipt.topicId;
    
    if (!topicId) {
      throw new Error("Failed to create topic - no topic ID returned");
    }
    
    console.log(`✅ Topic Created: ${topicId}`);
    console.log(`🔗 https://hashscan.io/testnet/topic/${topicId}`);
    console.log(`\n💡 This topic will be used for:`);
    console.log(`   • Transaction rejection feedback`);
    console.log(`   • Signer activity notifications`);
    console.log(`   • Multi-sig communication\n`);
    
    return topicId.toString();
    
  } catch (error) {
    console.error("❌ Error creating topic:", error);
    throw error;
  } finally {
    client.close();
  }
}

// Run directly if called from command line
if (require.main === module) {
  const thresholdListId = process.argv[2];
  const connectedAccountId = process.argv[3];
  
  if (!thresholdListId || !connectedAccountId) {
    console.error("❌ Error: Please provide both threshold list ID and connected account ID");
    console.error("Usage: npm run demo:topic <threshold-list-id> <connected-account-id>");
    process.exit(1);
  }
  
  generateDemoTopic(thresholdListId, connectedAccountId)
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

