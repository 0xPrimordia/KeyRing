import { NextRequest, NextResponse } from 'next/server';
import { KeyRingDB } from '../../../../../lib/keyring-db';
import { generateKeyRingId } from '../../../../../lib/codename-generator';

/**
 * POST /api/signers/hedera
 * Register a new Hedera signer (verification_status: pending).
 * KYC completion is done separately via /verify when user is prompted from dashboard.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { account_id, public_key } = body;

    if (!account_id || !public_key) {
      return NextResponse.json(
        { success: false, error: 'account_id and public_key are required' },
        { status: 400 }
      );
    }

    const isTestnet = process.env.NEXT_PUBLIC_HEDERA_NETWORK !== 'mainnet';
    const existingSigner = await KeyRingDB.getSignerByAccountId(account_id);

    if (existingSigner) {
      return NextResponse.json({
        success: true,
        message: 'Signer already registered',
        signer: {
          id: existingSigner.id,
          account_type: existingSigner.account_type,
          account_id: existingSigner.account_id,
          code_name: existingSigner.code_name,
          verification_status: existingSigner.verification_status,
          created_at: existingSigner.created_at,
        },
      });
    }

    const codeName = generateKeyRingId(account_id);
    const result = await KeyRingDB.registerHederaSignerWithoutKyc({
      accountId: account_id,
      publicKey: public_key,
      codeName,
      isTestnet,
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to register Hedera signer' },
        { status: 500 }
      );
    }

    // Fire-and-forget: trigger boost onboarding
    const baseUrl = request.nextUrl.origin;
    fetch(`${baseUrl}/api/onboarding/boost`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accountId: account_id, publicKey: public_key }),
    }).catch((err) => console.error('[HEDERA-SIGNER] Boost trigger failed:', err));

    return NextResponse.json({
      success: true,
      message: 'Hedera signer registered. Complete KYC from dashboard to qualify for real projects.',
      signer: {
        id: result.signer?.id,
        account_type: result.signer?.account_type,
        account_id: result.signer?.account_id,
        code_name: result.signer?.code_name,
        verification_status: result.signer?.verification_status,
        created_at: result.signer?.created_at,
      },
    });
  } catch (error: unknown) {
    console.error('Error in POST /api/signers/hedera:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
