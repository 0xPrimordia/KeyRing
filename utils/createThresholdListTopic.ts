import {
  Client,
  TopicCreateTransaction,
  PrivateKey,
  PublicKey,
  KeyList,
} from '@hashgraph/sdk';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

// Fallback keys when memberPublicKeyStrings not provided (same as createThresholdListAccount)
const FALLBACK_PUBLIC_KEYS = [
  '302a300506032b65700321005f2a9826bef0c082e6e885c46022969da4120f5143b9c5413f79eabbba0cb399',
  '59345a9c8b6112ccc1a3c636d6bc0d2c42477013f3d9f107f0db39b53a5cbb07',
  '0158a26e9dc97312aaf7e8811f3223e5a30b6676a0b58518d062d38418de8eb8',
];

/**
 * Creates an HCS-2 indexed topic for a threshold list (rejections, activity, multi-sig communication).
 * @param thresholdListId - The threshold list account ID
 * @param connectedAccountId - The connected user's account ID (for fallback key fetch)
 * @param memberPublicKeyStrings - Optional: explicit list of public keys (DER or hex). If provided, used instead of fetching.
 * @returns The newly created topic ID
 */
export async function createThresholdListTopic(
  thresholdListId: string,
  connectedAccountId: string,
  memberPublicKeyStrings?: string[]
): Promise<string> {
  const network = process.env.NEXT_PUBLIC_HEDERA_NETWORK || 'testnet';
  const isMainnet = network === 'mainnet';
  const client = isMainnet ? Client.forMainnet() : Client.forTestnet();

  const operatorId = isMainnet
    ? process.env.HEDERA_MAINNET_ACCOUNT_ID
    : process.env.HEDERA_TESTNET_ACCOUNT_ID;
  const operatorKey = isMainnet
    ? process.env.HEDERA_MAINNET_PRIVATE_KEY
    : process.env.HEDERA_TESTNET_PRIVATE_KEY;

  if (!operatorId || !operatorKey) {
    throw new Error(
      'Please set HEDERA_*_ACCOUNT_ID and HEDERA_*_PRIVATE_KEY in .env.local'
    );
  }

  client.setOperator(operatorId, operatorKey);

  const mirrorNodeUrl = isMainnet
    ? 'https://mainnet.mirrornode.hedera.com'
    : 'https://testnet.mirrornode.hedera.com';

  try {
    let allKeyStrings: string[];

    if (memberPublicKeyStrings && memberPublicKeyStrings.length > 0) {
      allKeyStrings = memberPublicKeyStrings;
    } else {
      const accountResponse = await fetch(
        `${mirrorNodeUrl}/api/v1/accounts/${connectedAccountId}`
      );
      if (!accountResponse.ok) {
        throw new Error(
          `Failed to fetch account info for ${connectedAccountId}`
        );
      }
      const accountData = await accountResponse.json();
      const connectedPublicKey =
        accountData.key?._type === 'ED25519' ? accountData.key.key : null;
      if (!connectedPublicKey) {
        throw new Error(
          `Could not retrieve public key for ${connectedAccountId}`
        );
      }
      allKeyStrings = [
        connectedPublicKey,
        ...FALLBACK_PUBLIC_KEYS.slice(0, 2),
      ];
    }

    const publicKeys: PublicKey[] = allKeyStrings.map((keyString, index) => {
      try {
        if (keyString.startsWith('302a')) {
          return PublicKey.fromString(keyString);
        }
        if (keyString.startsWith('302e020100')) {
          const privateKey = PrivateKey.fromString(keyString);
          return privateKey.publicKey;
        }
        if (keyString.length === 64) {
          return PublicKey.fromBytesED25519(Buffer.from(keyString, 'hex'));
        }
        return PublicKey.fromString(keyString);
      } catch (error) {
        console.error(`Error parsing key ${index + 1}:`, error);
        throw new Error(`Failed to parse public key ${index + 1}`);
      }
    });

    const submitKeyList = new KeyList(publicKeys, 1);

    const createTopicTx = new TopicCreateTransaction()
      .setTopicMemo(`hcs-2:0:86400|${thresholdListId}`)
      .setSubmitKey(submitKeyList);

    const createResponse = await createTopicTx.execute(client);
    const createReceipt = await createResponse.getReceipt(client);
    const topicId = createReceipt.topicId;

    if (!topicId) {
      throw new Error('Failed to create topic - no topic ID returned');
    }

    return topicId.toString();
  } catch (error) {
    console.error('Error creating threshold list topic:', error);
    throw error;
  } finally {
    client.close();
  }
}

// CLI entry point
if (require.main === module) {
  const thresholdListId = process.argv[2];
  const connectedAccountId = process.argv[3];

  if (!thresholdListId || !connectedAccountId) {
    console.error(
      'Usage: npm run threshold:topic <threshold-list-id> <connected-account-id>'
    );
    process.exit(1);
  }

  createThresholdListTopic(thresholdListId, connectedAccountId)
    .then((id) => {
      console.log('Topic created:', id);
      process.exit(0);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
