import { NextRequest, NextResponse } from 'next/server';
import { KeyRingDB } from '../../../../../lib/keyring-db';
import { supabase } from '../../../../../lib/supabase';
import { getMirrorNodeUrl, fetchScheduleFromMirrorNode } from '../../../../../lib/mirror-node';

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function checkSignatureOnMirrorNode(
  scheduleId: string,
  publicKey: string
): Promise<boolean> {
  const mirrorNodeUrl = getMirrorNodeUrl();
  const scheduleRes = await fetch(`${mirrorNodeUrl}/api/v1/schedules/${scheduleId}`);
  if (!scheduleRes.ok) return false;
  const scheduleData = await scheduleRes.json();

  const signatures: Array<{ public_key_prefix?: string }> = scheduleData.signatures || [];
  return signatures.some((sig) => {
    if (!sig.public_key_prefix) return false;
    try {
      const sigKeyHex = Buffer.from(sig.public_key_prefix, 'base64').toString('hex');
      return sigKeyHex.includes(publicKey) || publicKey.includes(sigKeyHex.slice(0, 40));
    } catch {
      return false;
    }
  });
}

async function verifySignatureOnChain(
  scheduleId: string,
  accountId: string
): Promise<{ verified: boolean; error?: string }> {
  const mirrorNodeUrl = getMirrorNodeUrl();

  const accountRes = await fetch(`${mirrorNodeUrl}/api/v1/accounts/${accountId}`);
  if (!accountRes.ok) return { verified: false, error: 'Could not fetch account from Mirror Node' };
  const accountData = await accountRes.json();
  const publicKey = accountData.key?.key;
  if (!publicKey) return { verified: false, error: 'Could not resolve account public key' };

  // Mirror Node can take several seconds to index a new signature.
  // Retry up to 3 times with increasing delays.
  const delays = [0, 4000, 6000];
  for (const delay of delays) {
    if (delay > 0) {
      console.log(`[API] Signature not found yet, retrying in ${delay}ms...`);
      await sleep(delay);
    }
    const found = await checkSignatureOnMirrorNode(scheduleId, publicKey);
    if (found) return { verified: true };
  }

  return { verified: false, error: 'Signature not found on schedule after retries' };
}

/**
 * POST /api/rewards/record-signature
 * Records a reward for signing a scheduled transaction.
 * Checks DB for duplicate rewards and verifies signature on Mirror Node.
 */
export async function POST(request: NextRequest) {
  try {
    const { accountId, scheduleId, transactionId } = await request.json();

    if (!accountId || !scheduleId) {
      return NextResponse.json({
        error: 'accountId and scheduleId are required',
      }, { status: 400 });
    }

    console.log('[API] Recording signature reward:', { accountId, scheduleId, transactionId });

    const signer = await KeyRingDB.getSignerByAccountId(accountId);
    if (!signer) {
      return NextResponse.json({
        success: false,
        error: 'Signer not found. Please complete your registration first.',
      }, { status: 404 });
    }

    // DB dedup: block if signer already has any reward for this schedule (approval or rejection)
    const { count, error: countErr } = await supabase
      .from('keyring_rewards')
      .select('*', { count: 'exact', head: true })
      .eq('signer_id', signer.id)
      .eq('schedule_id', scheduleId)
      .in('reward_type', ['transaction_review', 'transaction_rejection']);

    if (!countErr && (count ?? 0) > 0) {
      console.log('[API] Duplicate reward blocked:', { signerId: signer.id, scheduleId });
      return NextResponse.json({
        success: false,
        error: 'Reward already recorded for this schedule',
        duplicate: true,
      }, { status: 409 });
    }

    // On-chain verification: confirm signature exists on the schedule
    const { verified, error: verifyErr } = await verifySignatureOnChain(scheduleId, accountId);
    if (!verified) {
      console.warn('[API] On-chain verification failed:', verifyErr);
      return NextResponse.json({
        success: false,
        error: verifyErr || 'Could not verify signature on-chain',
      }, { status: 403 });
    }

    // Record rewards: 5 LYNX + 50 KYRNG
    const lynxResult = await KeyRingDB.addReward(
      signer.id, 'transaction_review', 5, 'LYNX', transactionId, scheduleId
    );
    const keyringResult = await KeyRingDB.addReward(
      signer.id, 'transaction_review', 50, 'KYRNG', transactionId, scheduleId
    );

    if (!lynxResult.success || !keyringResult.success) {
      console.error('[API] Failed to create reward:', lynxResult.error || keyringResult.error);
      return NextResponse.json({
        success: false,
        error: 'Failed to record reward',
      }, { status: 500 });
    }

    console.log('[API] Signature rewards recorded:', { signerId: signer.id, lynx: 5, keyring: 50 });

    // Upsert schedule into history if not already tracked
    try {
      const { data: existing } = await supabase
        .from('keyring_schedule_history')
        .select('id')
        .eq('schedule_id', scheduleId)
        .maybeSingle();

      if (!existing) {
        const mirrorSchedule = await fetchScheduleFromMirrorNode(scheduleId);
        if (mirrorSchedule) {
          const sigCount = mirrorSchedule.signatures?.length ?? 0;
          let status: 'pending' | 'executed' | 'expired' | 'deleted' = 'pending';
          let executedAt: string | null = null;

          if (mirrorSchedule.executed_timestamp) {
            status = 'executed';
            const ts = parseFloat(mirrorSchedule.executed_timestamp);
            executedAt = new Date(ts * 1000).toISOString();
          } else if (mirrorSchedule.deleted) {
            status = 'deleted';
          }

          let expirationTime: string | null = null;
          if (mirrorSchedule.expiration_time) {
            const expSec = parseFloat(mirrorSchedule.expiration_time);
            if (!isNaN(expSec)) {
              expirationTime = new Date(expSec * 1000).toISOString();
              if (status === 'pending' && Date.now() > expSec * 1000) {
                status = 'expired';
              }
            }
          }

          await supabase.from('keyring_schedule_history').insert({
            schedule_id: scheduleId,
            project_name: 'Lynx',
            memo: mirrorSchedule.memo || null,
            payer_account_id: mirrorSchedule.payer_account_id || null,
            creator_account_id: mirrorSchedule.creator_account_id || null,
            status,
            expiration_time: expirationTime,
            executed_at: executedAt,
            signature_count: sigCount,
          });
          console.log('[API] Schedule added to history:', scheduleId);
        }
      } else {
        // Update signature count from Mirror Node
        const mirrorSchedule = await fetchScheduleFromMirrorNode(scheduleId);
        if (mirrorSchedule) {
          const sigCount = mirrorSchedule.signatures?.length ?? 0;
          let status: 'pending' | 'executed' | 'expired' | 'deleted' = 'pending';
          let executedAt: string | null = null;

          if (mirrorSchedule.executed_timestamp) {
            status = 'executed';
            const ts = parseFloat(mirrorSchedule.executed_timestamp);
            executedAt = new Date(ts * 1000).toISOString();
          } else if (mirrorSchedule.deleted) {
            status = 'deleted';
          }

          await supabase
            .from('keyring_schedule_history')
            .update({ signature_count: sigCount, status, executed_at: executedAt })
            .eq('id', existing.id);
        }
      }
    } catch (historyErr) {
      console.error('[API] Error updating schedule history (non-fatal):', historyErr);
    }

    return NextResponse.json({
      success: true,
      reward: { lynx: 5, keyring: 50, transactionId, scheduleId },
    });
  } catch (error) {
    console.error('[API] Failed to record signature reward:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to record signature reward',
    }, { status: 500 });
  }
}
