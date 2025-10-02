'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useWallet } from '../../providers/WalletProvider';
import SumsubWebSdk from '@sumsub/websdk-react';

// Sumsub message types
interface SumsubMessagePayload {
  message?: string;
  [key: string]: unknown;
}

interface SumsubError {
  message?: string;
  [key: string]: unknown;
}

type ProfileCreationStep = 'idle' | 'creating' | 'inscribing' | 'storing' | 'memo' | 'success' | 'error';

interface ProfileCreationProgress {
  step: ProfileCreationStep;
  message: string;
  progress: number;
}

interface CreatedProfile {
  keyringId: string;
  displayName: string;
  profileTopicId: string;
  transactionId: string;
  uaid?: string;
}

interface SumsubCompletionData {
  applicantId: string;
  reviewResult: 'GREEN' | 'RED' | 'YELLOW';
}

function VerifyPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isConnected, accountId, publicKey, getPublicKey, dAppConnector } = useWallet();
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasStarted, setHasStarted] = useState(false);
  
  // Verification completion and profile creation states
  const [verificationCompleted, setVerificationCompleted] = useState(false);
  const [sumsubData, setSumsubData] = useState<SumsubCompletionData | null>(null);
  const [existingSigner, setExistingSigner] = useState<{ id: string; codeName: string; accountId: string; verificationStatus: string; createdAt: string; profileTopicId?: string; sumsubApplicantId?: string; sumsubReviewResult?: string } | null>(null);
  const [creationProgress, setCreationProgress] = useState<ProfileCreationProgress>({
    step: 'idle',
    message: '',
    progress: 0
  });
  const [createdProfile, setCreatedProfile] = useState<CreatedProfile | null>(null);

  // Get return URL from query params
  const returnUrl = searchParams.get('returnUrl') || '/';

  // Check for existing verification on page load
  useEffect(() => {
    const checkExistingVerification = async () => {
      if (isConnected && accountId) {
        try {
          const response = await fetch('/api/signers/lookup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ accountId })
          });
          
          if (response.ok) {
            const data = await response.json();
            if (data.success && data.signer) {
              setExistingSigner({
                id: data.signer.id,
                codeName: data.signer.codeName,
                accountId: data.signer.accountId || accountId,
                verificationStatus: data.signer.verificationStatus,
                createdAt: data.signer.createdAt,
                profileTopicId: data.signer.profileTopicId,
                sumsubApplicantId: data.signer.sumsubApplicantId,
                sumsubReviewResult: data.signer.sumsubReviewResult,
              });
              
              // If they have Sumsub data but no profile topic ID, show completion state
              if (data.signer.sumsubApplicantId && !data.signer.profileTopicId) {
                setVerificationCompleted(true);
                setSumsubData({
                  applicantId: data.signer.sumsubApplicantId,
                  reviewResult: data.signer.sumsubReviewResult || 'GREEN'
                });
              }
            } else {
              setExistingSigner(null);
            }
          } else {
            // 404 means signer not found, which is expected for new accounts
            setExistingSigner(null);
          }
        } catch (error) {
          console.error('Error checking existing verification:', error);
          setExistingSigner(null);
        }
      }
    };
    
    checkExistingVerification();
  }, [isConnected, accountId]);

  const storeVerificationData = async (applicantId: string, reviewResult: 'GREEN' | 'RED' | 'YELLOW') => {
    try {
      console.log('Storing verification data:', { applicantId, reviewResult });
      
      const response = await fetch('/api/sumsub/store-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId,
          applicantId,
          reviewResult
        })
      });

      const data = await response.json();
      
      if (data.success) {
        console.log('Verification data stored successfully');
        
        // Update local state
        setSumsubData({ applicantId, reviewResult });
        setVerificationCompleted(true);
        setHasStarted(false);
        setAccessToken(null);
        
        // Update existing signer state
        if (data.signer) {
          setExistingSigner({
            id: data.signer.id,
            codeName: data.signer.code_name || `temp_${accountId}`,
            accountId: data.signer.account_id,
            verificationStatus: data.signer.verification_status,
            createdAt: data.signer.created_at,
            profileTopicId: data.signer.profile_topic_id,
            sumsubApplicantId: data.signer.sumsub_applicant_id,
            sumsubReviewResult: data.signer.sumsub_review_result,
          });
        }
      } else {
        console.error('Failed to store verification data:', data.error);
        setError('Failed to save verification data. Please try again.');
      }
    } catch (error) {
      console.error('Error storing verification data:', error);
      setError('Failed to save verification data. Please try again.');
    }
  };

  const handleCreateProfile = async () => {
    if (!accountId || !sumsubData || !existingSigner) return;
    
    setError(null);
    setCreationProgress({ step: 'creating', message: 'Preparing profile creation...', progress: 10 });
    
    try {
      let currentPublicKey = publicKey;
      
      // Get public key if we don't have it
      if (!currentPublicKey) {
        setCreationProgress({ step: 'creating', message: 'Getting public key...', progress: 20 });
        currentPublicKey = await getPublicKey(accountId);
      }
      
      if (!currentPublicKey) {
        throw new Error('Failed to obtain public key');
      }

      // Create HCS-11 profile with existing Sumsub data
      setCreationProgress({ step: 'inscribing', message: 'Creating HCS-11 profile on Hedera...', progress: 30 });
      
      const registrationResponse = await fetch('/api/register-signer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId: accountId,
          publicKey: currentPublicKey,
          sumsubData: {
            applicantId: sumsubData.applicantId,
            reviewResult: sumsubData.reviewResult,
          },
          existingSignerId: existingSigner.id // Pass existing signer ID to update instead of create
        })
      });
      
      const registrationData = await registrationResponse.json();
      
      if (registrationData.success) {
        setCreationProgress({ step: 'storing', message: 'Profile created successfully!', progress: 70 });
        
        // Store the created profile data
        setCreatedProfile({
          keyringId: registrationData.signer.keyringId,
          displayName: registrationData.signer.displayName,
          profileTopicId: registrationData.signer.profileTopicId,
          transactionId: registrationData.signer.transactionId,
          uaid: registrationData.signer.uaid
        });

        // If memo update is required, have the user sign it
        if (registrationData.memoUpdate?.required && registrationData.memoUpdate.transaction) {
          setCreationProgress({ step: 'memo', message: 'Please sign the memo update transaction...', progress: 80 });
          
          try {
            const signResult = await dAppConnector?.signAndExecuteTransaction({
              signerAccountId: accountId,
              transactionList: registrationData.memoUpdate.transaction
            });
            
            if (signResult) {
              setCreationProgress({ step: 'success', message: 'Profile linked to your account!', progress: 100 });
            } else {
              setCreationProgress({ step: 'success', message: 'Profile created! You can link it later.', progress: 100 });
            }
          } catch (memoError) {
            console.error('Failed to update memo:', memoError);
            setCreationProgress({ step: 'success', message: 'Profile created! Memo update failed.', progress: 100 });
          }
        } else {
          setCreationProgress({ step: 'success', message: 'Profile created successfully!', progress: 100 });
        }
      } else {
        throw new Error(registrationData.error || 'Failed to create profile');
      }
    } catch (error: unknown) {
      console.error('Failed to create profile:', error);
      setError(error instanceof Error ? error.message : 'Failed to create profile. Please try again.');
      setCreationProgress({ step: 'error', message: 'Profile creation failed', progress: 0 });
    }
  };

  const startVerification = async () => {
    try {
      setIsLoading(true);
      setError(null);
      setHasStarted(true);
      
      const response = await fetch('/api/sumsub/generate-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          accountId,
          externalUserId: accountId, // Use Hedera account ID as external user ID
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate access token');
      }

      const data = await response.json();
      setAccessToken(data.token);
    } catch (err) {
      console.error('Error generating access token:', err);
      setError('Failed to initialize verification. Please try again.');
      setHasStarted(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTokenExpiration = async (): Promise<string> => {
    console.log('Access token expired, generating new one...');
    
    const response = await fetch('/api/sumsub/generate-token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        accountId,
        externalUserId: accountId,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to refresh access token');
    }

    const data = await response.json();
    return data.token;
  };

  const handleMessage = (type: string, payload: SumsubMessagePayload) => {
    console.log('Sumsub message:', { type, payload });
    
    switch (type) {
      case 'idCheck.onStepCompleted':
        console.log('Verification step completed:', payload);
        break;
      case 'idCheck.onError':
        console.error('Verification error:', payload);
        setError(`Sumsub error: ${payload.message || 'Unknown error'}`);
        break;
      case 'idCheck.onApplicantLoaded':
        console.log('Applicant loaded:', payload);
        // Store the applicant ID when loaded
        if (payload.applicantId && accountId) {
          console.log('Capturing Sumsub applicant ID:', payload.applicantId);
          // Store with GREEN status initially - will be updated by webhook if needed
          storeVerificationData(payload.applicantId as string, 'GREEN');
        }
        break;
      case 'idCheck.onApplicantStatusChanged':
        console.log('Applicant status changed:', payload);
        // Check if we have review status information
        if (payload.applicantId && payload.reviewAnswer && accountId) {
          console.log('Updating verification with review result:', payload.reviewAnswer);
          storeVerificationData(
            payload.applicantId as string, 
            payload.reviewAnswer as 'GREEN' | 'RED' | 'YELLOW'
          );
        }
        break;
      case 'idCheck.onApplicantSubmitted':
        console.log('Applicant submitted for review:', payload);
        // Store verification data immediately
        if (payload.applicantId && accountId) {
          storeVerificationData(payload.applicantId as string, 'GREEN'); // Assume GREEN for now
        }
        break;
      case 'idCheck.onApplicantReviewed':
        console.log('Applicant reviewed:', payload);
        // This might be called if review happens immediately
        if (payload.reviewAnswer && payload.applicantId && accountId) {
          storeVerificationData(
            payload.applicantId as string, 
            payload.reviewAnswer as 'GREEN' | 'RED' | 'YELLOW'
          );
        }
        break;
      default:
        break;
    }
  };

  // Show wallet connection message if not connected
  if (!isConnected || !accountId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">Wallet Not Connected</h1>
          <p className="text-gray-400 mb-6">Please connect your wallet to proceed with verification.</p>
          <button
            onClick={() => router.push('/')}
            className="bg-primary text-background px-6 py-3 rounded-lg font-semibold hover:bg-primary-dark transition-colors"
          >
            Go Home & Connect Wallet
          </button>
        </div>
      </div>
    );
  }

  // Show loading state only when actively generating token
  if (isLoading && hasStarted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Initializing Verification</h1>
          <p className="text-gray-400">Setting up your identity verification...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Verification Error</h1>
          <p className="text-gray-400 mb-6">{error}</p>
          <div className="space-y-3">
            <button
              onClick={startVerification}
              className="w-full bg-primary text-background px-6 py-3 rounded-lg font-semibold hover:bg-primary-dark transition-colors"
            >
              Try Again
            </button>
            <button
              onClick={() => router.push(returnUrl)}
              className="w-full bg-gray-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-gray-700 transition-colors"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-gray-700">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push(returnUrl)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div>
                <h1 className="text-xl font-bold text-foreground">Identity Verification</h1>
                <p className="text-sm text-gray-400">Complete your KeyRing signer verification</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-400">Account</p>
              <p className="text-sm font-mono text-foreground">{accountId}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Verification Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
          {/* Info Banner */}
          <div className="bg-blue-500/10 border-b border-blue-500/20 p-4">
            <div className="flex items-start space-x-3">
              <svg className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <h3 className="text-sm font-semibold text-blue-400 mb-1">Privacy-Preserving Verification</h3>
                <p className="text-xs text-blue-300">
                  Your identity documents are processed by Sumsub for verification only. 
                  KeyRing receives verification status and your verified name, but never stores your documents or personal details.
                </p>
              </div>
            </div>
          </div>

          {/* Verification Content */}
          <div className="p-6">
            {verificationCompleted ? (
              // Verification completed - show profile creation UI
              <div className="text-center">
                {creationProgress.step === 'success' ? (
                  // Success State
                  <div>
                    <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-semibold text-foreground mb-2">🎉 Welcome to KeyRing!</h3>
                    <p className="text-gray-400 mb-6">
                      Your signer profile has been created successfully
                    </p>
                    
                    {createdProfile && (
                      <div className="bg-gray-700 rounded-lg p-4 text-left mb-6">
                        <h4 className="text-sm font-semibold text-foreground mb-3">Profile Details:</h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-400">Signer ID:</span>
                            <span className="text-primary font-mono">{createdProfile.keyringId}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Display Name:</span>
                            <span className="text-foreground">{createdProfile.displayName}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Profile Topic:</span>
                            <span className="text-gray-300 font-mono text-xs">{createdProfile.profileTopicId}</span>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    <button
                      onClick={() => {
                        if (createdProfile?.keyringId) {
                          router.push(`/signer/${createdProfile.keyringId}`);
                        } else {
                          router.push(returnUrl);
                        }
                      }}
                      className="w-full bg-primary text-background px-6 py-3 rounded-lg font-semibold hover:bg-primary-dark transition-colors"
                    >
                      View My Profile
                    </button>
                  </div>
                ) : creationProgress.step === 'error' ? (
                  // Error State
                  <div>
                    <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.664-.833-2.464 0L4.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-semibold text-foreground mb-2">Profile Creation Failed</h3>
                    <p className="text-gray-400 mb-4">
                      {error || 'An error occurred while creating your profile'}
                    </p>
                    
                    <div className="flex space-x-3">
                      <button
                        onClick={() => {
                          setCreationProgress({ step: 'idle', message: '', progress: 0 });
                          setError(null);
                        }}
                        className="flex-1 bg-primary text-background px-6 py-3 rounded-lg font-semibold hover:bg-primary-dark transition-colors"
                      >
                        Try Again
                      </button>
                      <button
                        onClick={() => router.push(returnUrl)}
                        className="flex-1 bg-gray-600 text-foreground px-6 py-3 rounded-lg font-semibold hover:bg-gray-500 transition-colors"
                      >
                        Go Back
                      </button>
                    </div>
                  </div>
                ) : creationProgress.step !== 'idle' ? (
                  // Progress State
                  <div>
                    <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
                      <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full"></div>
                    </div>
                    <h3 className="text-xl font-semibold text-foreground mb-2">Creating Your Profile</h3>
                    <p className="text-gray-400 mb-6">
                      {creationProgress.message}
                    </p>
                    
                    {/* Progress Bar */}
                    <div className="w-full bg-gray-700 rounded-full h-2 mb-4">
                      <div 
                        className="bg-primary h-2 rounded-full transition-all duration-500 ease-out"
                        style={{ width: `${creationProgress.progress}%` }}
                      ></div>
                    </div>
                    
                    <div className="bg-gray-700 rounded-lg p-4 text-left">
                      <div className="flex items-start">
                        <svg className="w-5 h-5 text-blue-400 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div>
                          <p className="text-xs text-gray-300">
                            Creating your verified HCS-11 profile on Hedera with Sumsub verification data.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  // Verification completed - ready to create profile
                  <div>
                    <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-semibold text-foreground mb-2">Verification Complete!</h3>
                    <p className="text-gray-400 mb-4">
                      Your identity has been successfully verified. Now create your KeyRing signer profile to start earning rewards.
                    </p>
                    
                    {sumsubData && (
                      <div className="bg-gray-700 rounded-lg p-4 text-left mb-6">
                        <h4 className="text-sm font-semibold text-foreground mb-3">Verification Details:</h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-400">Status:</span>
                            <span className="text-green-400">✅ Verified</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Sumsub ID:</span>
                            <span className="text-gray-300 font-mono text-xs">{sumsubData.applicantId}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Review Result:</span>
                            <span className={`font-semibold ${
                              sumsubData.reviewResult === 'GREEN' ? 'text-green-400' : 
                              sumsubData.reviewResult === 'YELLOW' ? 'text-yellow-400' : 'text-red-400'
                            }`}>
                              {sumsubData.reviewResult}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    <button
                      onClick={handleCreateProfile}
                      className="w-full bg-primary text-background px-6 py-3 rounded-lg font-semibold hover:bg-primary-dark transition-colors mb-4"
                    >
                      Create KeyRing Profile
                    </button>
                    
                    <div className="bg-gray-700 rounded-lg p-4 text-left">
                      <div className="flex items-start">
                        <svg className="w-5 h-5 text-blue-400 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div>
                          <p className="text-sm text-gray-300 mb-1">
                            <strong>Verified HCS-11 Profile:</strong> This creates a privacy-preserving identity on Hedera with your Sumsub verification data.
                          </p>
                          <p className="text-xs text-gray-400">
                            Your verification status and Sumsub ID will be stored in your profile for future reference.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : !hasStarted ? (
              // Start verification button
              <div className="text-center py-12">
                <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg className="w-10 h-10 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-foreground mb-4">Ready to Verify Your Identity</h2>
                <p className="text-gray-400 mb-8 max-w-md mx-auto">
                  Click below to start the verification process. You&apos;ll be guided through document upload and identity confirmation.
                </p>
                <button
                  onClick={startVerification}
                  disabled={isLoading}
                  className="bg-primary text-background px-8 py-4 rounded-lg font-semibold hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Starting...' : 'Start Identity Verification'}
                </button>
              </div>
            ) : accessToken ? (
              // Show Sumsub WebSDK React Component
              <SumsubWebSdk
                accessToken={accessToken}
                expirationHandler={handleTokenExpiration}
                config={{
                  lang: 'en',
                }}
                options={{
                  addViewportTag: false,
                  adaptIframeHeight: true,
                }}
                onMessage={(type: string, payload: SumsubMessagePayload) => handleMessage(type, payload)}
                onError={(error: SumsubError) => {
                  console.error('Sumsub SDK error:', error);
                  setError('An error occurred during verification. Please try again.');
                }}
              />
            ) : (
              // Loading state after clicking start
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-gray-400">Initializing verification...</p>
              </div>
            )}
          </div>
        </div>

        {/* Help Section */}
        <div className="mt-8 bg-gray-800 rounded-lg border border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">What You&apos;ll Need</h3>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold text-foreground mb-2">📄 Government-Issued ID</h4>
              <ul className="text-sm text-gray-400 space-y-1">
                <li>• Passport</li>
                <li>• Driver&apos;s License</li>
                <li>• National ID Card</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-2">🤳 Selfie Photo</h4>
              <ul className="text-sm text-gray-400 space-y-1">
                <li>• Clear, well-lit photo</li>
                <li>• Face clearly visible</li>
                <li>• No sunglasses or hats</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Loading</h1>
          <p className="text-gray-400">Preparing verification page...</p>
        </div>
      </div>
    }>
      <VerifyPageContent />
    </Suspense>
  );
}
