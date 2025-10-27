import {
  Client,
  PrivateKey,
  PublicKey,
  KeyList,
  AccountCreateTransaction,
  AccountInfoQuery,
  Hbar
} from "@hashgraph/sdk";
import * as dotenv from "dotenv";
import * as path from "path";

// Load .env.local from the project root
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

// 3 public keys for testnet threshold list
const PUBLIC_KEYS = [
  "302a300506032b65700321005f2a9826bef0c082e6e885c46022969da4120f5143b9c5413f79eabbba0cb399",
  "59345a9c8b6112ccc1a3c636d6bc0d2c42477013f3d9f107f0db39b53a5cbb07",
  "0158a26e9dc97312aaf7e8811f3223e5a30b6676a0b58518d062d38418de8eb8"
];

async function createThresholdKeyList(): Promise<void> {
  // Configure client for testnet
  const client = Client.forTestnet();
  
  // Set operator account
  const operatorId = process.env.HEDERA_TESTNET_ACCOUNT_ID;
  const operatorKey = process.env.HEDERA_TESTNET_PRIVATE_KEY;
  
  if (!operatorId || !operatorKey) {
    console.log("Please set HEDERA_TESTNET_ACCOUNT_ID and HEDERA_TESTNET_PRIVATE_KEY in your .env.local file");
    console.log("You can get testnet credentials from: https://portal.hedera.com/register");
    return;
  }
  
  client.setOperator(operatorId, operatorKey);
  
  try {
    console.log("🔑 Creating KeyList with 3 public keys...\n");
    
    // Convert string public keys to PublicKey objects
    const publicKeys: PublicKey[] = PUBLIC_KEYS.map((keyString, index) => {
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
        console.error(`Error: ${error}`);
        throw new Error(`Failed to parse public key ${index + 1}`);
      }
    });
    
    // Create a threshold KeyList - 2 of 3 keys required to sign
    const keyList = new KeyList(publicKeys, 2);
    
    console.log("KeyList created:");
    console.log(`Keys: ${keyList._keys.length}`);
    console.log(`Threshold: 2 of 3 keys required`);
    console.log(`Structure: ${keyList.toString()}\n`);
    
    // Create an account with this KeyList as admin key
    console.log("Creating test account with KeyList as admin key...");
    
    const accountCreateTx = new AccountCreateTransaction()
      .setKey(keyList)
      .setInitialBalance(new Hbar(1))
      .setAccountMemo("KeyRing Protocol KeyList Test Account")
      .freezeWith(client);
    
    const accountCreateSign = await accountCreateTx.sign(PrivateKey.fromString(operatorKey));
    const accountCreateSubmit = await accountCreateSign.execute(client);
    const accountCreateRx = await accountCreateSubmit.getReceipt(client);
    const accountId = accountCreateRx.accountId;
    
    if (!accountId) {
      throw new Error("Failed to create account - no account ID returned");
    }
    
    console.log(`✅ Account created: ${accountId}\n`);
    
    // Query account info to see the KeyList structure on-chain
    console.log("Querying account info to see on-chain key structure...");
    const accountInfo = await new AccountInfoQuery()
      .setAccountId(accountId)
      .execute(client);
    
    console.log("📊 On-Chain Account Information:");
    console.log(`Account ID: ${accountInfo.accountId}`);
    console.log(`Balance: ${accountInfo.balance}`);
    console.log(`Account Memo: ${accountInfo.accountMemo}`);
    console.log(`Key Structure: ${accountInfo.key}`);
    console.log(`Key Type: ${accountInfo.key?.constructor.name}`);
    
    if (accountInfo.key instanceof KeyList) {
      console.log(`Number of Keys: ${accountInfo.key._keys.length}`);
      console.log("Individual Keys:");
      accountInfo.key._keys.forEach((key: any, index: number) => {
        console.log(`  Key ${index + 1}: ${key.toString()}`);
      });
    }
    
    console.log("\n🎉 KeyList created successfully on Hedera testnet!");
    
  } catch (error) {
    console.error("❌ Error creating KeyList:", error);
  } finally {
    client.close();
  }
}

// Run the script
if (require.main === module) {
  createThresholdKeyList();
}

export { createThresholdKeyList };
