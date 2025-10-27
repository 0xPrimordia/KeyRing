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

    // Add transaction_review reward (10 KYRNG)
    const rewardResult = await KeyRingDB.addReward(
      signer.id,
      'transaction_review',
      10,
      'KYRNG',
      transactionId, // signature_transaction_id
      scheduleId // schedule_id
    );

    if (!rewardResult.success) {
      console.error('[API] Failed to create reward:', rewardResult.error);
      return NextResponse.json({
        success: false,
        error: 'Failed to record reward'
      }, { status: 500 });
    }

    console.log('[API] Signature reward recorded successfully:', {
      signerId: signer.id,
      rewardId: rewardResult.reward?.id,
      amount: 10,
      transactionId
    });

    return NextResponse.json({
      success: true,
      reward: {
        amount: 10,
        currency: 'KYRNG',
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

