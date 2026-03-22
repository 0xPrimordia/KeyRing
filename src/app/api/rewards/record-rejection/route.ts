import { NextRequest, NextResponse } from 'next/server';
import { KeyRingDB } from '../../../../../lib/keyring-db';
import { supabase } from '../../../../../lib/supabase';
import { getMirrorNodeUrl, fetchScheduleFromMirrorNode } from '../../../../../lib/mirror-node';
import { reassembleHcsMessages } from '../../../../../lib/hcs-messages';

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function verifyRejectionOnChain(
  topicId: string,
  scheduleId: string,
  accountId: string
): Promise<{ verified: boolean; error?: string }> {
  const mirrorNodeUrl = getMirrorNodeUrl();

  const delays = [0, 4000, 6000];
  for (const delay of delays) {
    if (delay > 0) {
      console.log(`[API] Rejection not found yet, retrying in ${delay}ms...`);
      await sleep(delay);
    }

    try {
      const res = await fetch(
        `${mirrorNodeUrl}/api/v1/topics/${topicId}/messages?limit=50&order=desc`
      );
      if (!res.ok) continue;

      const data = await res.json();
      const reassembled = reassembleHcsMessages(data.messages || []);

      for (const { payload } of reassembled) {
        try {
          const parsed = JSON.parse(payload);
          if (
            parsed.type === 'rejection' &&
            parsed.scheduleId === scheduleId &&
            parsed.signer === accountId
          ) {
            return { verified: true };
          }
        } catch {
          // skip unparseable
        }
      }
    } catch {
      // retry
    }
  }

  return { verified: false, error: 'Rejection message not found on topic after retries' };
}

/**
 * POST /api/rewards/record-rejection
 * Records a reward for posting a rejection message on an HCS topic.
 * Verifies the rejection exists on-chain before granting the reward.
 */
export async function POST(request: NextRequest) {
  try {
    const { accountId, scheduleId, topicId } = await request.json();

    if (!accountId || !scheduleId || !topicId) {
      return NextResponse.json(
        { error: 'accountId, scheduleId, and topicId are required' },
        { status: 400 }
      );
    }

    console.log('[API] Recording rejection reward:', { accountId, scheduleId, topicId });

    const signer = await KeyRingDB.getSignerByAccountId(accountId);
    if (!signer) {
      return NextResponse.json(
        { success: false, error: 'Signer not found. Please complete your registration first.' },
        { status: 404 }
      );
    }

    // Dedup: block if signer already has a reward for this schedule (approval OR rejection)
    const { count, error: countErr } = await supabase
      .from('keyring_rewards')
      .select('*', { count: 'exact', head: true })
      .eq('signer_id', signer.id)
      .eq('schedule_id', scheduleId)
      .in('reward_type', ['transaction_review', 'transaction_rejection']);

    if (!countErr && (count ?? 0) > 0) {
      console.log('[API] Duplicate rejection reward blocked:', { signerId: signer.id, scheduleId });
      return NextResponse.json(
        { success: false, error: 'Reward already recorded for this schedule', duplicate: true },
        { status: 409 }
      );
    }

    // On-chain verification: confirm rejection message exists on the HCS topic
    const { verified, error: verifyErr } = await verifyRejectionOnChain(topicId, scheduleId, accountId);
    if (!verified) {
      console.warn('[API] On-chain rejection verification failed:', verifyErr);
      return NextResponse.json(
        { success: false, error: verifyErr || 'Could not verify rejection on-chain' },
        { status: 403 }
      );
    }

    // Check if this is a boost schedule (KYRNG only) or a project schedule (LYNX + KYRNG)
    const scheduleData = await fetchScheduleFromMirrorNode(scheduleId);
    const isBoost = scheduleData?.memo?.startsWith('Boost:') ?? false;

    let lynxAmount = 0;
    if (!isBoost) {
      const lynxResult = await KeyRingDB.addReward(
        signer.id, 'transaction_rejection', 5, 'LYNX', undefined, scheduleId
      );
      if (!lynxResult.success) {
        console.error('[API] Failed to create LYNX rejection reward:', lynxResult.error);
      } else {
        lynxAmount = 5;
      }
    }

    const keyringResult = await KeyRingDB.addReward(
      signer.id, 'transaction_rejection', 50, 'KYRNG', undefined, scheduleId
    );

    if (!keyringResult.success) {
      console.error('[API] Failed to create KYRNG rejection reward:', keyringResult.error);
      return NextResponse.json(
        { success: false, error: 'Failed to record reward' },
        { status: 500 }
      );
    }

    console.log('[API] Rejection rewards recorded:', { signerId: signer.id, lynx: lynxAmount, keyring: 50, isBoost });

    return NextResponse.json({
      success: true,
      reward: { lynx: lynxAmount, keyring: 50, scheduleId },
    });
  } catch (error) {
    console.error('[API] Failed to record rejection reward:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to record rejection reward' },
      { status: 500 }
    );
  }
}
