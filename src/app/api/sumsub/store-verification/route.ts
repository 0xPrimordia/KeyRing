import { NextRequest, NextResponse } from 'next/server';
import { KeyRingDB } from '../../../../../lib/keyring-db';
import { getReferralCodeFromRequest } from '../../../../../lib/referral-from-request';

async function fetchPublicKeyFromMirrorNode(accountId: string, network: string): Promise<string | null> {
  try {
    const mirrorNodeUrl = network === 'mainnet'
      ? 'https://mainnet-public.mirrornode.hedera.com'
      : 'https://testnet.mirrornode.hedera.com';

    const response = await fetch(`${mirrorNodeUrl}/api/v1/accounts/${accountId}`);
    if (!response.ok) return null;

    const accountData = await response.json();
    if (accountData?.key?._type === 'ED25519' && accountData.key.key) {
      return accountData.key.key;
    }
    return null;
  } catch (error) {
    console.error('[API] Mirror Node public key fetch failed:', error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { accountId, applicantId, reviewResult } = body;
    const referralCode = getReferralCodeFromRequest(request, body.referral_code);

    if (!accountId || !applicantId || !reviewResult) {
      return NextResponse.json({
        success: false,
        error: 'Account ID, applicant ID, and review result are required'
      }, { status: 400 });
    }

    const network = process.env.NEXT_PUBLIC_HEDERA_NETWORK === 'mainnet' ? 'mainnet' : 'testnet';
    const isTestnet = network !== 'mainnet';

    console.log('[API] Storing Sumsub verification:', { 
      accountId, 
      applicantId, 
      reviewResult,
      network 
    });

    // Fetch public key from Mirror Node immediately so it's never left empty
    const publicKey = await fetchPublicKeyFromMirrorNode(accountId, network);
    if (publicKey) {
      console.log('[API] Public key fetched from Mirror Node:', publicKey.substring(0, 20) + '...');
    } else {
      console.warn('[API] Could not fetch public key from Mirror Node for', accountId);
    }

    const existingSigner = await KeyRingDB.getSignerByAccountId(accountId);
    
    if (existingSigner) {
      const updateResult = await KeyRingDB.updateSignerVerification(existingSigner.id, {
        verificationStatus: reviewResult === 'GREEN' ? 'verified' : 'pending',
        verificationProvider: 'sumsub',
        verificationDate: new Date().toISOString(),
        sumsubApplicantId: applicantId,
        sumsubReviewResult: reviewResult,
      });

      // Backfill public key if missing on existing record
      if (publicKey && !existingSigner.public_key) {
        await KeyRingDB.completeSignerProfile(existingSigner.id, {
          publicKey,
          profileTopicId: existingSigner.profile_topic_id || '',
          codeName: existingSigner.code_name,
        });
        console.log('[API] Backfilled public key for existing signer:', existingSigner.id);
      }

      if (updateResult.success) {
        console.log('[API] Updated existing signer with Sumsub data:', existingSigner.id);
        if (reviewResult === 'GREEN') {
          await KeyRingDB.addVerificationRewardIfNew(existingSigner.id, 100, 'KYRNG');
        }
        return NextResponse.json({
          success: true,
          signer: { ...existingSigner, public_key: publicKey || existingSigner.public_key },
          publicKey,
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
      const dbResult = await KeyRingDB.registerIncompleteSignerVerification({
        accountId,
        applicantId,
        reviewResult,
        isTestnet,
        publicKey: publicKey || undefined,
        referralCode,
      });

      if (dbResult.success) {
        console.log('[API] Created signer record:', dbResult.signer?.id, publicKey ? '(with public key)' : '(no public key)');
        if (reviewResult === 'GREEN' && dbResult.signer) {
          await KeyRingDB.addVerificationRewardIfNew(dbResult.signer.id, 100, 'KYRNG');
        }
        return NextResponse.json({
          success: true,
          signer: dbResult.signer,
          publicKey,
          isUpdate: false
        });
      } else {
        console.error('[API] Failed to create signer record:', dbResult.error);
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
