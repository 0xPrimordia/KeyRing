import Image from "next/image";
import Link from "next/link";


export default function SignersPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="pt-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center">
              <Image
                src="/logo.png"
                alt="KeyRing Protocol"
                width={160}
                height={53}
                className="h-14 w-auto"
              />
            </div>
            <nav className="flex space-x-8">
              <Link href="/" className="text-foreground hover:text-primary transition-colors">Registry</Link>
              <Link href="/signers" className="text-primary hover:text-primary-dark transition-colors">Become a Signer</Link>
              <Link href="/register" className="text-foreground hover:text-primary transition-colors">Register List</Link>
            </nav>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-foreground mb-6">
            Become a Verified Signer
          </h1>
          <p className="text-xl text-gray-300 mb-8 max-w-3xl mx-auto">
            Earn LYNX rewards by helping secure the Hedera ecosystem. Join KeyRing&apos;s network of 
            verified signers and get paid to review admin transactions with AI agent assistance.
          </p>
          <div className="flex items-center justify-center space-x-8 text-sm text-gray-400">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-primary mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Earn LYNX rewards
            </div>
            <div className="flex items-center">
              <svg className="w-5 h-5 text-primary mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Flexible participation
            </div>
            <div className="flex items-center">
              <svg className="w-5 h-5 text-primary mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Build reputation
            </div>
          </div>
        </div>

        {/* Reward Structure */}
        <div className="mb-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">How You Earn</h2>
            <p className="text-lg text-gray-400">Multiple reward streams for active, reliable signers</p>
          </div>

          <div className="bg-gray-800 rounded-2xl p-8 border border-gray-700">
            {/* Onboarding Bonus Banner */}
            <div className="bg-gradient-to-r from-primary/20 to-primary-dark/20 rounded-xl p-6 border-2 border-primary/50 mb-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center mr-4">
                    <svg className="w-6 h-6 text-background" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-foreground mb-1">On-Boarding Bonus: 50 LYNX</h3>
                    <p className="text-gray-300 text-sm">Get started with an instant reward for completing identity verification</p>
                  </div>
                </div>
                <div className="ml-6">
                  <button className="bg-primary text-background px-6 py-3 rounded-lg font-semibold hover:bg-primary-dark transition-colors whitespace-nowrap">
                    Start Verification
                  </button>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">List Addition</h3>
                <p className="text-gray-400 text-sm">Base rate bonus when selected for threshold lists</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">Transaction Reviews</h3>
                <p className="text-gray-400 text-sm">Higher rate for reviewing admin transactions with AI agent assistance</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">Reputation Multiplier</h3>
                <p className="text-gray-400 text-sm">Up to 2x bonus based on reliability and response time</p>
              </div>
            </div>
            
            <div className="border-t border-gray-700 pt-6">
              <div className="flex items-center mb-3">
                <svg className="w-6 h-6 text-primary mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h4 className="text-lg font-semibold text-foreground">Reward Distribution</h4>
              </div>
              <p className="text-gray-300 text-sm">
                85% of project payments flow directly to signers. Transaction reviews are your primary earning opportunity, 
                with list bonuses providing additional income when you join new projects.
              </p>
            </div>
          </div>
        </div>


        {/* How It Works */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-foreground text-center mb-12">How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
            <div className="text-center">
              <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center mx-auto mb-4 text-background font-bold text-lg">
                1
              </div>
              <h4 className="font-semibold text-foreground mb-2">Apply & Verify</h4>
              <p className="text-sm text-gray-400">Complete KYC through Entrust and create your signer profile</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center mx-auto mb-4 text-background font-bold text-lg">
                2
              </div>
              <h4 className="font-semibold text-foreground mb-2">Get Selected</h4>
              <p className="text-sm text-gray-400">Projects randomly select you for their threshold lists and pay list bonus</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center mx-auto mb-4 text-background font-bold text-lg">
                3
              </div>
              <h4 className="font-semibold text-foreground mb-2">Review Transactions</h4>
              <p className="text-sm text-gray-400">Get notified of admin actions and review with agent assistance</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center mx-auto mb-4 text-background font-bold text-lg">
                4
              </div>
              <h4 className="font-semibold text-foreground mb-2">Approve or Reject</h4>
              <p className="text-sm text-gray-400">Make informed decisions and sign transactions in your wallet</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center mx-auto mb-4 text-background font-bold text-lg">
                5
              </div>
              <h4 className="font-semibold text-foreground mb-2">Earn Rewards</h4>
              <p className="text-sm text-gray-400">Receive LYNX payments for each approval or rejection</p>
            </div>
          </div>
        </div>

        {/* Reviewer Agent */}
        <div className="mb-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">Agentic Review Flow</h2>
            <p className="text-lg text-gray-400">AI-powered assistance for every transaction review</p>
          </div>

          <div className="bg-gray-800 rounded-2xl p-8 border border-gray-700">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
              <div>
                <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center mb-6">
                  <svg className="w-10 h-10 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-foreground mb-4">Smart Transaction Analysis</h3>
                <p className="text-gray-300 mb-6">
                  Every admin transaction comes with comprehensive AI analysis including contract ABI diffs, 
                  risk assessment, and clear recommendations to help you make informed decisions.
                </p>
                <ul className="space-y-3">
                  <li className="flex items-center text-sm">
                    <svg className="w-4 h-4 text-primary mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-gray-300">Contract upgrade safety checks</span>
                  </li>
                  <li className="flex items-center text-sm">
                    <svg className="w-4 h-4 text-primary mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-gray-300">Permission surface analysis</span>
                  </li>
                  <li className="flex items-center text-sm">
                    <svg className="w-4 h-4 text-primary mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-gray-300">Red flag detection and alerts</span>
                  </li>
                  <li className="flex items-center text-sm">
                    <svg className="w-4 h-4 text-primary mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-gray-300">Human-readable transaction summaries</span>
                  </li>
                </ul>
              </div>
              <div className="bg-gray-700 rounded-xl p-6 border border-gray-600">
                <div className="text-xs text-gray-400 mb-3">AGENT ANALYSIS EXAMPLE</div>
                <div className="space-y-4">
                  <div className="bg-gray-600 rounded-lg p-4">
                    <div className="text-sm font-semibold text-foreground mb-2">Transaction: Update Token Supply Key</div>
                    <div className="text-xs text-gray-300 mb-3">Changing supply key from current contract to new implementation</div>
                    <div className="flex items-center text-xs">
                      <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                      <span className="text-green-400">SAFE - Standard upgrade pattern detected</span>
                    </div>
                  </div>
                  <div className="bg-gray-600 rounded-lg p-4">
                    <div className="text-sm font-semibold text-foreground mb-2">Risk Assessment</div>
                    <div className="text-xs text-gray-300 mb-2">• New contract maintains same permissions</div>
                    <div className="text-xs text-gray-300 mb-2">• No suspicious external calls detected</div>
                    <div className="text-xs text-gray-300">• Upgrade follows established patterns</div>
                  </div>
                  <div className="text-xs text-primary font-semibold">
                    ✓ Recommendation: APPROVE
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>


        {/* CTA Section */}
        <div className="text-center bg-gradient-to-r from-primary/20 to-primary-dark/20 rounded-2xl p-12 border border-primary/30">
          <h2 className="text-3xl font-bold text-foreground mb-4">Ready to Start Earning?</h2>
          <p className="text-lg text-gray-300 mb-8 max-w-2xl mx-auto">
            Join KeyRing&apos;s network of verified signers and help secure the future of decentralized governance 
            while earning LYNX rewards for your participation.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="bg-primary text-background px-8 py-4 rounded-lg font-semibold text-lg hover:bg-primary-dark transition-colors">
              Start Verification
            </button>
            <button className="border border-primary text-primary px-8 py-4 rounded-lg font-semibold text-lg hover:bg-primary/10 transition-colors">
              Learn More
            </button>
          </div>
          <div className="mt-6 text-sm text-gray-400">
            Verification typically takes 24-48 hours • No upfront costs
          </div>
        </div>
      </div>
    </div>
  );
}
