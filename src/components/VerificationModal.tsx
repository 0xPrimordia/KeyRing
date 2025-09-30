'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '../providers/WalletProvider';

interface VerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
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

export default function VerificationModal({ isOpen, onClose }: VerificationModalProps) {
  const { getPublicKey, isConnected, accountId, publicKey, dAppConnector } = useWallet();
  const [isWhitelisted, setIsWhitelisted] = useState<boolean | null>(null);
  const [existingAccount, setExistingAccount] = useState<{ id: string; codeName: string; accountId: string; verificationStatus: string; createdAt: string } | null>(null);
  const [isCheckingAccount, setIsCheckingAccount] = useState(false);
  const [creationProgress, setCreationProgress] = useState<ProfileCreationProgress>({
    step: 'idle',
    message: '',
    progress: 0
  });
  const [createdProfile, setCreatedProfile] = useState<CreatedProfile | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Check if user is whitelisted and if account exists when modal opens
  useEffect(() => {
    const checkAccountStatus = async () => {
      if (isOpen && isConnected && accountId) {
        setIsCheckingAccount(true);
        
        // Check whitelist from database
        let isAccountWhitelisted = false;
        try {
          const whitelistResponse = await fetch('/api/whitelist/check', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ accountId })
          });
          
          if (whitelistResponse.ok) {
            const whitelistData = await whitelistResponse.json();
            isAccountWhitelisted = whitelistData.success ? whitelistData.isWhitelisted : false;
            setIsWhitelisted(isAccountWhitelisted);
          } else {
            setIsWhitelisted(false);
          }
        } catch (whitelistError) {
          console.error('Error checking whitelist:', whitelistError);
          setIsWhitelisted(false);
        }
        
        // Check if account already exists in database
        if (isAccountWhitelisted) {
          try {
            const response = await fetch('/api/signers/lookup', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ accountId })
            });
            
            if (response.ok) {
              const data = await response.json();
              if (data.success && data.signer) {
                setExistingAccount(data.signer);
              } else {
                setExistingAccount(null);
              }
            } else {
              // 404 means signer not found, which is expected for new accounts
              setExistingAccount(null);
            }
          } catch (error) {
            console.error('Error checking existing account:', error);
            setExistingAccount(null);
          }
        }
        
        setIsCheckingAccount(false);
      }
    };
    
    checkAccountStatus();
  }, [isOpen, isConnected, accountId]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setCreationProgress({ step: 'idle', message: '', progress: 0 });
      setCreatedProfile(null);
      setError(null);
      setIsWhitelisted(null);
      setExistingAccount(null);
      setIsCheckingAccount(false);
    }
  }, [isOpen]);

  const handleCreateProfile = async () => {
    if (!accountId) return;
    
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

      // Register signer using HCS-11
      setCreationProgress({ step: 'inscribing', message: 'Creating HCS-11 profile on Hedera...', progress: 30 });
      
      const registrationResponse = await fetch('/api/register-signer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId: accountId,
          publicKey: currentPublicKey
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


  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-2xl p-8 max-w-md w-full border border-gray-700">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-foreground">Signer Verification</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-foreground transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {!isConnected ? (
          <div className="text-center">
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.664-.833-2.464 0L4.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">Connection Required</h3>
            <p className="text-gray-400 mb-6">
              Please connect your wallet first using the button in the header, then try again.
            </p>
            <button
              onClick={onClose}
              className="w-full bg-gray-600 text-foreground px-6 py-3 rounded-lg font-semibold hover:bg-gray-500 transition-colors"
            >
              Close
            </button>
          </div>
        ) : isWhitelisted === null || isCheckingAccount ? (
          <div className="text-center">
            <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-400">
              {isWhitelisted === null ? 'Checking verification status...' : 'Checking account status...'}
            </p>
          </div>
        ) : isWhitelisted ? (
          // Whitelisted user flow
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
                
                <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 mb-6">
                  <p className="text-sm text-green-400 mb-3">
                    ✅ {creationProgress.message}
                  </p>
                  <div className="space-y-2 text-xs text-gray-300">
                    <p className="flex items-start">
                      <span className="text-green-400 mr-2">•</span>
                      You&apos;re now ready to participate in threshold signing
                    </p>
                    <p className="flex items-start">
                      <span className="text-green-400 mr-2">•</span>
                      You&apos;ll start receiving LYNX rewards in your wallet when added to threshold lists
                    </p>
                    <p className="flex items-start">
                      <span className="text-blue-400 mr-2">•</span>
                      Review dashboard and transaction review rewards coming soon
                    </p>
                  </div>
                </div>
                
                <button
                  onClick={onClose}
                  className="w-full bg-primary text-background px-6 py-3 rounded-lg font-semibold hover:bg-primary-dark transition-colors"
                >
                  Continue
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
                    onClick={onClose}
                    className="flex-1 bg-gray-600 text-foreground px-6 py-3 rounded-lg font-semibold hover:bg-gray-500 transition-colors"
                  >
                    Close
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
                
                {/* Progress Steps */}
                <div className="flex justify-between text-xs text-gray-400 mb-6">
                  <span className={creationProgress.step === 'creating' ? 'text-primary' : creationProgress.progress > 20 ? 'text-green-400' : ''}>
                    Preparing
                  </span>
                  <span className={creationProgress.step === 'inscribing' ? 'text-primary' : creationProgress.progress > 50 ? 'text-green-400' : ''}>
                    Inscribing
                  </span>
                  <span className={creationProgress.step === 'storing' ? 'text-primary' : creationProgress.progress > 70 ? 'text-green-400' : ''}>
                    Storing
                  </span>
                  <span className={creationProgress.step === 'memo' ? 'text-primary' : creationProgress.progress === 100 ? 'text-green-400' : ''}>
                    Linking
                  </span>
                </div>
                
                <div className="bg-gray-700 rounded-lg p-4 text-left">
                  <div className="flex items-start">
                    <svg className="w-5 h-5 text-blue-400 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <p className="text-xs text-gray-300">
                        Creating your anonymous HCS-11 profile on Hedera. This process may take 30-60 seconds.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : existingAccount ? (
              // Existing Account State
              <div>
                <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">Profile Already Exists</h3>
                <p className="text-gray-400 mb-6">
                  You already have a KeyRing signer profile
                </p>
                
                <div className="bg-gray-700 rounded-lg p-4 text-left mb-6">
                  <h4 className="text-sm font-semibold text-foreground mb-3">Your Profile:</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Signer ID:</span>
                      <span className="text-primary font-mono">{existingAccount.codeName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Status:</span>
                      <span className={`capitalize ${
                        existingAccount.verificationStatus === 'verified' 
                          ? 'text-green-400' 
                          : existingAccount.verificationStatus === 'pending'
                          ? 'text-yellow-400'
                          : 'text-red-400'
                      }`}>
                        {existingAccount.verificationStatus}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Created:</span>
                      <span className="text-gray-300 text-xs">
                        {new Date(existingAccount.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 mb-6">
                  <p className="text-sm text-blue-400 mb-2">
                    ✅ You&apos;re already registered as a KeyRing signer!
                  </p>
                  <p className="text-xs text-gray-400">
                    You can participate in threshold signing and earn rewards.
                  </p>
                </div>
                
                <button
                  disabled
                  className="w-full bg-green-600 text-white px-6 py-3 rounded-lg font-semibold opacity-75 cursor-not-allowed flex items-center justify-center"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Verified
                </button>
              </div>
            ) : (
              // New Account State
              <div>
                <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">Account Verified</h3>
                <p className="text-gray-400 mb-4">
                  Your account is whitelisted for KeyRing participation
                </p>
                
                <button
                  onClick={handleCreateProfile}
                  className="w-full bg-primary text-background px-6 py-3 rounded-lg font-semibold hover:bg-primary-dark transition-colors mb-4 cursor-pointer"
                >
                  Create Profile
                </button>
                
                <div className="bg-gray-700 rounded-lg p-4 text-left">
                  <div className="flex items-start">
                    <svg className="w-5 h-5 text-blue-400 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <p className="text-sm text-gray-300 mb-1">
                        <strong>Anonymous HCS-11 Profile:</strong> This creates a privacy-preserving identity on Hedera Consensus Service using the HCS-11 standard.
                      </p>
                      <p className="text-xs text-gray-400">
                        Your profile is linked to your wallet but doesn&apos;t expose personal information publicly.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          // Non-whitelisted user flow - Coming Soon
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">Get Whitelisted</h3>
            <p className="text-gray-400 mb-6">
              Identity integration is coming soon. Contact us to get whitelisted for early access.
            </p>
            
            {/* 10 LYNX Reward Preview */}
            <div className="bg-gradient-to-r from-primary/20 to-primary-dark/20 rounded-lg p-4 border border-primary/30 mb-6">
              <div className="flex items-center justify-center mb-2">
                <svg className="w-6 h-6 text-primary mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                </svg>
                <span className="text-lg font-bold text-primary">10 LYNX Reward</span>
              </div>
              <p className="text-sm text-gray-300">
                Earn your onboarding bonus when verification becomes available
              </p>
            </div>
            
            <div className="bg-gray-700 rounded-lg p-4 text-left mb-4">
              <div className="flex items-start">
                <svg className="w-5 h-5 text-blue-400 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="text-sm text-gray-300 mb-2">
                    <strong>What&apos;s Coming:</strong>
                  </p>
                  <ul className="text-xs text-gray-400 space-y-1">
                    <li>• Automated identity verification</li>
                    <li>• Integration with trusted KYC providers</li>
                    <li>• Instant signer onboarding</li>
                    <li>• Enhanced security protocols</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Contact Section */}
            <div className="bg-gray-800/50 rounded-lg p-4 mb-4">
              <p className="text-sm text-gray-300 mb-3 text-center">
                Contact us to get whitelisted for early access:
              </p>
              <div className="flex gap-3">
                <a
                  href="https://x.com/lynifyxyz"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 bg-black text-white px-4 py-2 rounded-lg font-medium hover:bg-gray-900 transition-colors text-center text-sm"
                >
                  Follow on X
                </a>
                <a
                  href="https://discord.gg/GM5BfpPe2Y"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 bg-[#5865F2] text-white px-4 py-2 rounded-lg font-medium hover:bg-[#4752C4] transition-colors text-center text-sm"
                >
                  Join our Discord
                </a>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-full bg-gray-600 text-foreground px-6 py-3 rounded-lg font-semibold hover:bg-gray-500 transition-colors"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
