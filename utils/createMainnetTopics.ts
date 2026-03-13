/**
 * Create all KeyRing mainnet HCS topics with proper submit-key protection.
 *
 * Usage: NEXT_PUBLIC_HEDERA_NETWORK=mainnet npx tsx utils/createMainnetTopics.ts
 *
 * You provide the accounts/keys for each topic. Set these env vars with the
 * account IDs or public keys (hex) that should be allowed to post:
 *
 *   ADMIN_THRESHOLD_ACCOUNT_ID     - for OPERATOR_INBOUND (who can send set-admin msgs)
 *   ADMIN_THRESHOLD_PUBLIC_KEYS    - OR comma-separated hex keys if fetch fails
 *   PASSIVE_AGENT_1_PUBLIC_KEY     - for PROJECT_REJECTION
 *   PASSIVE_AGENT_2_PUBLIC_KEY     - for PROJECT_REJECTION
 *   VALIDATION_AGENT_PUBLIC_KEY    - for PROJECT_VALIDATOR
 *
 * For threshold: use account ID (we fetch keys) or ADMIN_THRESHOLD_PUBLIC_KEYS (paste keys).
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

import {
  Client,
  TopicCreateTransaction,
  TopicInfoQuery,
  PrivateKey,
  PublicKey,
  KeyList,
} from '@hashgraph/sdk';

const MIRROR_MAINNET = 'https://mainnet.mirrornode.hedera.com';

function parsePublicKey(keyString: string, index: number): PublicKey {
  const trimmed = (keyString || '').trim().replace(/^0x/, '');
  try {
    if (trimmed.startsWith('302a')) {
      return PublicKey.fromString(trimmed);
    }
    if (trimmed.startsWith('302e020100')) {
      return PrivateKey.fromStringDer(trimmed).publicKey;
    }
    if (trimmed.length === 64 && /^[0-9a-fA-F]+$/.test(trimmed)) {
      return PublicKey.fromBytesED25519(Buffer.from(trimmed, 'hex'));
    }
    return PublicKey.fromString(trimmed);
  } catch (e) {
    console.error(`Failed to parse key ${index + 1}:`, keyString?.substring(0, 30) + '...');
    throw e;
  }
}

async function fetchKeysFromAccount(accountId: string): Promise<string[]> {
  const res = await fetch(`${MIRROR_MAINNET}/api/v1/accounts/${accountId}`);
  if (!res.ok) throw new Error(`Failed to fetch account ${accountId}: ${res.statusText}`);
  const data = await res.json();
  const key = data.key;
  if (!key) throw new Error(`No key on account ${accountId}`);

  function extractKeys(k: { _type?: string; key?: string; keys?: unknown[] }): string[] {
    if (k._type === 'ED25519' && k.key) return [k.key];
    if (k._type === 'KeyList' && Array.isArray(k.keys)) {
      return k.keys.flatMap((item: unknown) => {
        const obj = item as { key?: string; keys?: unknown[] };
        if (obj.key) return [obj.key];
        if (Array.isArray(obj.keys)) return extractKeys(obj as { keys: unknown[] });
        return [];
      });
    }
    if (k.key) return [k.key];
    return [];
  }

  const keys = extractKeys(key);
  if (keys.length === 0) throw new Error(`Could not extract keys from account ${accountId}`);
  return keys;
}

async function getOrCreateTopic(
  client: Client,
  envVar: string,
  topicId: string | undefined,
  memo: string,
  submitKey: PublicKey | KeyList
): Promise<string> {
  if (topicId && topicId !== '0.0.0') {
    try {
      await new TopicInfoQuery().setTopicId(topicId).execute(client);
      console.log(`  ✓ Using existing ${envVar}: ${topicId}`);
      return topicId;
    } catch {
      console.log(`  ⚠ ${envVar} not found, creating new topic...`);
    }
  }

  const tx = new TopicCreateTransaction()
    .setTopicMemo(memo)
    .setSubmitKey(submitKey);
  const response = await tx.execute(client);
  const receipt = await response.getReceipt(client);
  const newId = receipt.topicId?.toString();
  if (!newId) throw new Error('No topic ID returned');
  console.log(`  ✓ Created ${envVar}: ${newId}`);
  return newId;
}

async function main() {
  const network = process.env.NEXT_PUBLIC_HEDERA_NETWORK || 'testnet';
  if (network !== 'mainnet') {
    console.error('Set NEXT_PUBLIC_HEDERA_NETWORK=mainnet to run this script');
    process.exit(1);
  }

  const accountId = process.env.HEDERA_MAINNET_ACCOUNT_ID;
  const privateKeyStr = process.env.HEDERA_MAINNET_PRIVATE_KEY;
  if (!accountId || !privateKeyStr) {
    console.error('Set HEDERA_MAINNET_ACCOUNT_ID and HEDERA_MAINNET_PRIVATE_KEY');
    process.exit(1);
  }

  const operatorKey = privateKeyStr.startsWith('302e')
    ? PrivateKey.fromStringDer(privateKeyStr)
    : PrivateKey.fromString(privateKeyStr);

  const client = Client.forMainnet();
  client.setOperator(accountId, operatorKey);

  console.log('\n🔐 KeyRing Mainnet Topics Setup\n');
  console.log('Operator:', accountId);
  console.log('');

  const updates: Array<{ key: string; value: string }> = [];

  // 1. PROJECT_REGISTRY_TOPIC_MAINNET — operator posts project registrations
  {
    console.log('1. PROJECT_REGISTRY_TOPIC_MAINNET (operator only)');
    const existing = process.env.PROJECT_REGISTRY_TOPIC_MAINNET;
    const id = await getOrCreateTopic(
      client,
      'PROJECT_REGISTRY_TOPIC_MAINNET',
      existing,
      'hcs-2:0:86400|KeyRing project registry',
      operatorKey.publicKey
    );
    if (id !== existing) updates.push({ key: 'PROJECT_REGISTRY_TOPIC_MAINNET', value: id });
  }

  // 2. OPERATOR_INBOUND_TOPIC_ID — admin threshold sends set-admin requests
  {
    console.log('\n2. OPERATOR_INBOUND_TOPIC_ID (admin threshold only)');
    const adminAccountId = process.env.ADMIN_THRESHOLD_ACCOUNT_ID;
    let submitKey: PublicKey | KeyList;

    if (adminAccountId) {
      const keys = await fetchKeysFromAccount(adminAccountId);
      const keyList = new KeyList(keys.map((k, i) => parsePublicKey(k, i)), 1);
      submitKey = keyList;
      console.log(`   Using ${keys.length} key(s) from threshold account ${adminAccountId}`);
    } else {
      submitKey = operatorKey.publicKey;
      console.log('   ADMIN_THRESHOLD_ACCOUNT_ID not set — using operator key');
    }

    const existing = process.env.OPERATOR_INBOUND_TOPIC_ID;
    const id = await getOrCreateTopic(
      client,
      'OPERATOR_INBOUND_TOPIC_ID',
      existing,
      'hcs-2:0:86400|KeyRing operator inbound',
      submitKey
    );
    if (id !== existing) updates.push({ key: 'OPERATOR_INBOUND_TOPIC_ID', value: id });
  }

  // 3. PROJECT_REJECTION_TOPIC — passive agents post rejections
  {
    console.log('\n3. PROJECT_REJECTION_TOPIC (passive agents only)');
    const p1 = process.env.PASSIVE_AGENT_1_PUBLIC_KEY;
    const p2 = process.env.PASSIVE_AGENT_2_PUBLIC_KEY;
    if (!p1 || !p2) {
      console.error('   Set PASSIVE_AGENT_1_PUBLIC_KEY and PASSIVE_AGENT_2_PUBLIC_KEY');
      process.exit(1);
    }
    const keys = [parsePublicKey(p1, 0), parsePublicKey(p2, 1)];
    const submitKey = new KeyList(keys, 1);

    const existing = process.env.PROJECT_REJECTION_TOPIC;
    const id = await getOrCreateTopic(
      client,
      'PROJECT_REJECTION_TOPIC',
      existing,
      'hcs-2:0:86400|KeyRing agent rejections',
      submitKey
    );
    if (id !== existing) updates.push({ key: 'PROJECT_REJECTION_TOPIC', value: id });
  }

  // 4. PROJECT_VALIDATOR_TOPIC — validation agent posts reviews
  {
    console.log('\n4. PROJECT_VALIDATOR_TOPIC (validation agent only)');
    const vKey = process.env.VALIDATION_AGENT_PUBLIC_KEY || process.env.NEXT_PUBLIC_VALIDATION_AGENT_PUBLIC_KEY;
    if (!vKey) {
      console.error('   Set VALIDATION_AGENT_PUBLIC_KEY');
      process.exit(1);
    }
    const submitKey = parsePublicKey(vKey, 0);

    const existing = process.env.PROJECT_VALIDATOR_TOPIC;
    const id = await getOrCreateTopic(
      client,
      'PROJECT_VALIDATOR_TOPIC',
      existing,
      'hcs-2:0:86400|KeyRing validator reviews',
      submitKey
    );
    if (id !== existing) updates.push({ key: 'PROJECT_VALIDATOR_TOPIC', value: id });
  }

  client.close();

  if (updates.length > 0) {
    console.log('\n📋 Add/update these in .env.local:\n');
    updates.forEach(({ key, value }) => console.log(`${key}=${value}`));
    console.log('');
  }

  console.log('✅ Mainnet topics setup complete.\n');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
