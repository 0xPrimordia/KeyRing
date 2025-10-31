'use client';

import { useWallet } from '../../providers/WalletProvider';
import { useAccount } from 'wagmi';
import { useState, useEffect } from 'react';
import VerificationModal from '../../components/VerificationModal';
import Header from '@/components/Header';
import Image from 'next/image';
import DynamicGradientCard from '@/components/DynamicGradientCard';


export default function SignersPage() {
  const { connectWallet, isConnected, isInitializing, connection } = useWallet();
  const { isConnected: isEthConnected, address: ethAddress } = useAccount();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [isCheckingVerification, setIsCheckingVerification] = useState(false);

  // Check verification status when wallet is connected
  useEffect(() => {
    const checkVerification = async () => {
      const accountToCheck = connection?.accountId || ethAddress;
      
      if (!accountToCheck) {
        setIsVerified(false);
        return;
      }

      setIsCheckingVerification(true);
      try {
        const response = await fetch(`/api/signers/lookup?account=${accountToCheck}`);
        if (response.ok) {
          const data = await response.json();
          setIsVerified(data.verified === true);
        } else {
          setIsVerified(false);
        }
      } catch (error) {
        console.error('Failed to check verification status:', error);
        setIsVerified(false);
      } finally {
        setIsCheckingVerification(false);
      }
    };

    if (isConnected || isEthConnected) {
      checkVerification();
    }
  }, [isConnected, isEthConnected, connection?.accountId, ethAddress]);

  const handleStartVerification = async () => {
    // Check if we have an ETH connection via RainbowKit
    
    if (isEthConnected) {
      // ETH wallet connected, go directly to verify page
      window.location.href = '/verify';
      return;
    }
    
    if (!isConnected) {
      setIsConnecting(true);
      try {
        // Default to Hedera connection for this flow
        const walletData = await connectWallet('hedera');
        if (walletData) {
          // Successfully connected, now show modal
          setIsModalOpen(true);
        }
      } catch (error) {
        console.error('Failed to connect wallet:', error);
      } finally {
        setIsConnecting(false);
      }
    } else {
      // Already connected, show modal directly
      setIsModalOpen(true);
    }
  };
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center mb-16 mt-16">
          {/* Left Panel - Signers Hero Image */}
          <div className="relative w-full">
            <Image
              src="/signers-hero.png"
              alt="KeyRing Signers Hero"
              width={800}
              height={600}
              className="w-full h-auto"
            />
          </div>

          {/* Right Panel */}
          <div>
            <h1 className="mb-6">Get Rewarded for Securing Web3</h1>
            <h3 className="mb-8">Secure Web3 projects, ensure transparency, and earn rewards as a verified signer on Keyring. Help projects decentralize early, ship fast, and build trust in the ecosystem.</h3>
            
            {isVerified ? (
              <div
                className="inline-flex items-center gap-2 text-black text-xl px-8 py-3 rounded-lg cursor-default"
                style={{
                  background: 'linear-gradient(to right, #8CCBBA, #408FC7)',
                  border: '3px solid #8CCBBA'
                }}
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Verified
              </div>
            ) : (
              <button
                onClick={handleStartVerification}
                disabled={isConnecting || isCheckingVerification}
                className="text-black text-xl px-8 py-3 rounded-lg hover:opacity-80 transition-opacity cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  background: 'linear-gradient(to right, #8CCBBA, #408FC7)',
                  border: '3px solid #8CCBBA'
                }}
              >
                {isConnecting || isCheckingVerification ? 'Loading...' : 'Become A Signer'}
              </button>
            )}
          </div>
        </div>

        {/* Why Become a Signer */}
        <div className="mb-16">
          <h1 className="text-center mb-6">Why Become a Signer</h1>
          <h3 className="text-center mb-12">Turn your expertise into income while building the web3 ecosystem you want to see</h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Box 1 - Earn Rewards */}
            <DynamicGradientCard gradientFrom="#408FC7" gradientTo="#8CCBBA">
              <div className="bg-background rounded-lg p-6 h-full">
                <Image
                  src="/icons/blue-award.png"
                  alt="Award"
                  width={64}
                  height={64}
                  className="w-16 h-auto object-contain mb-4"
                />
                <h2 className="mb-4">Earn Rewards</h2>
                <p>Monitor projects and allow them to move quickly by reviewing proposals and earning rewards for your expertise.</p>
              </div>
            </DynamicGradientCard>

            {/* Box 2 - Realize the Web3 Vision */}
            <DynamicGradientCard gradientFrom="#408FC7" gradientTo="#8CCBBA">
              <div className="bg-background rounded-lg p-6 h-full">
                <Image
                  src="/icons/blue-brain.png"
                  alt="Brain"
                  width={64}
                  height={64}
                  className="w-16 h-auto object-contain mb-4"
                />
                <h2 className="mb-4">Realize the Web3 Vision</h2>
                <p className="mb-4">Fight back against bad actors and rug pulls.</p>
                <p>Help web3 finally thrive by being part of the trust solution.</p>
              </div>
            </DynamicGradientCard>

            {/* Box 3 - Build On-chain Reputation */}
            <DynamicGradientCard gradientFrom="#408FC7" gradientTo="#8CCBBA">
              <div className="bg-background rounded-lg p-6 h-full">
                <Image
                  src="/icons/blue-ribbon.png"
                  alt="Ribbon"
                  width={64}
                  height={64}
                  className="w-16 h-auto object-contain mb-4"
                />
                <h2 className="mb-4">Build On-chain Reputation</h2>
                <p>Your KeyRing reputation will be based on your on-chain activity and can be portable across any web3 platform.</p>
              </div>
            </DynamicGradientCard>
          </div>
        </div>


        {/* How to Get Started */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-foreground text-center mb-12">How to Get Started</h2>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-8 items-stretch">
            <div className="text-center">
              <DynamicGradientCard gradientFrom="#8CCBBA" gradientTo="#408FC7" className="mb-4 relative h-full">
                <div 
                  className="rounded-lg p-6 pt-12 h-full flex flex-col"
                  style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.95), rgba(0,0,0,1))' }}
                >
                  <div 
                    className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-black font-bold text-2xl absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
                    style={{ background: 'linear-gradient(to right, #8CCBBA, #408FC7)' }}
                  >
                    1
                  </div>
                  <h4 className="font-semibold text-foreground mb-2">Apply & Verify</h4>
                  <p className="text-sm text-white font-krub">Complete KYC through Entrust and create your signer profile</p>
                </div>
              </DynamicGradientCard>
            </div>
            <div className="text-center">
              <DynamicGradientCard gradientFrom="#8CCBBA" gradientTo="#408FC7" className="mb-4 relative h-full">
                <div 
                  className="rounded-lg p-6 pt-12 h-full flex flex-col"
                  style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.95), rgba(0,0,0,1))' }}
                >
                  <div 
                    className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-black font-bold text-2xl absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
                    style={{ background: 'linear-gradient(to right, #8CCBBA, #408FC7)' }}
                  >
                    2
                  </div>
                  <h4 className="font-semibold text-foreground mb-2">Get Selected</h4>
                  <p className="text-sm text-white font-krub">Projects randomly select you for their multi-sig lists and pay list bonus</p>
                </div>
              </DynamicGradientCard>
            </div>
            <div className="text-center">
              <DynamicGradientCard gradientFrom="#8CCBBA" gradientTo="#408FC7" className="mb-4 relative h-full">
                <div 
                  className="rounded-lg p-6 pt-12 h-full flex flex-col"
                  style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.95), rgba(0,0,0,1))' }}
                >
                  <div 
                    className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-black font-bold text-2xl absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
                    style={{ background: 'linear-gradient(to right, #8CCBBA, #408FC7)' }}
                  >
                    3
                  </div>
                  <h4 className="font-semibold text-foreground mb-2">Review Transactions</h4>
                  <p className="text-sm text-white font-krub">Get notified of admin actions and review with agent assistance</p>
                </div>
              </DynamicGradientCard>
            </div>
            <div className="text-center">
              <DynamicGradientCard gradientFrom="#8CCBBA" gradientTo="#408FC7" className="mb-4 relative h-full">
                <div 
                  className="rounded-lg p-6 pt-12 h-full flex flex-col"
                  style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.95), rgba(0,0,0,1))' }}
                >
                  <div 
                    className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-black font-bold text-2xl absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
                    style={{ background: 'linear-gradient(to right, #8CCBBA, #408FC7)' }}
                  >
                    4
                  </div>
                  <h4 className="font-semibold text-foreground mb-2">Approve or Reject</h4>
                  <p className="text-sm text-white font-krub">Make informed decisions and sign transactions in your wallet</p>
                </div>
              </DynamicGradientCard>
            </div>
            <div className="text-center">
              <DynamicGradientCard gradientFrom="#8CCBBA" gradientTo="#408FC7" className="mb-4 relative h-full">
                <div 
                  className="rounded-lg p-6 pt-12 h-full flex flex-col"
                  style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.95), rgba(0,0,0,1))' }}
                >
                  <div 
                    className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-black font-bold text-2xl absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
                    style={{ background: 'linear-gradient(to right, #8CCBBA, #408FC7)' }}
                  >
                    5
                  </div>
                  <h4 className="font-semibold text-foreground mb-2">Qualify for Airdrops</h4>
                  <p className="text-sm text-white font-krub">Verified signers qualify for KYRNG airdrops when the token releases</p>
                </div>
              </DynamicGradientCard>
            </div>
          </div>
        </div>

      </div>

      {/* Verification Modal */}
      <VerificationModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />
    </div>
  );
}
