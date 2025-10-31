# KeyRing Protocol

**Hedera Africa Hackathon 2025**  
**Track 3: DeFi, DAOs, and Decentralized Social Impact**  
**Subtrack 4: Gamified Community Governance**

## Project Overview

KeyRing Protocol is a decentralized governance and security platform that enables projects to certify their admin keys through verified, independent signers. By leveraging Hedera's unique threshold key architecture and scheduled transactions, KeyRing creates a transparent, gamified ecosystem where community members can participate in project governance while earning rewards.

The platform addresses a critical trust gap in the African blockchain ecosystem: how can users verify that project admin keys are truly decentralized and not controlled by a single entity? KeyRing provides cryptographic proof of distributed control through Hedera's native primitives, making it immediately verifiable on-chain.

**Live Mainnet Deployment**: [keyring.lynxify.xyz](https://keyring.lynxify.xyz/)  
**Status**: ✅ Live on Hedera Mainnet | 🚧 Onboarding signers for first threshold lists

### 📺 Demo & Presentation

- **Video Demo**: [Watch on YouTube](https://www.youtube.com/watch?v=QBxSfG5lw54)
- **Pitch Deck**: [View on Google Drive](https://drive.google.com/file/d/1Qvh__XQbXIOT5wmOvvt9DLaHPkAr4NUg/view?usp=sharing)

---

## Hedera Integration Summary

KeyRing Protocol deeply integrates four core Hedera services to create a robust, economically sustainable governance platform optimized for African market conditions.

### 1. Hedera Token Service (HTS) - KYRNG Rewards Token

**Why HTS**: We chose HTS for the KYRNG rewards token because Hedera's native token standard provides **predictable $0.0001 transaction fees** that enable micro-rewards distribution at scale. In African markets where transaction costs can represent a significant percentage of small reward amounts, HTS's low fixed fees make it economically viable to reward signers for individual transaction reviews (10 KYRNG per signature). Unlike ERC-20 tokens on other chains where gas fees fluctuate wildly ($5-50 per transaction), HTS guarantees that rewards always reach signers without being eroded by network fees.

**Transaction Types**:
- `TokenCreateTransaction`: Creates the KYRNG fungible token with custom properties
- `TokenAssociateTransaction`: Associates KYRNG token with signer accounts
- `TokenMintTransaction`: Mints rewards for signer participation
- `TransferTransaction`: Distributes KYRNG rewards to signers on schedule approval

**Economic Justification**: HTS's **$0.0001 per transaction** fee structure enables micro-payments that are 500-5000x cheaper than alternative blockchain networks. For a signer earning 10 KYRNG tokens (~$0.10 USD equivalent), the 0.1% network fee overhead preserves 99.9% of their reward value. This predictability is essential for African users on limited budgets where even small, unexpected costs can prevent participation. Additionally, HTS tokens are natively queryable via Mirror Nodes at no cost, enabling real-time balance tracking without additional API fees.

### 2. Hedera Consensus Service (HCS-2) - Immutable Governance Records

**Why HCS-2**: We utilize HCS-2 indexed topics to create an **immutable, auditable log** of all governance actions including project registrations, signer feedback, AI risk analysis, and transaction rejections. HCS-2 was chosen over traditional databases because it provides **cryptographically verifiable timestamps** with ABFT finality in 3-5 seconds, making it impossible for project teams to retroactively manipulate governance records. For African markets where institutional trust is often limited, this blockchain-native audit trail provides transparent accountability that can be independently verified by anyone.

**Transaction Types**:
- `TopicCreateTransaction`: Creates indexed HCS-2 topics for project registries
- `TopicMessageSubmitTransaction`: Submits project registration messages with metadata
- `TopicMessageSubmitTransaction`: Records signer feedback on scheduled transactions
- `TopicMessageSubmitTransaction`: Logs AI-generated risk analysis reports
- `TopicMessageSubmitTransaction`: Archives transaction rejection events with reasons

**Economic Justification**: HCS-2 messages cost **$0.0001 per submission** regardless of message size (up to 1024 bytes), making it dramatically cheaper than storing equivalent data in smart contract storage ($5-50 per record on other chains). For our use case, storing 1000 governance events per month costs only $0.10 USD on Hedera versus $5,000-50,000 on Ethereum. This 50,000x cost reduction enables comprehensive governance logging that would be economically prohibitive elsewhere. The **instant finality** (3-5 seconds) ensures governance actions are immediately verifiable, critical for maintaining signer engagement and preventing decision fatigue common in African communities with limited reliable internet connectivity.

### 3. Scheduled Transactions - Transparent Multi-Sig Governance

**Why Scheduled Transactions**: Hedera's native **scheduled transaction primitive** enables projects to create admin transactions that require multiple independent approvals before execution. We chose this over smart contract-based multi-sig solutions because scheduled transactions provide **transparent visibility** into pending actions via Mirror Nodes and HashScan, allowing signers to review and approve transactions through any Hedera wallet. This removes technical barriers for African signers who may not have access to custom dApps but can use standard wallet apps like HashPack or Blade.

**Transaction Types**:
- `ScheduleCreateTransaction`: Creates pending admin transactions requiring signer approval
- `ScheduleSignTransaction`: Signers approve scheduled transactions from their wallets
- `ScheduleDeleteTransaction`: Cancels rejected or expired scheduled transactions
- `ScheduleInfoQuery`: Retrieves schedule status and collected signatures (via Mirror Node API)

**Economic Justification**: Scheduled transactions cost **$0.05 to create + $0.0001 per signature**, making them 100-1000x cheaper than deploying and executing custom multi-sig smart contracts ($50-500 on other chains). For a 5-of-10 threshold requiring 5 signatures, the total cost is $0.0505 USD compared to $50-500 elsewhere. This enables even small African projects with limited treasuries to implement enterprise-grade security. The **Mirror Node API** provides free, real-time query access to schedule status, eliminating the need for expensive indexing infrastructure and making it feasible for community-run governance platforms with minimal operating budgets.

### 4. Threshold Key Lists - Cryptographic Proof of Decentralization

**Why Threshold Lists**: Hedera's native **threshold key structure** (M-of-N signatures) allows projects to prove their admin keys are distributed across verified, independent signers. We leverage this to create project admin keys that require, for example, 7-of-10 verified signers to approve changes, with each signer's identity verified through HCS-11 profiles. This provides **cryptographically verifiable decentralization** that can be audited on-chain by anyone, addressing the critical trust problem in African DeFi where "rug pulls" and single-entity control are common concerns.

**Transaction Types**:
- `AccountCreateTransaction`: Creates threshold list accounts with M-of-N key structures
- `AccountUpdateTransaction`: Modifies threshold requirements or signer composition
- `KeyList` (data structure): Defines the set of public keys and threshold requirement
- `ThresholdKey` (data structure): Specifies M-of-N signature requirements

**Economic Justification**: Creating a threshold list account costs **$1 + $0.0001 per key**, dramatically cheaper than deploying equivalent multi-sig smart contracts ($500-5,000 on other chains). For a 10-signer threshold list, the total setup cost is $1.001 USD versus $5,000 elsewhere - a 5,000x cost reduction. This makes enterprise-grade security accessible to African startups with minimal capital. The **on-chain transparency** of threshold keys (visible via Mirror Nodes at no cost) provides instant proof of decentralization to investors, users, and regulators without requiring expensive third-party audits. This transparency is critical for building trust in African markets where information asymmetry often prevents user adoption.

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           KeyRing Protocol Architecture                      │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────┐         ┌──────────────────────────────────────────────────┐
│   Frontend   │         │              Hedera Network                       │
│  (Next.js)   │         │                                                   │
│              │         │  ┌─────────────────────────────────────────────┐ │
│ • Dashboard  │◄────────┼──│  Mirror Node API (REST)                     │ │
│ • Wallet UI  │  Query  │  │  • Account queries                          │ │
│ • Signer     │ ────────┼─►│  • Schedule status                          │ │
│   Registry   │         │  │  • HCS-2 topic messages                     │ │
│              │         │  │  • Token balances                           │ │
└──────┬───────┘         │  └─────────────────────────────────────────────┘ │
       │                 │                                                   │
       │  Wallet         │  ┌─────────────────────────────────────────────┐ │
       │  (HashPack/     │  │  Hedera Consensus Service (HCS-2)           │ │
       │   Blade)        │  │  • Project Registry Topics                  │ │
       └─────────────────┼─►│  • Signer Feedback Logs                     │ │
                         │  │  • AI Risk Analysis Archive                 │ │
                         │  │  • Rejection Event Records                  │ │
                         │  └─────────────────────────────────────────────┘ │
┌──────────────┐         │                                                   │
│   Backend    │         │  ┌─────────────────────────────────────────────┐ │
│ (Next.js API)│         │  │  Scheduled Transactions                     │ │
│              │         │  │  • Pending admin actions                    │ │
│ • HCS-11     │◄────────┼──│  • Signature collection                     │ │
│   Profiles   │  Submit │  │  • Auto-execution on threshold              │ │
│ • Project    │ ────────┼─►│                                             │ │
│   Registry   │         │  └─────────────────────────────────────────────┘ │
│ • Rewards    │         │                                                   │
│   Tracking   │         │  ┌─────────────────────────────────────────────┐ │
└──────┬───────┘         │  │  Hedera Token Service (HTS)                 │ │
       │                 │  │  • KYRNG Rewards Token                      │ │
       │  Store/Query    │  │  • Token associations                       │ │
       ▼                 │  │  • Reward distributions                     │ │
┌──────────────┐         │  └─────────────────────────────────────────────┘ │
│   Supabase   │         │                                                   │
│  (PostgreSQL)│         │  ┌─────────────────────────────────────────────┐ │
│              │         │  │  Threshold Key Lists                        │ │
│ • Signers    │         │  │  • M-of-N admin accounts                    │ │
│ • Projects   │         │  │  • KeyList structures                       │ │
│ • Whitelist  │         │  │  • Verified signer keys                     │ │
│ • Rewards    │         │  └─────────────────────────────────────────────┘ │
│ • Sessions   │         │                                                   │
└──────────────┘         └──────────────────────────────────────────────────┘

DATA FLOW:
1. User connects wallet → Frontend queries Mirror Node for account data
2. Signer registration → Backend creates HCS-11 profile → Posts to HCS-2 topic
3. Project registers → Backend submits to HCS-2 → Creates threshold list account
4. Admin creates action → ScheduleCreateTransaction → Stored on Hedera
5. Signers review → Frontend queries Mirror Node → Displays pending schedules
6. Signer approves → ScheduleSignTransaction via wallet → Recorded on-chain
7. Threshold met → Auto-executes → Backend logs to HCS-2 → Mints KYRNG rewards
8. User queries rewards → Frontend reads from Mirror Node → Displays KYRNG balance
```

---

## Deployment & Setup Instructions

Follow these steps to run KeyRing Protocol locally on Hedera Testnet in under 10 minutes.

### Prerequisites

- Node.js v20.13.1 or higher
- npm v10.5.2 or higher
- Git
- A Hedera Testnet account ([create one here](https://portal.hedera.com))
- A Supabase account ([create one here](https://supabase.com))
- A WalletConnect Project ID ([create one here](https://cloud.walletconnect.com))

### Step 1: Clone Repository

```bash
git clone https://github.com/yourusername/keyring-protocol.git
cd keyring-protocol
```

### Step 2: Install Dependencies

```bash
npm install
```

**Expected output**: ~1759 packages installed in 10-15 seconds

### Step 3: Configure Environment Variables

```bash
cp env.template .env.local
```

Edit `.env.local` and configure the following **required** variables:

```bash
# Hedera Network Configuration
NEXT_PUBLIC_HEDERA_NETWORK=testnet

# Hedera Operator Account (from portal.hedera.com)
HEDERA_TESTNET_ACCOUNT_ID=0.0.YOUR_ACCOUNT_ID
HEDERA_TESTNET_PRIVATE_KEY=302e020100300506032b657004220420YOUR_PRIVATE_KEY

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SECRET=your_service_role_key_here

# WalletConnect Configuration
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_walletconnect_project_id
```

**Security Note**: See `.env.template` for complete configuration options. Never commit `.env.local` to version control.

### Step 4: Database Setup

Run the Supabase migrations to create required tables:

```bash
# Test database connection
npm run test:db

# Apply schema (run SQL from supabase/schema.sql in Supabase dashboard)
# Then run all migrations in supabase/migrations/ in order

# Verify setup
npm run test:db
```

**Expected output**: "✅ Database connection successful"

### Step 5: Initialize Hedera Resources

Create the project registry HCS-2 topic:

```bash
npm run hedera:project
```

**Expected output**: Creates an HCS-2 topic and displays the Topic ID. Copy this ID to `.env.local` as `PROJECT_REGISTRY_TOPIC_TESTNET`.

### Step 6: Start Development Server

```bash
npm run dev
```

**Expected output**: 
```
▲ Next.js 15.5.4 (Turbopack)
- Local:        http://localhost:3000
- Environments: .env.local

✓ Starting...
✓ Ready in 2.3s
```

### Step 7: Access the Application

Open your browser and navigate to:

- **Main App**: http://localhost:3000
- **Signer Dashboard**: http://localhost:3000/signer-dashboard
- **Project Registry**: http://localhost:3000/register
- **Signer Registration**: http://localhost:3000/signers

### Optional: Create Demo Threshold List & Scheduled Transaction

To test the full governance flow with threshold keys and scheduled transactions:

```bash
# Create a 2-of-3 threshold list account
npm run hedera:threshold

# Create a test scheduled transaction
npm run boost:create

# Query pending schedules
npm run schedules:query
```

**Expected output**: Creates threshold list account and scheduled transaction, displays IDs in console. These can be signed via the Signer Dashboard using HashPack wallet.

---

## Running Environment

### Frontend (Next.js)
- **Command**: `npm run dev`
- **Port**: http://localhost:3000
- **Framework**: Next.js 15.5.4 with Turbopack
- **Wallet Support**: HashPack, Blade, MetaMask, Coinbase Wallet, Rainbow

### Backend (Next.js API Routes)
- **Runs automatically** with frontend server
- **Routes**: `/api/*` (HCS-11 profiles, signer registry, rewards)
- **Database**: Supabase PostgreSQL (remote)
- **Hedera Interactions**: Mirror Node queries + transaction submissions

### Key Features Available
- **Signer Registration**: `/signers` - Register as a verified signer (with KYC bypass for judges)
- **Signer Dashboard**: `/signer-dashboard` - View and sign pending scheduled transactions
- **Project Registry**: `/register` - Register projects for KeyRing certification
- **Threshold Lists**: View certified projects with verified threshold key lists
- **Rewards Tracking**: Real-time KYRNG token balance and earnings history

---

## Deployed Hedera IDs

### Mainnet Deployment (Production)

| Resource Type | Purpose | Mainnet ID | HashScan Link |
|--------------|---------|------------|---------------|
| **KYRNG Token (HTS)** | Rewards token for signers | `0.0.10046117` | [View →](https://hashscan.io/mainnet/token/0.0.10046117) |
| **Live Platform** | Production deployment | N/A | [keyring.lynxify.xyz](https://keyring.lynxify.xyz/) |

### Testnet Deployment (Development & Testing)

| Resource Type | Purpose | Testnet ID | HashScan Link |
|--------------|---------|------------|---------------|
| **Operator Account** | API transaction submissions | `0.0.5142116` | [View →](https://hashscan.io/testnet/account/0.0.5142116) |
| **Project Registry Topic (HCS-2)** | Stores project registrations | `0.0.5142388` | [View →](https://hashscan.io/testnet/topic/0.0.5142388) |
| **KYRNG Token (HTS)** | Test rewards token | `0.0.5142390` | [View →](https://hashscan.io/testnet/token/0.0.5142390) |

### Demo Resources (For Judge Testing)

| Resource Type | Purpose | Testnet ID | HashScan Link |
|--------------|---------|------------|---------------|
| **Threshold List Account** | 2-of-3 multisig demo | `0.0.7102741` | [View →](https://hashscan.io/testnet/account/0.0.7102741) |
| **Demo Scheduled Transaction** | Test signature collection | `0.0.7102743` | [View →](https://hashscan.io/testnet/schedule/0.0.7102743) |
| **BoostProject Contract** | On-chain boost tracking | `0.0.7097984` | [View →](https://hashscan.io/testnet/contract/0.0.7097984) |

### HCS-11 Signer Profiles (Examples)

Signer profiles are created dynamically using HCS-11 standard when users register. Example:
- **Signer Topic**: `0.0.5142395` (created per signer)
- **Profile Format**: HCS-11 compliant JSON with verification metadata
- **Query**: Via Mirror Node API `/api/v1/topics/{topicId}/messages`

---

## Security & Secrets

### ⚠️ CRITICAL: Never Commit These Files

The following files contain sensitive credentials and **must never** be committed to version control:

- `.env.local` - Contains all secrets
- `.env` - Alternative local environment file
- `*.pem` - Private key files
- `keystore.json` - Wallet keystores

These are already included in `.gitignore`.

### ✅ Safe for Public Exposure (Client-Side Variables)

These variables are safe to expose in frontend code:

- `NEXT_PUBLIC_HEDERA_NETWORK` - Network identifier (testnet/mainnet)
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL (public API endpoint)
- `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` - WalletConnect project ID

### 🔒 Must Remain Secret (Server-Side Only)

These variables **must never** be exposed to the frontend:

- `HEDERA_TESTNET_PRIVATE_KEY` - Operator account private key
- `HEDERA_TESTNET_ACCOUNT_ID` - Operator account ID (when paired with private key)
- `SUPABASE_SECRET` - Supabase service role key (bypasses RLS)
- `PROJECT_REGISTRY_TOPIC_TESTNET` - HCS-2 topic IDs (can be public but best kept private)

### Judge Access Credentials

For hackathon judges to test the full platform functionality, we provide:

**Test Operator Account** (for API testing):
- Account ID: `0.0.5142116`
- Private Key: *[Provided separately in DoraHacks submission text field]*

**Test Signer Account** (for dashboard testing):
- Account ID: `0.0.5142120`
- HashPack-compatible account with whitelisted access
- *[Credentials provided in DoraHacks submission notes]*

**KYC Bypass**: Click the yellow "🎯 Bypass KYC (Hackathon Demo)" button on the `/verify` page to skip identity verification.

---

## Code Quality & Auditability

### Linting & Formatting

We use **ESLint** for code quality enforcement:

```bash
npm run lint
```

Key rules:
- TypeScript strict mode enabled
- React hooks exhaustive dependencies (warnings)
- No explicit `any` types (disabled for hackathon speed)
- Consistent code style across project

### Code Structure

- **`src/app/`** - Next.js App Router pages and API routes
- **`src/components/`** - Reusable React components
- **`src/providers/`** - Wallet and authentication providers
- **`lib/`** - Database utilities and Supabase client
- **`utils/`** - Hedera SDK utilities and helper scripts
- **`contracts/`** - Solidity smart contracts (BoostProject)
- **`supabase/`** - Database schema and migrations

### Key Files for Review

For judges reviewing technical implementation:

1. **Signer Registration Flow**: `src/app/api/register-signer/route.ts`
2. **HCS-2 Project Registry**: `src/app/api/projects/route.ts`
3. **Scheduled Transaction Signing**: `src/app/signer-dashboard/schedule/[id]/page.tsx`
4. **Threshold List Creation**: `utils/createThresholdList.ts`
5. **HCS-11 Profile System**: Integration via `@hashgraphonline/standards-sdk`

### Commit History

We maintain a clean commit history with:
- Descriptive commit messages
- Logical feature grouping
- No sensitive data in commits (verified with git-secrets)

---

## Technology Readiness Level (TRL)

**Current TRL**: 7 - System Prototype Demonstration in Operational Environment

KeyRing Protocol is **live on Hedera Mainnet** ([keyring.lynxify.xyz](https://keyring.lynxify.xyz/)) with real infrastructure, verified signers, and registered projects in the onboarding phase:

✅ **Mainnet Infrastructure Operational**:
- **KYRNG Token (HTS)**: Deployed on mainnet (`0.0.10046117`) ready for distribution
- **Platform Deployment**: Full production environment live at [keyring.lynxify.xyz](https://keyring.lynxify.xyz/)
- **Verified Signers**: Real users successfully registered with HCS-11 profiles
- **Registered Projects**: First production project onboarded and ready for certification
- **Multi-wallet Integration**: HashPack, Blade, MetaMask, Coinbase, Rainbow fully functional
- **HCS-11 Signer Profiles**: Complete identity management system operational
- **HCS-2 Project Registry**: Immutable on-chain project records system active
- **Signer Dashboard**: Real-time UI for schedule review and signature submission

✅ **Tested & Verified on Testnet**:
- **Threshold Lists**: Successfully created and tested 2-of-3 and M-of-N configurations
- **Scheduled Transactions**: Proven signature collection and auto-execution flow
- **Rewards Distribution**: KYRNG token minting and transfer mechanics verified
- **End-to-End Governance**: Complete workflow tested from project registration to reward payout

🚧 **Approaching Production Scale** (Growth Phase):
- **Signer Onboarding**: Actively recruiting verified signers to reach critical mass for threshold lists
- **Threshold Activation**: Waiting for sufficient signer pool (target: 15-20) before activating first certified project lists
- **Partnership Pipeline**: African DeFi/GameFi projects expressing interest pending signer availability
- **AI Risk Analysis**: Integration in progress for automated transaction safety scoring

📋 **Path to TRL 8** (System Complete and Qualified):
- **Immediate** (1-2 weeks): Activate first threshold list with 5-of-7 configuration
- **Near-term** (1 month): 3+ certified projects with active governance
- **Short-term** (2-3 months): 20+ verified signers, 10+ scheduled transactions processed, KYRNG rewards distributed

📋 **Path to TRL 9** (Actual System Proven in Operational Environment):
- **Medium-term** (3-6 months): 50+ active verified signers across Africa
- **Long-term** (6-12 months): 10+ projects with proven governance track records
- KYRNG token liquidity pools and trading pairs
- DAO governance transition for protocol parameters
- Mobile wallet app for iOS/Android
- Fiat on/off ramp integration for African markets

**Current Status**: KeyRing Protocol has successfully deployed all core infrastructure to Hedera Mainnet and completed end-to-end testing on Testnet. The platform is now in a **growth phase**, actively onboarding signers to reach the critical mass needed for threshold list operations. While no threshold lists are yet active in production, the technology is proven and waiting only for sufficient community participation.

**Economic Validation**: KeyRing's mainnet deployment demonstrates the platform's economic viability on Hedera, with transaction costs under $0.10 per governance action compared to $50-500 on alternative chains. This 500-5000x cost reduction makes decentralized governance accessible to African projects with limited treasuries.

---

## Support & Contact

- **Team**: KeyRing Protocol Team
- **Discord**: [Join our community](https://discord.gg/GM5BfpPe2Y)
- **Twitter/X**: [@lynifyxyz](https://x.com/lynifyxyz)
- **Email**: support@keyring-protocol.xyz
- **GitHub**: [KeyRing Protocol](https://github.com/yourusername/keyring-protocol)

---

## License

MIT License - See LICENSE file for details

---

## Acknowledgments

Built for **Hedera Africa Hackathon 2025** with support from:
- Hedera Hashgraph
- Sumsub (KYC integration)
- HashPack Wallet
- Blade Wallet
- Supabase

**Thank you to the Hedera ecosystem and African blockchain community for making this possible!** 🌍🚀
