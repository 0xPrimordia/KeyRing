/**
 * POST /api/schedule-review/trigger
 * Schedules a review trigger on the ScheduleReviewTrigger contract.
 * Fetches schedule expiry from Mirror Node, sets duration to 2 minutes before expiry.
 * Topic IDs are read from AGENT_CONFIGS (inboundTopicId for first 2 agents).
 *
 * Body: { scheduleId: string }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient, createWalletClient, http, parseEther } from 'viem';

const SCHEDULE_REVIEW_ABI = [
  {
    inputs: [
      { name: 'scheduleId', type: 'string' },
      { name: 'durationSeconds', type: 'uint256' },
      { name: 'topicId1', type: 'string' },
      { name: 'topicId2', type: 'string' },
    ],
    name: 'scheduleReviewTrigger',
    outputs: [],
    stateMutability: 'payable',
    type: 'function',
  },
] as const;

const HEDERA_TOPIC_ID_REGEX = /^0\.0\.\d+$/;

function getMirrorNodeUrl(): string {
  const network = process.env.NEXT_PUBLIC_HEDERA_NETWORK || 'testnet';
  return network === 'mainnet'
    ? 'https://mainnet.mirrornode.hedera.com'
    : 'https://testnet.mirrornode.hedera.com';
}

function getPassiveAgentTopicIds(): [string, string] {
  const raw = process.env.AGENT_CONFIGS;
  if (!raw) {
    throw new Error('AGENT_CONFIGS required (JSON array with inboundTopicId)');
  }
  const configs = JSON.parse(raw) as Array<{ inboundTopicId?: string }>;
  const ids = configs
    .map((c) => c.inboundTopicId)
    .filter((id): id is string => typeof id === 'string' && id.length > 0);
  if (ids.length < 2) {
    throw new Error(
      'AGENT_CONFIGS must have at least 2 agents with inboundTopicId'
    );
  }
  const [t1, t2] = [ids[0], ids[1]];
  if (!HEDERA_TOPIC_ID_REGEX.test(t1) || !HEDERA_TOPIC_ID_REGEX.test(t2)) {
    throw new Error(
      `Invalid topic ID format (expected 0.0.XXXXX): topic1=${t1}, topic2=${t2}`
    );
  }
  return [t1, t2];
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const scheduleId = body?.scheduleId;
    if (!scheduleId || typeof scheduleId !== 'string') {
      return NextResponse.json(
        { success: false, error: 'scheduleId is required' },
        { status: 400 }
      );
    }
    if (!scheduleId.match(/^\d+\.\d+\.\d+$/)) {
      return NextResponse.json(
        { success: false, error: 'Invalid scheduleId format (expected 0.0.xxxxx)' },
        { status: 400 }
      );
    }

    const contractAddress = process.env.SCHEDULE_REVIEW_CONTRACT_ID;
    const privateKey = process.env.HEDERA_EVM_PRIVATE_KEY ||
      process.env.HEDERA_PRIVATE_KEY ||
      process.env.HEDERA_DEPLOYER_PRIVATE_KEY;
    const rpcUrl =
      process.env.HEDERA_RPC_URL || 'https://testnet.hashio.io/api';

    if (!contractAddress || !privateKey) {
      return NextResponse.json(
        {
          success: false,
          error:
            'SCHEDULE_REVIEW_CONTRACT_ID and HEDERA_EVM_PRIVATE_KEY (or HEDERA_PRIVATE_KEY) required',
        },
        { status: 500 }
      );
    }

    const [topicId1, topicId2] = getPassiveAgentTopicIds();

    // Fetch schedule from Mirror Node
    const mirrorUrl = getMirrorNodeUrl();
    const schedRes = await fetch(
      `${mirrorUrl}/api/v1/schedules/${scheduleId}`
    );
    if (!schedRes.ok) {
      return NextResponse.json(
        { success: false, error: 'Schedule not found' },
        { status: 404 }
      );
    }
    const schedule = await schedRes.json();
    const expTime = schedule.expiration_time;
    if (expTime == null || expTime === '') {
      return NextResponse.json(
        { success: false, error: 'Schedule has no expiration_time' },
        { status: 400 }
      );
    }
    const expSeconds =
      typeof expTime === 'string' ? parseFloat(expTime) : Number(expTime);
    if (Number.isNaN(expSeconds)) {
      return NextResponse.json(
        { success: false, error: 'Invalid expiration_time' },
        { status: 400 }
      );
    }

    // Duration = 2 minutes before expiry - now
    const TWO_MINUTES_SEC = 120;
    const nowSeconds = Math.floor(Date.now() / 1000);
    let durationSeconds = Math.floor(expSeconds - nowSeconds - TWO_MINUTES_SEC);

    if (durationSeconds <= 0) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Schedule expires in less than 2 minutes; cannot schedule review trigger',
        },
        { status: 400 }
      );
    }

    // Contract MAX_DURATION_SECONDS = 62 days (5356800)
    const MAX_DURATION = 62 * 24 * 60 * 60;
    if (durationSeconds > MAX_DURATION) {
      durationSeconds = MAX_DURATION;
    }

    // Hedera EVM chain ID: testnet 296, mainnet 295
    const chainId =
      process.env.NEXT_PUBLIC_HEDERA_NETWORK === 'mainnet' ? 295 : 296;

    const pk = privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`;
    const { privateKeyToAccount } = await import('viem/accounts');
    const account = privateKeyToAccount(pk as `0x${string}`);

    const chain = {
      id: chainId,
      name: 'Hedera',
      nativeCurrency: { decimals: 18, name: 'HBAR', symbol: 'HBAR' },
      rpcUrls: { default: { http: [rpcUrl] } },
    } as const;

    const transport = http(rpcUrl);
    const publicClient = createPublicClient({
      chain,
      transport,
    });
    const walletClient = createWalletClient({
      account,
      chain,
      transport,
    });

    const hash = await walletClient.writeContract({
      address: contractAddress as `0x${string}`,
      abi: SCHEDULE_REVIEW_ABI,
      functionName: 'scheduleReviewTrigger',
      args: [scheduleId, BigInt(durationSeconds), topicId1, topicId2],
      value: parseEther('1'),
      account,
    });

    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    return NextResponse.json({
      success: true,
      txHash: hash,
      blockNumber: receipt?.blockNumber?.toString(),
      durationSeconds,
      expiresAt: new Date(expSeconds * 1000).toISOString(),
    });
  } catch (err) {
    console.error('[API] schedule-review/trigger:', err);
    const message =
      err instanceof Error ? err.message : 'Failed to trigger schedule review';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
