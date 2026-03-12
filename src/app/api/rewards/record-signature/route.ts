import { NextRequest, NextResponse } from 'next/server';
import { KeyRingDB } from '../../../../../lib/keyring-db';

/**
 * POST /api/rewards/record-signature
 * Records a reward for signing a scheduled transaction
 */
export async function POST(request: NextRequest) {
  try {
    const { accountId, scheduleId, transactionId } = await request.json();

    if (!accountId) {
      return NextResponse.json({ 
        error: 'Account ID is required' 
      }, { status: 400 });
    }

    console.log('[API] Recording signature reward:', { 
      accountId,
      scheduleId,
      transactionId
    });

    // Get signer by account ID
    const signer = await KeyRingDB.getSignerByAccountId(accountId);
    
    if (!signer) {
      console.warn('[API] Signer not found for account:', accountId);
      return NextResponse.json({
        success: false,
        error: 'Signer not found. Please complete your registration first.'
      }, { status: 404 });
    }

    // Add transaction_review rewards: 5 LYNX + 50 Keyring
    const lynxResult = await KeyRingDB.addReward(
      signer.id,
      'transaction_review',
      5,
      'LYNX',
      transactionId,
      scheduleId
    );
    const keyringResult = await KeyRingDB.addReward(
      signer.id,
      'transaction_review',
      50,
      'KYRNG',
      transactionId,
      scheduleId
    );

    if (!lynxResult.success || !keyringResult.success) {
      console.error('[API] Failed to create reward:', lynxResult.error || keyringResult.error);
      return NextResponse.json({
        success: false,
        error: 'Failed to record reward'
      }, { status: 500 });
    }

    console.log('[API] Signature rewards recorded successfully:', {
      signerId: signer.id,
      lynx: 5,
      keyring: 50,
      transactionId
    });

    return NextResponse.json({
      success: true,
      reward: {
        lynx: 5,
        keyring: 50,
        transactionId,
        scheduleId
      }
    });

  } catch (error) {
    console.error('[API] Failed to record signature reward:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to record signature reward'
    }, { status: 500 });
  }
}

