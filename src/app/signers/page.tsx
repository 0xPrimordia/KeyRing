'use client';

import { useWallet } from '../../providers/WalletProvider';
import { useAccount } from 'wagmi';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import Image from 'next/image';
import DynamicGradientCard from '@/components/DynamicGradientCard';


export default function SignersPage() {
  const router = useRouter();
  const { connectWallet, isConnected, connection, getPublicKey, publicKey } = useWallet();
  const { isConnected: isEthConnected, address: ethAddress } = useAccount();
  const [isConnecting, setIsConnecting] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  const accountId = connection?.type === 'hedera' ? connection.accountId : null;
  const walletAddress = connection?.type === 'base' ? connection.address : (ethAddress ?? null);
  const lookupId = accountId ?? walletAddress;

  // Check registration status when wallet is connected
  useEffect(() => {
    const checkRegistration = async () => {
      if (!lookupId) {
        setIsRegistered(false);
        return;
      }
      setIsChecking(true);
      try {
        const body = walletAddress ? { walletAddress } : { accountId };
        const response = await fetch('/api/signers/lookup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        const data = await response.json();
        setIsRegistered(response.ok && data.success === true);
      } catch {
        setIsRegistered(false);
      } finally {
        setIsChecking(false);
      }
    };

    if (isConnected || isEthConnected) {
      checkRegistration();
    }
  }, [isConnected, isEthConnected, lookupId, walletAddress, accountId]);

  const handleBecomeSigner = async () => {
    if (!isConnected && !isEthConnected) {
      setIsConnecting(true);
      try {
        let walletData = await connectWallet('hedera');
        if (!walletData) walletData = await connectWallet('base');
        if (!walletData) {
          alert('Please connect your wallet using the header');
          return;
        }
        // Connection established - state will update, user can click again or we proceed
        // Use walletData directly for immediate registration
        const connAccountId = walletData.type === 'hedera' ? walletData.accountId : null;
        const connAddress = walletData.type === 'base' ? walletData.address : null;
        if (connAccountId || connAddress) {
          setIsConnecting(true);
          try {
            if (connAddress) {
              const res = await fetch('/api/signers/ethereum', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ wallet_address: connAddress }),
              });
              const data = await res.json();
              if (!data.success && !data.signer) throw new Error(data.error || 'Registration failed');
            } else if (connAccountId) {
              const network = process.env.NEXT_PUBLIC_HEDERA_NETWORK || 'testnet';
              const mirrorUrl = network === 'mainnet' ? 'https://mainnet.mirrornode.hedera.com' : 'https://testnet.mirrornode.hedera.com';
              const res = await fetch(`${mirrorUrl}/api/v1/accounts/${connAccountId}`);
              const acc = await res.json();
              const currentPublicKey = acc.key?.key ?? (await getPublicKey(connAccountId));
              if (!currentPublicKey) throw new Error('Could not obtain public key');
              const regRes = await fetch('/api/signers/hedera', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ account_id: connAccountId, public_key: currentPublicKey }),
              });
              const regData = await regRes.json();
              if (!regData.success && !regData.signer) throw new Error(regData.error || 'Registration failed');
            }
            router.push('/signer-dashboard');
          } catch (error) {
            console.error('Registration failed:', error);
            alert(error instanceof Error ? error.message : 'Registration failed');
          } finally {
            setIsConnecting(false);
          }
        }
      } catch (error) {
        console.error('Failed to connect wallet:', error);
        alert('Failed to connect wallet');
      } finally {
        setIsConnecting(false);
      }
      return;
    }

    if (!lookupId) return;

    setIsConnecting(true);
    try {
      if (walletAddress) {
        const res = await fetch('/api/signers/ethereum', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ wallet_address: walletAddress }),
        });
        const data = await res.json();
        if (!data.success && !data.signer) throw new Error(data.error || 'Registration failed');
      } else if (accountId) {
        let currentPublicKey = publicKey;
        if (!currentPublicKey) currentPublicKey = await getPublicKey(accountId);
        if (!currentPublicKey) {
          const network = process.env.NEXT_PUBLIC_HEDERA_NETWORK || 'testnet';
          const mirrorUrl = network === 'mainnet' ? 'https://mainnet.mirrornode.hedera.com' : 'https://testnet.mirrornode.hedera.com';
          const res = await fetch(`${mirrorUrl}/api/v1/accounts/${accountId}`);
          const acc = await res.json();
          currentPublicKey = acc.key?.key ?? null;
        }
        if (!currentPublicKey) throw new Error('Could not obtain public key');
        const res = await fetch('/api/signers/hedera', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ account_id: accountId, public_key: currentPublicKey }),
        });
        const data = await res.json();
        if (!data.success && !data.signer) throw new Error(data.error || 'Registration failed');
      } else {
        throw new Error('Please connect your wallet first');
      }
      router.push('/signer-dashboard');
    } catch (error) {
      console.error('Registration failed:', error);
      alert(error instanceof Error ? error.message : 'Registration failed');
    } finally {
      setIsConnecting(false);
    }
  };
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center mb-16 mt-16 mb-32">
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
            
            {isRegistered ? (
              <div
                className="inline-flex items-center gap-2 text-black text-xl px-8 py-3 rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                style={{
                  background: 'linear-gradient(to right, #8CCBBA, #408FC7)',
                  border: '3px solid #8CCBBA'
                }}
                onClick={() => router.push('/signer-dashboard')}
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Go to Dashboard
              </div>
            ) : (
              <button
                onClick={handleBecomeSigner}
                disabled={isConnecting || isChecking}
                className="text-black text-xl px-8 py-3 rounded-lg hover:opacity-80 transition-opacity cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  background: 'linear-gradient(to right, #8CCBBA, #408FC7)',
                  border: '3px solid #8CCBBA'
                }}
              >
                {isConnecting || isChecking ? 'Loading...' : 'Become A Signer'}
              </button>
            )}
          </div>
        </div>

        {/* Why Become a Signer */}
        <div className="mb-16">
          <h1 className="text-center mb-6">Why Become a Signer</h1>
          <h3 className="text-center mb-16">Turn your expertise into income while building the web3 ecosystem you want to see</h3>

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
          <h1 className="text-3xl font-bold text-foreground text-center mb-24 mt-28">How to Get Started</h1>
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
                  <h4 className="font-semibold text-foreground mb-2">Register</h4>
                  <p className="text-sm text-white font-krub">Connect your wallet and register as a signer to participate in boost transactions</p>
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

        {/* Bottom CTA Button */}
        <div className="mt-16 text-center">
          <button
            onClick={isRegistered ? () => router.push('/signer-dashboard') : handleBecomeSigner}
            disabled={isConnecting || isChecking}
            className="inline-block text-black text-xl px-8 py-3 rounded-lg hover:opacity-80 transition-opacity cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: 'linear-gradient(to right, #8CCBBA, #408FC7)',
              border: '3px solid #8CCBBA'
            }}
          >
            {isChecking ? (
              'Checking...'
            ) : isRegistered ? (
              <span className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Go to Dashboard
              </span>
            ) : (
              isConnecting ? 'Connecting & Registering...' : 'Become A Signer'
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
