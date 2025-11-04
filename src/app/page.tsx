import Header from '../components/Header';
import Image from 'next/image';
import Link from 'next/link';
import DynamicGradientCard from '../components/DynamicGradientCard';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-center mt-16"> 
      <h1 className="text-4xl font-bold mb-12">Decentralize Early. Build Trust. Move Fast.</h1>
      <h3 className="font-bold mb-8">KeyRing empowers Web3 companies to establish transparent governance from day one—without slowing down development or breaking the bank.</h3>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="relative w-full">
          <Image
            src="/keyring-hero.png"
            alt="KeyRing Protocol"
            width={1920}
            height={1080}
            priority
            className="w-full h-auto"
          />
        </div>
      </div>

      {/* CTA Buttons */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row gap-8 justify-center items-center">
          {/* Secure Your Project Button */}
          <Link
            href="/register"
            className="text-black text-xl px-8 py-3 rounded-lg hover:opacity-80 transition-opacity cursor-pointer"
            style={{
              background: 'linear-gradient(to right, #F1BD5C, #E77C39)',
              border: '3px solid #F1BD5C'
            }}
          >
            Secure Your Project
          </Link>

          {/* Become a Signer Button */}
          <Link
            href="/signers"
            className="text-black text-xl px-8 py-3 rounded-lg hover:opacity-80 transition-opacity cursor-pointer"
            style={{
              background: 'linear-gradient(to right, #8CCBBA, #408FC7)',
              border: '3px solid #8CCBBA'
            }}
          >
            Become a Signer
          </Link>
        </div>
          </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 mt-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Left Panel */}
          <div className="mt-60 pr-16">
            <h2 className="font-bold mb-6">Why Trust is the Real Problem</h2>
            <h3 className="mt-4">Despite billions invested, the Web3 ecosystem continues to suffer from trust deficits that hold back adoption and innovation.</h3>
            <h3 className="mt-4">Many security standards, such as SSL certificates, were needed to move web1.0 into web2.0. We still lack adequate trust layers to fully transition from web2.0 into web3.0.</h3>
            <h3 className="mt-4">The result? <span style={{ color: '#E77C39' }}>$3.5 billion</span> lost in rug pulls in 2024 alone.</h3>
        </div>

          {/* Right Panel - Highlight Cards */}
          <div className="space-y-6">
            {/* Card 1 */}
            <DynamicGradientCard gradientFrom="#B63B2B" gradientTo="#E77C39">
              <div className="bg-background rounded-lg p-6">
                <div className="flex gap-6 items-center">
                  <div className="flex-shrink-0">
                    <Image
                      src="/icons/reward.png"
                      alt="Award"
                      width={64}
                      height={64}
                      className="w-16 h-auto object-contain"
                    />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold mb-4">No Standards or Verifications</h3>
                    <p>Without a standardized way to verify legitimacy, users are forced to trust every new project, token, or coin at face value. Many of these projects feature anonymous teams that could be hiding bad actors.</p>
          </div>
        </div>
              </div>
            </DynamicGradientCard>

            {/* Card 2 */}
            <DynamicGradientCard gradientFrom="#B63B2B" gradientTo="#E77C39">
              <div className="bg-background rounded-lg p-6">
                <div className="flex gap-6 items-center">
                  <div className="flex-shrink-0">
                    <Image
                      src="/icons/tokens.png"
                      alt="Tokens"
                      width={64}
                      height={64}
                      className="w-16 h-auto object-contain"
                    />
              </div>
                      <div className="flex-1">
                    <h3 className="font-bold mb-4">Centralized Admin Enables Scammers</h3>
                    <p className="mb-4">Single operators of contracts create a point of centralization that allow for the vast majority of rug pulls, scams, and fraud in web3.</p>
                    <p>Even well intentioned-projects deviate from roadmaps and promises without accountability, leaving communities feeling betrayed.</p>
                      </div>
                    </div>
                          </div>
            </DynamicGradientCard>

            {/* Card 3 */}
            <DynamicGradientCard gradientFrom="#B63B2B" gradientTo="#E77C39">
              <div className="bg-background rounded-lg p-6">
                <div className="flex gap-6 items-center">
                  <div className="flex-shrink-0">
                    <Image
                      src="/icons/no-users.png"
                      alt="No Users"
                      width={64}
                      height={64}
                      className="w-16 h-auto object-contain"
                    />
                        </div>
                  <div className="flex-1">
                    <h3 className="font-bold mb-4">Current Solutions Still Fall Short</h3>
                    <p className="mb-4">Options like multi-sigs and DAOs are a step forward, but don't provide enough transparency into signers or provide ways to hold members, many anonymous, accountable.</p>
                    <p>These options also slow down decision making and are expensive to set up, particularly for early stage companies that need them most.</p>
                    </div>
                    </div>
              </div>
            </DynamicGradientCard>
          </div>
        </div>
            </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 mt-16">
        <h1 className="text-center mb-8">How KeyRing Changes Everything</h1>
        <h3 className="text-center mb-24">KeyRing combines transparent oversight, reputation systems, and economic incentives to allow early teams to create real accountability—without sacrificing speed or breaking the bank.</h3>
        
        {/* Three Cards in a Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1 */}
          <DynamicGradientCard gradientFrom="#408FC7" gradientTo="#8CCBBA">
            <div className="bg-background rounded-lg p-6 h-full">
              <div className="flex flex-col">
                <Image
                  src="/icons/blue-badge.png"
                  alt="Badge"
                  width={64}
                  height={64}
                  className="w-16 h-auto object-contain mb-4"
                />
                <h2 className="mb-4">Platform for Trust</h2>
                <p>Projects augment their smart contracts with KeyRing to set up a verified list or multi-signature structure on-chain. Anyone can verify this at any time, thereby shifting the need to trust in someone's word to trust in someone's code. </p>
                <p className="mt-4">This standard and transparent approach allows projects to prove their commitment to users and build trust from day one.</p>
              </div>
            </div>
          </DynamicGradientCard>

          {/* Card 2 */}
          <DynamicGradientCard gradientFrom="#408FC7" gradientTo="#8CCBBA">
            <div className="bg-background rounded-lg p-6 h-full">
              <div className="flex flex-col">
                <Image
                  src="/icons/blue-reliable.png"
                  alt="Reliable"
                  width={64}
                  height={64}
                  className="w-16 h-auto object-contain mb-4"
                />
                <h2 className="mb-4">Verifiable Accountability</h2>
                <p>Every signer is  identity-verified through KeyRing first but can stay anonymous within the platform. Signers can be given incentives to speed up review, and all their actions are tracked on-chain in their reputation history. </p>
                <p className="mt-4">This structure provides public accountability and reputation verification for all actions between signers and projects on the platform.</p>
              </div>
            </div>
          </DynamicGradientCard>

          {/* Card 3 */}
          <DynamicGradientCard gradientFrom="#408FC7" gradientTo="#8CCBBA">
            <div className="bg-background rounded-lg p-6 h-full">
              <div className="flex flex-col">
                <Image
                  src="/icons/blue-graph.png"
                  alt="Graph"
                  width={64}
                  height={64}
                  className="w-16 h-auto object-contain mb-4"
                />
                <h2 className="mb-4">For Early Projects</h2>
                <p>Instead of slowly earning trust in the community and prove their track record, or setting up an expensive and sometimes cumbersome DAO, young teams and projects can now focus on building. </p>
                <p className="mt-4">As trust becomes built-in, users, investors, and businesses feel safe to participate, unlocking Web3's full potential.</p>
              </div>
            </div>
          </DynamicGradientCard>
                    </div>
                      </div>
       <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 mt-16">
         <h1 className="text-center mb-16">How KeyRing Works</h1>
         
         {/* Two Side-by-Side Boxes with Arrows */}
         <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-4 items-stretch">
           {/* Orange Box - Projects */}
           <DynamicGradientCard gradientFrom="#B63B2B" gradientTo="#E77C39" className="flex flex-col">
             <div className="bg-background rounded-lg p-6 h-full">
               <div className="flex gap-6 items-center mb-6">
                 <Image
                   src="/icons/maintain.png"
                   alt="Maintain"
                   width={64}
                   height={64}
                   className="w-16 h-auto object-contain"
                 />
                 <h2>Projects Maintain Threshold Lists</h2>
                      </div>
               
               {/* Bullet Points */}
               <ul className="space-y-4 ml-8">
                 <li className="flex gap-3 items-start">
                   <Image
                     src="/icons/orange-bullet.png"
                     alt="Bullet"
                     width={24}
                     height={24}
                     className="w-6 h-6 flex-shrink-0 mt-1"
                   />
                   <span>Projects generate a list of signers on KeyRing to replace their centralized admin account and rewards these signers in KYRNG tokens for reviewing and approving project changes.</span>
                 </li>
                 <li className="flex gap-3 items-start">
                   <Image
                     src="/icons/orange-bullet.png"
                     alt="Bullet"
                     width={24}
                     height={24}
                     className="w-6 h-6 flex-shrink-0 mt-1"
                   />
                   <span>Projects get fast, decentralized approval of their changes and can demonstrate their accountability to their community.</span>
                 </li>
                 <li className="flex gap-3 items-start">
                   <Image
                     src="/icons/orange-bullet.png"
                     alt="Bullet"
                     width={24}
                     height={24}
                     className="w-6 h-6 flex-shrink-0 mt-1"
                   />
                   <span>Projects deposit KYRNG, KeyRing's incentive token, to deploy a threshold list, and select signers to replace their centralized admin account.</span>
                 </li>
                 <li className="flex gap-3 items-start">
                   <Image
                     src="/icons/orange-bullet.png"
                     alt="Bullet"
                     width={24}
                     height={24}
                     className="w-6 h-6 flex-shrink-0 mt-1"
                   />
                   <span>Each change a project wants to make needs to be approved by signers and paid for in KYRNG.</span>
                 </li>
               </ul>
                      </div>
           </DynamicGradientCard>

           {/* Arrows - Hidden on mobile */}
           <div className="hidden md:flex items-center justify-center self-center">
             <Image
               src="/icons/howitworks-arrows.png"
               alt="Arrows"
               width={40}
               height={40}
               className="w-10 h-auto object-contain"
             />
           </div>

           {/* Blue Box - Signers */}
           <DynamicGradientCard gradientFrom="#408FC7" gradientTo="#8CCBBA" className="flex flex-col">
             <div className="bg-background rounded-lg p-6 h-full">
               <div className="flex gap-6 items-center mb-6">
                 <Image
                   src="/icons/people.png"
                   alt="People"
                   width={64}
                   height={64}
                   className="w-16 h-auto object-contain"
                 />
                 <h2>Signers Oversee and Earn Rewards</h2>
               </div>
               
               {/* Bullet Points */}
               <ul className="space-y-4 ml-8">
                 <li className="flex gap-3 items-start">
                   <Image
                     src="/icons/blue-bullet.png"
                     alt="Bullet"
                     width={24}
                     height={24}
                     className="w-6 h-6 flex-shrink-0 mt-1"
                   />
                   <span>Verified signers review transactions, enforce rules, and maintain accountability for projects that add them to a threshold list.</span>
                 </li>
                 <li className="flex gap-3 items-start">
                   <Image
                     src="/icons/blue-bullet.png"
                     alt="Bullet"
                     width={24}
                     height={24}
                     className="w-6 h-6 flex-shrink-0 mt-1"
                   />
                   <span>Signers independently approve or reject a proposal by a project based on on-chain and contract analysis.</span>
                 </li>
                 <li className="flex gap-3 items-start">
                   <Image
                     src="/icons/blue-bullet.png"
                     alt="Bullet"
                     width={24}
                     height={24}
                     className="w-6 h-6 flex-shrink-0 mt-1"
                   />
                   <span>Signers are rewarded with KYRNG that projects deposited for each verified activity, creating a transparent, community-owned ecosystem.</span>
                 </li>
                 <li className="flex gap-3 items-start">
                   <Image
                     src="/icons/blue-bullet.png"
                     alt="Bullet"
                     width={24}
                     height={24}
                     className="w-6 h-6 flex-shrink-0 mt-1"
                   />
                   <span>Every good decision increases a signer's on-chain reputation score, leading to more opportunities and higher rewards.</span>
                 </li>
               </ul>
                      </div>
           </DynamicGradientCard>
                  </div>
      </div>
    </div>
  );
}
