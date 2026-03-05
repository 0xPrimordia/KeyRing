import {
  Client,
  PrivateKey,
  PublicKey,
  KeyList,
  AccountCreateTransaction,
  Hbar,
} from '@hashgraph/sdk';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

function parsePublicKey(keyString: string, index: number): PublicKey {
  try {
    if (keyString.startsWith('302a')) {
      return PublicKey.fromString(keyString);
    }
    if (keyString.startsWith('302e020100')) {
      const privateKey = PrivateKey.fromString(keyString);
      return privateKey.publicKey;
    }
    if (keyString.length === 64 && /^[0-9a-fA-F]+$/.test(keyString)) {
      return PublicKey.fromBytesED25519(Buffer.from(keyString, 'hex'));
    }
    return PublicKey.fromString(keyString);
  } catch (error) {
    console.error(`Error parsing key ${index + 1}:`, error);
    throw new Error(`Failed to parse public key ${index + 1}`);
  }
}

export interface CreateThresholdListConfig {
  connectedAccountId: string;
  threshold: number;
  signerPublicKeys: string[];
  includePassiveAgents: boolean;
  includeValidatorAgent?: boolean;
  initialBalanceHbar?: number;
  memo?: string;
}

/**
 * Creates a threshold list account with configurable keys and threshold.
 * Keys: [connected account, ...signerPublicKeys, ...(if passive) passiveAgent1, passiveAgent2, ...(if validator) validationAgent]
 */
export async function createConfigurableThresholdList(
  config: CreateThresholdListConfig
): Promise<{ accountId: string; allPublicKeyStrings: string[] }> {
  const network = process.env.NEXT_PUBLIC_HEDERA_NETWORK || 'testnet';
  const isMainnet = network === 'mainnet';
  const operatorId = isMainnet
    ? process.env.HEDERA_MAINNET_ACCOUNT_ID
    : process.env.HEDERA_TESTNET_ACCOUNT_ID;
  const operatorKey = isMainnet
    ? process.env.HEDERA_MAINNET_PRIVATE_KEY
    : process.env.HEDERA_TESTNET_PRIVATE_KEY;

  if (!operatorId || !operatorKey) {
    throw new Error(
      'Please set HEDERA_TESTNET_ACCOUNT_ID/PRIVATE_KEY or HEDERA_MAINNET_ACCOUNT_ID/PRIVATE_KEY'
    );
  }

  const client = isMainnet
    ? Client.forMainnet()
    : Client.forTestnet();
  client.setOperator(operatorId, operatorKey);

  const mirrorNodeUrl = isMainnet
    ? 'https://mainnet.mirrornode.hedera.com'
    : 'https://testnet.mirrornode.hedera.com';

  try {
    // 1. Fetch connected account public key
    const accountRes = await fetch(
      `${mirrorNodeUrl}/api/v1/accounts/${config.connectedAccountId}`
    );
    if (!accountRes.ok) {
      throw new Error(
        `Failed to fetch account info for ${config.connectedAccountId}`
      );
    }
    const accountData = await accountRes.json();
    const connectedPublicKey =
      accountData.key?._type === 'ED25519' ? accountData.key.key : null;
    if (!connectedPublicKey) {
      throw new Error(
        `Could not retrieve public key for ${config.connectedAccountId}`
      );
    }

    // 2. Build key list: connected + signers + (optional) passive agents
    const allKeyStrings: string[] = [connectedPublicKey, ...config.signerPublicKeys];

    if (config.includePassiveAgents) {
      const passive1 = process.env.PASSIVE_AGENT_1_PUBLIC_KEY?.trim();
      const passive2 = process.env.PASSIVE_AGENT_2_PUBLIC_KEY?.trim();
      if (passive1) allKeyStrings.push(passive1);
      else console.warn('[createConfigurableThresholdList] includePassiveAgents=true but PASSIVE_AGENT_1_PUBLIC_KEY is empty');
      if (passive2) allKeyStrings.push(passive2);
      else console.warn('[createConfigurableThresholdList] includePassiveAgents=true but PASSIVE_AGENT_2_PUBLIC_KEY is empty');
    }

    if (config.includeValidatorAgent) {
      const validationKey = (process.env.VALIDATION_AGENT_PUBLIC_KEY || process.env.NEXT_PUBLIC_VALIDATION_AGENT_PUBLIC_KEY)?.trim();
      if (validationKey) allKeyStrings.push(validationKey);
      else console.warn('[createConfigurableThresholdList] includeValidatorAgent=true but VALIDATION_AGENT_PUBLIC_KEY is empty');
    }

    if (allKeyStrings.length === 0) {
      throw new Error('At least one key is required');
    }

    if (config.threshold < 1 || config.threshold > allKeyStrings.length) {
      throw new Error(
        `Threshold must be between 1 and ${allKeyStrings.length} (total keys)`
      );
    }

    // 3. Parse to PublicKey objects
    const publicKeys = allKeyStrings.map((k, i) => parsePublicKey(k, i));
    const keyList = new KeyList(publicKeys, config.threshold);

    // 4. Create account
    const initialBalance = config.initialBalanceHbar ?? 5;
    const memo = config.memo ?? 'KeyRing Protocol Threshold List';

    const tx = new AccountCreateTransaction()
      .setKey(keyList)
      .setInitialBalance(new Hbar(initialBalance))
      .setAccountMemo(memo)
      .freezeWith(client);

    const operatorPrivateKey = PrivateKey.fromString(operatorKey);
    const signed = await tx.sign(operatorPrivateKey);
    const response = await signed.execute(client);
    const receipt = await response.getReceipt(client);
    const accountId = receipt.accountId;

    if (!accountId) {
      throw new Error('Failed to create account - no account ID returned');
    }

    return {
      accountId: accountId.toString(),
      allPublicKeyStrings: allKeyStrings,
    };
  } finally {
    client.close();
  }
}
