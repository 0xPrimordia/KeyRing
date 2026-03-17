import { NextRequest, NextResponse } from 'next/server';
import { KeyRingDB } from '../../../../../lib/keyring-db';
import { createThresholdListAccount } from '../../../../../utils/createThresholdListAccount';
import { createConfigurableThresholdList } from '../../../../../utils/createConfigurableThresholdList';
import { createThresholdListTopic } from '../../../../../utils/createThresholdListTopic';

export const dynamic = 'force-dynamic';

async function fetchPublicKeyFromMirrorNode(accountId: string, network: string): Promise<string> {
  const mirrorNodeUrl =
    network === 'mainnet'
      ? 'https://mainnet.mirrornode.hedera.com'
      : 'https://testnet.mirrornode.hedera.com';
  const res = await fetch(`${mirrorNodeUrl}/api/v1/accounts/${accountId}`);
  if (!res.ok) throw new Error(`Failed to fetch account ${accountId}: ${res.status}`);
  const data = await res.json();
  const key = data.key?.key;
  if (!key) throw new Error(`No ED25519 public key for account ${accountId}`);
  return key;
}

interface CreateRequestBody {
  accountId?: string;
  projectId?: string;
  threshold?: number | string;
  signerPublicKeys?: string[];
  signerCount?: number;
  includeOperator?: boolean;
  includePassiveAgents?: boolean;
  includeValidatorAgent?: boolean;
  initialBalanceHbar?: number;
  memo?: string;
}

/**
 * POST /api/threshold-lists/create
 * Creates a new threshold list for the operator.
 * Body: { accountId, projectId?, threshold?, signerPublicKeys?, includePassiveAgents?, initialBalanceHbar?, memo? }
 * When threshold/signerPublicKeys provided, uses configurable flow. Otherwise uses default 2-of-3.
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as CreateRequestBody;
    const {
      accountId,
      projectId,
      threshold: rawThreshold,
      signerPublicKeys,
      signerCount,
      includeOperator,
      includePassiveAgents,
      includeValidatorAgent,
      initialBalanceHbar,
      memo,
    } = body;

    // Ensure threshold is a number (form may send string from number input)
    const threshold =
      typeof rawThreshold === 'number' && !Number.isNaN(rawThreshold)
        ? rawThreshold
        : typeof rawThreshold === 'string'
          ? parseInt(rawThreshold, 10)
          : undefined;
    const thresholdValid =
      typeof threshold === 'number' && threshold >= 1 && !Number.isNaN(threshold);

    if (!accountId || !accountId.match(/^\d+\.\d+\.\d+$/)) {
      return NextResponse.json(
        { success: false, error: 'Valid accountId (0.0.xxxxx) is required' },
        { status: 400 }
      );
    }

    const operatorAccountId = process.env.NEXT_PUBLIC_LYNX_OPERATOR_ACCOUNT_ID;
    if (!operatorAccountId || accountId !== operatorAccountId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Only the configured operator can create threshold lists',
        },
        { status: 403 }
      );
    }

    const network = process.env.NEXT_PUBLIC_HEDERA_NETWORK || 'testnet';
    const isTestnet = network === 'testnet';

    let resolvedSignerPublicKeys: string[] | undefined;
    if (signerCount != null && typeof signerCount === 'number' && signerCount >= 1) {
      const signers = await KeyRingDB.getRandomSignersForThreshold(isTestnet, signerCount);
      if (signers.length < signerCount) {
        return NextResponse.json(
          {
            success: false,
            error: `Only ${signers.length} signers available, requested ${signerCount}`,
          },
          { status: 400 }
        );
      }
      const publicKeys: string[] = [];
      for (const s of signers) {
        try {
          const pk = await fetchPublicKeyFromMirrorNode(s.account_id, network);
          publicKeys.push(pk);
        } catch (err) {
          return NextResponse.json(
            {
              success: false,
              error: `Failed to fetch public key for ${s.account_id}: ${err instanceof Error ? err.message : 'Unknown error'}`,
            },
            { status: 400 }
          );
        }
      }
      resolvedSignerPublicKeys = publicKeys;
    } else if (Array.isArray(signerPublicKeys) && signerPublicKeys.length > 0) {
      resolvedSignerPublicKeys = signerPublicKeys.filter((k) => k?.trim());
    }

    const useConfigurable =
      thresholdValid && resolvedSignerPublicKeys && resolvedSignerPublicKeys.length > 0;

    let thresholdAccountId: string;
    let memberPublicKeyStrings: string[] | undefined;

    if (useConfigurable && thresholdValid && threshold != null && resolvedSignerPublicKeys) {
      const result = await createConfigurableThresholdList({
        connectedAccountId: accountId,
        threshold,
        signerPublicKeys: resolvedSignerPublicKeys,
        includeOperator: includeOperator !== false,
        includePassiveAgents: !!includePassiveAgents,
        includeValidatorAgent: !!includeValidatorAgent,
        initialBalanceHbar,
        memo,
      });
      thresholdAccountId = result.accountId;
      memberPublicKeyStrings = result.allPublicKeyStrings;
    } else {
      thresholdAccountId = await createThresholdListAccount(accountId);
    }

    // Step 2: Create HCS-2 topic for the threshold list
    const hcsTopicId = await createThresholdListTopic(
      thresholdAccountId,
      accountId,
      memberPublicKeyStrings
    );

    // Step 3: Save to database
    const result = await KeyRingDB.registerThresholdList({
      projectId: projectId || null,
      hcsTopicId,
      thresholdAccountId,
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to save threshold list' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      thresholdList: {
        id: result.list?.id,
        thresholdAccountId,
        hcsTopicId,
        projectId: projectId || null,
      },
    });
  } catch (error) {
    console.error(
      '[API] Error creating threshold list:',
      error instanceof Error ? error.message : error
    );
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to create threshold list',
      },
      { status: 500 }
    );
  }
}
