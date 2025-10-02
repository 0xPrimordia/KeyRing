import { NextRequest, NextResponse } from 'next/server';
import { KeyRingDB } from '../../../../../lib/keyring-db';

export async function POST(request: NextRequest) {
  try {
    const { accountId, applicantId, reviewResult } = await request.json();

    if (!accountId || !applicantId || !reviewResult) {
      return NextResponse.json({
        success: false,
        error: 'Account ID, applicant ID, and review result are required'
      }, { status: 400 });
    }

    console.log('[API] Storing Sumsub verification:', { 
      accountId, 
      applicantId, 
      reviewResult 
    });

    // Check if signer already exists
    const existingSigner = await KeyRingDB.getSignerByAccountId(accountId);
    
    if (existingSigner) {
      // Update existing signer with Sumsub data
      const updateResult = await KeyRingDB.updateSignerVerification(existingSigner.id, {
        verificationStatus: reviewResult === 'GREEN' ? 'verified' : 'pending',
        verificationProvider: 'sumsub',
        verificationDate: new Date().toISOString(),
        sumsubApplicantId: applicantId,
        sumsubReviewResult: reviewResult,
      });

      if (updateResult.success) {
        console.log('[API] Updated existing signer with Sumsub data:', existingSigner.id);
        return NextResponse.json({
          success: true,
          signer: existingSigner,
          isUpdate: true
        });
      } else {
        console.error('[API] Failed to update existing signer:', updateResult.error);
        return NextResponse.json({
          success: false,
          error: updateResult.error
        }, { status: 500 });
      }
    } else {
      // Create new incomplete signer record (no profile topic ID yet)
      const dbResult = await KeyRingDB.registerIncompleteSignerVerification({
        accountId,
        applicantId,
        reviewResult,
      });

      if (dbResult.success) {
        console.log('[API] Created incomplete signer record:', dbResult.signer?.id);
        return NextResponse.json({
          success: true,
          signer: dbResult.signer,
          isUpdate: false
        });
      } else {
        console.error('[API] Failed to create incomplete signer record:', dbResult.error);
        return NextResponse.json({
          success: false,
          error: dbResult.error
        }, { status: 500 });
      }
    }

  } catch (error: unknown) {
    console.error('[API] Error storing Sumsub verification:', error instanceof Error ? error.message : error);
    return NextResponse.json({
      success: false,
      error: 'Failed to store verification data'
    }, { status: 500 });
  }
}
