'use client';

import { useState, Suspense } from 'react';
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

function VerifyPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isConnected, accountId } = useWallet();
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasStarted, setHasStarted] = useState(false);

  // Get return URL from query params
  const returnUrl = searchParams.get('returnUrl') || '/';

  // No useEffect redirects - just handle it in the render

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
      case 'idCheck.applicantLoaded':
        console.log('Applicant loaded:', payload);
        break;
      case 'idCheck.onApplicantSubmitted':
        console.log('Applicant submitted for review:', payload);
        // Redirect back to the return URL after submission
        router.push(returnUrl);
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
            {!hasStarted ? (
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
