/**
 * Create a threshold list on Hedera testnet using:
 * 1. Testnet signers from the DB (verified, is_testnet=true, Hedera accounts with public_key)
 * 2. Validation agent public key (hex)
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

const VALIDATION_AGENT_PUBLIC_KEY = 'b2f7ccaf824ab0d9cd712a505201334cedea1875e03315cdbf9dff1ae2b85fd0';

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
  console.log('🔑 Creating testnet threshold list\n');

  const { supabase } = await import('../lib/supabase');
  console.log('Fetching testnet signers from DB...');

  const { data: signers, error } = await supabase
    .from('keyring_signers')
    .select('id, account_id, code_name, public_key')
    .eq('is_testnet', true)
    .eq('account_type', 'hedera')
    .eq('verification_status', 'verified')
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
    console.log('No testnet signers with public keys found in DB.');
  }

  const allKeyStrings = [...keysFromDb, VALIDATION_AGENT_PUBLIC_KEY];
  console.log(`\nTotal keys: ${allKeyStrings.length} (${keysFromDb.length} from DB + 1 validation agent)\n`);

  const publicKeys: PublicKey[] = [];
  for (let i = 0; i < allKeyStrings.length; i++) {
    try {
      publicKeys.push(parsePublicKey(allKeyStrings[i]));
    } catch (e) {
      console.error(`Failed to parse key ${i + 1}:`, allKeyStrings[i]);
      throw e;
    }
  }

  const operatorId = process.env.HEDERA_TESTNET_ACCOUNT_ID;
  const operatorKey = process.env.HEDERA_TESTNET_PRIVATE_KEY;

  if (!operatorId || !operatorKey) {
    console.error('Set HEDERA_TESTNET_ACCOUNT_ID and HEDERA_TESTNET_PRIVATE_KEY in .env.local');
    process.exit(1);
  }

  const client = Client.forTestnet();
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
    .setAccountMemo('KeyRing Testnet Threshold List')
    .freezeWith(client);

  const signed = await tx.sign(operatorPrivateKey);
  const response = await signed.execute(client);
  const receipt = await response.getReceipt(client);
  const accountId = receipt.accountId;

  if (!accountId) {
    throw new Error('No account ID returned');
  }

  console.log(`✅ Threshold list account created: ${accountId}\n`);
  console.log('View on HashScan: https://hashscan.io/testnet/account/' + accountId.toString());
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
