import { NextRequest, NextResponse } from 'next/server';
import { KeyRingDB } from '../../../../../lib/keyring-db';
import { generateKeyRingId } from '../../../../../lib/codename-generator';
import { getReferralCodeFromRequest } from '../../../../../lib/referral-from-request';

/**
 * POST /api/signers/ethereum
 * Register a new Ethereum signer. KYC (sumsub) is optional - complete from dashboard for real projects.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const wallet_address = body.wallet_address;
    const sumsub_applicant_id = body.sumsub_applicant_id;
    const sumsub_review_result = body.sumsub_review_result;
    const referralCode = getReferralCodeFromRequest(request, body.referral_code);

    if (!wallet_address || !/^0x[a-fA-F0-9]{40}$/.test(wallet_address)) {
      return NextResponse.json(
        { success: false, error: 'Valid wallet_address is required' },
        { status: 400 }
      );
    }

    // Idempotent: return existing signer if already registered
    const existingSigner = await KeyRingDB.getSignerByWalletAddress(wallet_address);
    if (existingSigner) {
      return NextResponse.json({
        success: true,
        message: 'Signer already registered',
        signer: {
          id: existingSigner.id,
          account_type: existingSigner.account_type,
          wallet_address: existingSigner.wallet_address,
          code_name: existingSigner.code_name,
          referral_code: existingSigner.referral_code,
          verification_status: existingSigner.verification_status,
          created_at: existingSigner.created_at,
        },
      });
    }

    const codeName = generateKeyRingId(wallet_address);
    const isTestnet = process.env.NEXT_PUBLIC_HEDERA_NETWORK !== 'mainnet';

    const result = await KeyRingDB.registerEthereumSigner({
      walletAddress: wallet_address,
      codeName,
      verificationProvider: 'sumsub',
      sumsubApplicantId: sumsub_applicant_id,
      sumsubReviewResult: sumsub_review_result || 'GREEN',
      isTestnet,
      referralCode,
    });

    if (!result.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: result.error || 'Failed to register Ethereum signer' 
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Ethereum signer registered successfully',
      signer: {
        id: result.signer?.id,
        account_type: result.signer?.account_type,
        wallet_address: result.signer?.wallet_address,
        code_name: result.signer?.code_name,
        referral_code: result.signer?.referral_code,
        verification_status: result.signer?.verification_status,
        created_at: result.signer?.created_at
      }
    });

  } catch (error) {
    console.error('Error in POST /api/signers/ethereum:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error' 
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/signers/ethereum/[address]
 * Get Ethereum signer by wallet address
 */
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const address = url.searchParams.get('address');

    if (!address) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Wallet address is required' 
        },
        { status: 400 }
      );
    }

    // Validate Ethereum address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid Ethereum address format' 
        },
        { status: 400 }
      );
    }

    const signer = await KeyRingDB.getSignerByWalletAddress(address);
    
    if (!signer) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Signer not found' 
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      signer: {
        id: signer.id,
        account_type: signer.account_type,
        wallet_address: signer.wallet_address,
        code_name: signer.code_name,
        referral_code: signer.referral_code,
        verification_status: signer.verification_status,
        verification_provider: signer.verification_provider,
        created_at: signer.created_at
      }
    });

  } catch (error) {
    console.error('Error in GET /api/signers/ethereum:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error' 
      },
      { status: 500 }
    );
  }
}

