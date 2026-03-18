import { NextRequest, NextResponse } from 'next/server';
import { KeyRingDB } from '../../../../../lib/keyring-db';
import { supabase } from '../../../../../lib/supabase';

function getMirrorNodeUrl(): string {
  const network = process.env.NEXT_PUBLIC_HEDERA_NETWORK || 'testnet';
  return network === 'mainnet'
    ? 'https://mainnet.mirrornode.hedera.com'
    : 'https://testnet.mirrornode.hedera.com';
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

  const scheduleRes = await fetch(`${mirrorNodeUrl}/api/v1/schedules/${scheduleId}`);
  if (!scheduleRes.ok) return { verified: false, error: 'Could not fetch schedule from Mirror Node' };
  const scheduleData = await scheduleRes.json();

  const signatures: Array<{ public_key_prefix?: string }> = scheduleData.signatures || [];

  const signed = signatures.some((sig) => {
    if (!sig.public_key_prefix) return false;
    try {
      const sigKeyHex = Buffer.from(sig.public_key_prefix, 'base64').toString('hex');
      return sigKeyHex.includes(publicKey) || publicKey.includes(sigKeyHex.slice(0, 40));
    } catch {
      return false;
    }
  });

  return signed
    ? { verified: true }
    : { verified: false, error: 'Signature not found on schedule' };
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

    // DB dedup: check if this signer already has a transaction_review reward for this schedule
    const { count, error: countErr } = await supabase
      .from('keyring_rewards')
      .select('*', { count: 'exact', head: true })
      .eq('signer_id', signer.id)
      .eq('schedule_id', scheduleId)
      .eq('reward_type', 'transaction_review');

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
