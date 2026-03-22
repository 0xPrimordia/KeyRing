import { NextRequest, NextResponse } from 'next/server';
import { HCS11Client } from '@hashgraphonline/standards-sdk';
import { AccountUpdateTransaction, AccountId } from '@hashgraph/sdk';
import { KeyRingDB } from '../../../../lib/keyring-db';
import { generateKeyRingId, getDisplayName } from '../../../../lib/codename-generator';

export async function POST(request: NextRequest) {
  try {
    const { accountId, publicKey, sumsubData, existingSignerId } = await request.json();

    if (!accountId || !publicKey) {
      return NextResponse.json({ 
        error: 'Account ID and public key are required' 
      }, { status: 400 });
    }

    console.log('[API] Registering KeyRing signer:', { 
      accountId, 
      publicKey: publicKey.substring(0, 20) + '...', 
      hasSumsubData: !!sumsubData,
      existingSignerId: !!existingSignerId
    });

    // Check if we're completing an existing signer or creating new
    if (existingSignerId) {
      // This is completing a profile for an existing Sumsub-verified signer
      console.log('[API] Completing existing signer profile:', existingSignerId);
    } else {
      // Check if signer already exists (for new registrations)
      const existingSigner = await KeyRingDB.getSignerByAccountId(accountId);
      if (existingSigner) {
        return NextResponse.json({
          success: false,
          error: 'Signer already registered with this account ID'
        }, { status: 400 });
      }
    }

    const network = process.env.NEXT_PUBLIC_HEDERA_NETWORK === 'mainnet' ? 'mainnet' : 'testnet';
    const isTestnet = network === 'testnet';
    const operatorAccountId = network === 'mainnet' 
      ? process.env.HEDERA_MAINNET_ACCOUNT_ID!
      : process.env.HEDERA_TESTNET_ACCOUNT_ID!;
    const operatorPrivateKey = network === 'mainnet'
      ? process.env.HEDERA_MAINNET_PRIVATE_KEY!
      : process.env.HEDERA_TESTNET_PRIVATE_KEY!;


    const hcs11Client = new HCS11Client({
      network,
      auth: {
        operatorId: operatorAccountId,
        privateKey: operatorPrivateKey,
      },
      keyType: 'ed25519', // Explicitly specify ED25519 key type
      silent: true, // Disable all logging to avoid pino-pretty transport issues
    });

    // Generate scalable KeyRing ID from public key
    const keyringId = generateKeyRingId(publicKey);
    const displayName = getDisplayName(publicKey, 'profile');
    // const avatarSeed = getAvatarSeed(publicKey); // Unused for now

    // Determine verification provider and create appropriate profile
    const verificationProvider = sumsubData ? 'sumsub' : 'entrust';
    const profileAlias = sumsubData ? 'KeyRing Verified Signer (Sumsub)' : 'KeyRing Verified Signer';
    const profileBio = sumsubData 
      ? `Verified threshold key signer specializing in decentralized governance and multi-signature operations. Identity verified via Sumsub.`
      : `Verified threshold key signer specializing in decentralized governance and multi-signature operations`;

    // Create KeyRing signer profile using HCS-11
    const keyringProfile = hcs11Client.createPersonalProfile(displayName, {
      alias: profileAlias,
      bio: profileBio,
      properties: {
        // KeyRing-specific metadata
        keyring: {
          verification_provider: verificationProvider,
          verification_status: 'verified',
          verification_date: new Date().toISOString(),
          public_key: publicKey,
          specializations: ['defi', 'governance', 'multi_sig'],
          reputation_score: 100, // Starting score
          total_reviews: 0,
          approval_rate: 1.0,
          response_time_avg: 0,
          active_lists: 0,
          join_date: new Date().toISOString(),
          account_id: accountId,
          // Sumsub verification data (if available)
          ...(sumsubData && {
            sumsub_applicant_id: sumsubData.applicantId,
            sumsub_review_result: sumsubData.reviewResult,
          })
        },
        // Geographic/regulatory info (privacy-preserving)
        region: 'unknown', // Will be set during verification process
        timezone: 'UTC',
        languages: ['en']
      },
      // No social links for privacy
      socials: [],
    });

        console.log('[API] Created KeyRing profile:', {
          keyringId,
          displayName,
          type: keyringProfile.type,
          hasKeyringData: !!keyringProfile.properties?.keyring
        });

    // Inscribe the profile to Hedera (operator signs this)
    // DO NOT update account memo here - that needs to be done client-side by the user's wallet
    const inscriptionResult = await hcs11Client.inscribeProfile(
      keyringProfile,
      {
        waitForConfirmation: true,
        progressCallback: (progress: { stage: string; message: string; progressPercent?: number }) => {
          console.log(`[API] Inscription progress: ${progress.stage} - ${progress.message} (${progress.progressPercent}%)`);
        }
      }
    );

    if (inscriptionResult.success) {
      console.log('[API] KeyRing signer registered successfully:', {
        profileTopicId: inscriptionResult.profileTopicId,
        transactionId: inscriptionResult.transactionId,
        uaid: keyringProfile.uaid // Auto-generated UAID
      });

      // Create memo update transaction for the user to sign
      const hcs11Memo = hcs11Client.setProfileForAccountMemo(inscriptionResult.profileTopicId, 1); // 1 = HCS-11 standard
      
      const accountUpdateTx = new AccountUpdateTransaction()
        .setAccountId(AccountId.fromString(accountId))
        .setAccountMemo(hcs11Memo);

      const transactionBytes = accountUpdateTx.toBytes();
      const memoUpdateTransaction = Buffer.from(transactionBytes).toString('base64');

      console.log('[API] Created memo update transaction:', {
        memo: hcs11Memo,
        transactionSize: transactionBytes.length
      });

        // Store signer in database or complete existing profile
        let dbResult;
        if (existingSignerId) {
          // Complete existing signer profile
          dbResult = await KeyRingDB.completeSignerProfile(existingSignerId, {
            publicKey,
            profileTopicId: inscriptionResult.profileTopicId,
            codeName: keyringId,
          });
          
          // dbResult already includes the signer data from completeSignerProfile
        } else {
          // Create new signer
          dbResult = await KeyRingDB.registerSigner({
            accountId,
            publicKey,
            profileTopicId: inscriptionResult.profileTopicId,
            codeName: keyringId,
            verificationProvider: verificationProvider,
            isTestnet,
            ...(sumsubData && {
              sumsubApplicantId: sumsubData.applicantId,
              sumsubReviewResult: sumsubData.reviewResult,
            })
          });
        }

      if (!dbResult.success) {
        console.error('[API] Failed to store signer in database:', dbResult.error);
        // Continue anyway - HCS-11 profile was created successfully
      } else {
        console.log('[API] Signer stored in database:', {
          signerId: dbResult.signer?.id,
          keyringId: dbResult.signer?.code_name
        });

        // Fire-and-forget: trigger boost onboarding
        const baseUrl = request.nextUrl.origin;
        fetch(`${baseUrl}/api/onboarding/boost`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ accountId, publicKey }),
        }).catch((err) => console.error('[API] Boost trigger failed:', err));
      }

      // Fetch the complete profile data including UAID
      try {
        console.log('[API] Fetching complete profile data...');
        const profileResult = await hcs11Client.fetchProfileByAccountId(accountId);
        
        if (profileResult.success && profileResult.profile) {
          console.log('[API] Successfully fetched profile:', {
            displayName: profileResult.profile.display_name,
            type: profileResult.profile.type,
            uaid: profileResult.profile.uaid,
            hasKeyringData: !!profileResult.profile.properties?.keyring
          });

          // Return the complete profile data
          return NextResponse.json({
            success: true,
            signer: {
              keyringId,
              displayName: profileResult.profile.display_name,
              accountId,
              publicKey,
              profileTopicId: inscriptionResult.profileTopicId,
              transactionId: inscriptionResult.transactionId,
              uaid: profileResult.profile.uaid,
              profile: profileResult.profile,
              topicInfo: profileResult.topicInfo
            },
            memoUpdate: {
              transaction: memoUpdateTransaction,
              memo: hcs11Memo,
              required: true
            }
          });
        } else {
          console.log('[API] Could not fetch profile back, using original data:', profileResult.error);
        }
      } catch (fetchError) {
        console.log('[API] Error fetching profile back, using original data:', fetchError);
      }

        // Fallback to original response if profile fetch fails
        return NextResponse.json({
          success: true,
          signer: {
            keyringId,
            displayName,
            accountId,
            publicKey,
            profileTopicId: inscriptionResult.profileTopicId,
            transactionId: inscriptionResult.transactionId,
            uaid: keyringProfile.uaid
          },
        memoUpdate: {
          transaction: memoUpdateTransaction,
          memo: hcs11Memo,
          required: true
        }
      });
    } else {
      throw new Error(inscriptionResult.error || 'Failed to inscribe profile');
    }

  } catch (error) {
    console.error('[API] Failed to register signer:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to register KeyRing signer'
    }, { status: 500 });
  }
}
