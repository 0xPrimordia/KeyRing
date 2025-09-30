import Image from "next/image";
import Link from "next/link";
import Header from '../../components/Header';

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

        {/* Pricing Tiers */}
        <div className="mb-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">Choose Your Certification Tier</h2>
            <p className="text-lg text-gray-400">Higher verifier counts signal stronger governance health</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {pricingTiers.map((tier, index) => (
              <div key={index} className={`relative bg-gray-800 rounded-2xl p-8 border-2 ${
                tier.popular ? 'border-primary' : 'border-gray-700'
              }`}>
                {tier.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <span className="bg-primary text-background px-4 py-1 rounded-full text-sm font-semibold">
                      Most Popular
                    </span>
                  </div>
                )}
                
                <div className="text-center mb-8">
                  <h3 className="text-2xl font-bold text-foreground mb-2">{tier.name}</h3>
                  <p className="text-gray-400 mb-4">{tier.description}</p>
                  <div className={`text-4xl font-bold mb-2 ${tier.comingSoon ? 'text-gray-400' : 'text-primary'}`}>
                    {tier.price}
                  </div>
                  <div className="text-sm text-gray-400 mb-3">{tier.verifiers}</div>
                  <div className="text-xs text-primary bg-primary/10 rounded-full px-3 py-1">
                    {tier.reliability}
                  </div>
                </div>

                <ul className="space-y-3 mb-8">
                  {tier.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-center text-sm">
                      <svg className="w-4 h-4 text-primary mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span className="text-gray-300">{feature}</span>
                    </li>
                  ))}
                </ul>

                <button className={`w-full py-3 px-6 rounded-lg font-semibold transition-colors ${
                  tier.comingSoon
                    ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                    : tier.popular 
                      ? 'bg-primary text-background hover:bg-primary-dark' 
                      : 'bg-gray-700 text-foreground hover:bg-gray-600'
                }`} disabled={tier.comingSoon}>
                  {tier.comingSoon ? 'Coming Soon' : 'Get Started'}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Payment Info */}
        <div className="bg-gray-800 rounded-2xl p-8 mb-16 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-semibold text-foreground mb-2">Payment in LYNX</h3>
              <p className="text-gray-400">
                All payments are made in LYNX tokens to support the Hedera ecosystem. 
                85% of fees go directly to your verifiers as incentives.
              </p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-primary mb-1">LYNX</div>
              <div className="text-sm text-gray-400">Preferred payment</div>
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

        {/* CTA Section */}
        <div className="text-center bg-gradient-to-r from-primary/20 to-primary-dark/20 rounded-2xl p-12 border border-primary/30">
          <h2 className="text-3xl font-bold text-foreground mb-4">Ready to Build Trust?</h2>
          <p className="text-lg text-gray-300 mb-8 max-w-2xl mx-auto">
            Join the growing number of projects using KeyRing Protocol to demonstrate 
            true decentralization and build user confidence.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="bg-primary text-background px-8 py-4 rounded-lg font-semibold text-lg hover:bg-primary-dark transition-colors">
              Start Certification
            </button>
            <button className="border border-primary text-primary px-8 py-4 rounded-lg font-semibold text-lg hover:bg-primary/10 transition-colors">
              Schedule Demo
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
