import { NextRequest, NextResponse } from 'next/server';
import { KeyRingDB } from '../../../../../lib/keyring-db';

export async function POST(request: NextRequest) {
  try {
    const { publicKey, accountId } = await request.json();

    if (!publicKey && !accountId) {
      return NextResponse.json({
        success: false,
        error: 'Either public key or account ID is required'
      }, { status: 400 });
    }

    let signer = null;

    // Lookup by public key (most common for threshold list verification)
    if (publicKey) {
      signer = await KeyRingDB.getSignerByPublicKey(publicKey);
    }
    // Fallback to account ID lookup
    else if (accountId) {
      signer = await KeyRingDB.getSignerByAccountId(accountId);
    }

    if (!signer) {
      return NextResponse.json({
        success: false,
        error: 'Signer not found in KeyRing registry'
      }, { status: 404 });
    }

    // Return signer info (without sensitive data)
    return NextResponse.json({
      success: true,
      signer: {
        id: signer.id,
        codeName: signer.code_name,
        verificationStatus: signer.verification_status,
        verificationProvider: signer.verification_provider,
        verificationDate: signer.verification_date,
        profileTopicId: signer.profile_topic_id,
        createdAt: signer.created_at
      }
    });

  } catch (error: unknown) {
    console.error('[API] Error looking up signer:', error instanceof Error ? error.message : error);
    return NextResponse.json({
      success: false,
      error: 'Failed to lookup signer'
    }, { status: 500 });
  }
}

export async function GET() {
  try {
    // Get registry statistics
    const stats = await KeyRingDB.getSignerStats();
    
    return NextResponse.json({
      success: true,
      stats
    });
  } catch (error: unknown) {
    console.error('[API] Error getting signer stats:', error instanceof Error ? error.message : error);
    return NextResponse.json({
      success: false,
      error: 'Failed to get registry statistics'
    }, { status: 500 });
  }
}
