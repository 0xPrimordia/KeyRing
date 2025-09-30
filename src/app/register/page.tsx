import Image from "next/image";
import Link from "next/link";
import Header from '@/components/Header';

const pricingTiers = [
  {
    name: "Starter",
    description: "Perfect for new projects getting started",
    verifiers: "3-10 verifiers",
    price: "500 LYNX",
    features: [
      "Core registry listing",
      "Email notifications",
      "Basic verification checks",
      "Public certification badge",
      "Standard support"
    ],
    popular: false,
    reliability: "Good redundancy - multiple backups prevent delays"
  },
  {
    name: "Standard",
    description: "Most popular for growing projects",
    verifiers: "10-20 verifiers",
    price: "1,200 LYNX",
    features: [
      "Everything in Starter",
      "AI agent pre-flight analysis",
      "Rich dashboard with diffs",
      "Priority notifications",
      "Enhanced reputation tracking",
      "Priority support"
    ],
    popular: true,
    reliability: "High redundancy - inactive signers rarely block approvals"
  },
  {
    name: "DAO",
    description: "Enterprise-grade for serious projects",
    verifiers: "20-30+ verifiers",
    price: "Coming Soon",
    features: [
      "Everything in Standard",
      "Full DAO SaaS features",
      "Proposal portal with analysis",
      "Vote-to-sign bridge",
      "Policy templates & guardrails",
      "Treasury tooling & alerts",
      "Analytics & reporting",
      "Dedicated support"
    ],
    popular: false,
    comingSoon: true,
    reliability: "Maximum redundancy - approvals never stall due to inactive members"
  }
];

export default function RegisterListPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-foreground mb-6">
            Certify Your Admin Keys
          </h1>
          <p className="text-xl text-gray-300 mb-8 max-w-3xl mx-auto">
            Transform your project&apos;s trust profile with KeyRing-certified threshold lists. 
            Show users your admin keys are controlled by verified, independent signers.
          </p>
          <div className="flex items-center justify-center space-x-8 text-sm text-gray-400">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-primary mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Instant trust signal
            </div>
            <div className="flex items-center">
              <svg className="w-5 h-5 text-primary mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              No protocol lock-in
            </div>
            <div className="flex items-center">
              <svg className="w-5 h-5 text-primary mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Hedera-native
            </div>
          </div>
        </div>

        {/* Value Props */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          <div className="text-center">
            <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">Verified Independence</h3>
            <p className="text-gray-400">Every signer is identity-verified through Entrust KYC, ensuring real humans control your admin keys.</p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">Instant Recognition</h3>
              <p className="text-gray-400">Wallets and explorers display &quot;KeyRing Certified&quot; badges, building immediate user confidence.</p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">Smart Analysis</h3>
            <p className="text-gray-400">AI agents provide pre-flight analysis and risk assessment for all admin actions.</p>
          </div>
        </div>

        {/* Contact Section */}
        <div className="mb-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">Get Your Project Certified</h2>
            <p className="text-lg text-gray-400">Ready to build trust with KeyRing Protocol? Reach out to us directly.</p>
          </div>

          <div className="bg-gray-800 rounded-2xl p-12 border border-gray-700 text-center">
            <div className="mb-8">
              <h3 className="text-2xl font-semibold text-foreground mb-4">Contact Us</h3>
              <p className="text-gray-400 mb-8 max-w-2xl mx-auto">
                We're currently working with select projects to onboard them to KeyRing Protocol. 
                Get in touch to discuss your certification needs and learn about our pricing tiers.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
              <a 
                href="https://x.com/lynifyxyz" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center bg-black text-white px-8 py-4 rounded-lg font-semibold text-lg hover:bg-gray-800 transition-colors"
              >
                <svg className="w-6 h-6 mr-3" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
                Contact on X
              </a>
              
              <a 
                href="https://discord.gg/GM5BfpPe2Y" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center bg-[#5865F2] text-white px-8 py-4 rounded-lg font-semibold text-lg hover:bg-[#4752c4] transition-colors"
              >
                <svg className="w-6 h-6 mr-3" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                </svg>
                Join our Discord
              </a>
            </div>

            <div className="mt-8 pt-8 border-t border-gray-700">
              <p className="text-sm text-gray-500">
                We typically respond within 24 hours and can schedule a demo to show you how KeyRing Protocol works.
              </p>
            </div>
          </div>
        </div>

        {/* How It Works */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-foreground text-center mb-12">How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center mx-auto mb-4 text-background font-bold text-lg">
                1
              </div>
              <h4 className="font-semibold text-foreground mb-2">Choose Tier</h4>
              <p className="text-sm text-gray-400">Select your desired verifier count and features</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center mx-auto mb-4 text-background font-bold text-lg">
                2
              </div>
              <h4 className="font-semibold text-foreground mb-2">Pay in LYNX</h4>
              <p className="text-sm text-gray-400">One-time certification fee in LYNX tokens</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center mx-auto mb-4 text-background font-bold text-lg">
                3
              </div>
              <h4 className="font-semibold text-foreground mb-2">Get Verifiers</h4>
              <p className="text-sm text-gray-400">We assign verified signers to your threshold list</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center mx-auto mb-4 text-background font-bold text-lg">
                4
              </div>
              <h4 className="font-semibold text-foreground mb-2">Apply Keys</h4>
              <p className="text-sm text-gray-400">Use the certified keys as your admin KeyList on Hedera</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
