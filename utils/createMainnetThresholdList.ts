/**
 * Create a threshold list on Hedera mainnet using:
 * 1. Mainnet signers from the DB (verified, is_testnet=false, Hedera accounts with public_key)
 * 2. Validation agent public key (hex)
 *
 * Usage: NEXT_PUBLIC_HEDERA_NETWORK=mainnet npx tsx utils/createMainnetThresholdList.ts
 *
 * Requires: HEDERA_MAINNET_ACCOUNT_ID, HEDERA_MAINNET_PRIVATE_KEY
 * Output: Add THRESHOLD_LIST_ACCOUNT_MAINNET=<accountId> to .env.local
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

import {
  Client,
  PrivateKey,
  PublicKey,
  KeyList,
  AccountCreateTransaction,
  Hbar
} from '@hashgraph/sdk';

const VALIDATION_AGENT_PUBLIC_KEY = process.env.VALIDATION_AGENT_PUBLIC_KEY || process.env.NEXT_PUBLIC_VALIDATION_AGENT_PUBLIC_KEY;

function parsePublicKey(keyString: string): PublicKey {
  const trimmed = keyString.trim().replace(/^0x/, '');
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
}

async function main() {
  const network = process.env.NEXT_PUBLIC_HEDERA_NETWORK || 'testnet';
  if (network !== 'mainnet') {
    console.error('Set NEXT_PUBLIC_HEDERA_NETWORK=mainnet to run this script');
    process.exit(1);
  }

  console.log('🔑 Creating mainnet threshold list\n');

  const { supabase } = await import('../lib/supabase');
  console.log('Fetching mainnet signers from DB (is_testnet=false)...');

  const { data: signers, error } = await supabase
    .from('keyring_signers')
    .select('id, account_id, code_name, public_key, verification_status')
    .eq('is_testnet', false)
    .eq('account_type', 'hedera')
    .in('verification_status', ['verified', 'pending'])
    .not('public_key', 'is', null);

  if (error) {
    console.error('DB error:', error);
    process.exit(1);
  }

  const keysFromDb: string[] = [];
  for (const s of signers || []) {
    if (s.public_key) {
      keysFromDb.push(s.public_key);
      console.log(`  - ${s.account_id} (${s.code_name})`);
    }
  }

  if (keysFromDb.length === 0) {
    console.log('No mainnet signers with public keys found in DB.');
  }

  const allKeyStrings = VALIDATION_AGENT_PUBLIC_KEY
    ? [...keysFromDb, VALIDATION_AGENT_PUBLIC_KEY]
    : keysFromDb;
  console.log(`\nTotal keys: ${allKeyStrings.length} (${keysFromDb.length} from DB${VALIDATION_AGENT_PUBLIC_KEY ? ' + 1 validation agent' : ''})\n`);

  if (allKeyStrings.length < 2) {
    console.error('Need at least 2 keys. Add mainnet signers (is_testnet=false) or set VALIDATION_AGENT_PUBLIC_KEY.');
    process.exit(1);
  }

  const publicKeys: PublicKey[] = [];
  for (let i = 0; i < allKeyStrings.length; i++) {
    try {
      publicKeys.push(parsePublicKey(allKeyStrings[i]));
    } catch (e) {
      console.error(`Failed to parse key ${i + 1}:`, allKeyStrings[i]);
      throw e;
    }
  }

  const operatorId = process.env.HEDERA_MAINNET_ACCOUNT_ID;
  const operatorKey = process.env.HEDERA_MAINNET_PRIVATE_KEY;

  if (!operatorId || !operatorKey) {
    console.error('Set HEDERA_MAINNET_ACCOUNT_ID and HEDERA_MAINNET_PRIVATE_KEY in .env.local');
    process.exit(1);
  }

  const client = Client.forMainnet();
  const operatorPrivateKey = operatorKey.startsWith('302e')
    ? PrivateKey.fromStringDer(operatorKey)
    : PrivateKey.fromString(operatorKey);
  client.setOperator(operatorId, operatorPrivateKey);

  const threshold = Math.max(2, Math.ceil(publicKeys.length / 2));
  const keyList = new KeyList(publicKeys, threshold);

  console.log(`Threshold: ${threshold} of ${publicKeys.length} required\n`);

  const tx = new AccountCreateTransaction()
    .setKey(keyList)
    .setInitialBalance(new Hbar(1))
    .setAccountMemo('KeyRing Mainnet Threshold List')
    .freezeWith(client);

  const signed = await tx.sign(operatorPrivateKey);
  const response = await signed.execute(client);
  const receipt = await response.getReceipt(client);
  const accountId = receipt.accountId;

  if (!accountId) {
    throw new Error('No account ID returned');
  }

  console.log(`✅ Mainnet threshold list account created: ${accountId}\n`);
  console.log('View on HashScan: https://hashscan.io/mainnet/account/' + accountId.toString());
  console.log('\n📋 Add to .env.local:\n');
  console.log(`THRESHOLD_LIST_ACCOUNT_MAINNET=${accountId.toString()}\n`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
