## KeyRing Protocol — Verified Threshold Signers for Hedera Admin and Governance

### One-liner
KeyRing Protocol provides certified threshold signer lists for Hedera so projects can confidently delegate admin control to real, independent verifiers.

### Problem
- Opaque multisigs: Hedera threshold keys exist, but independence of signers is unverifiable.
- User trust gap: "3-of-5 admin" claims lack identity/reliability proof.
- Operational risk: Centralized admin undermines decentralization and trust.

### Solution (KeyRing Protocol)
- Verifier registry: Public, searchable registry of verified signers and certified threshold lists.
- Identity & Sybil resistance: Entrust (FIDO/KYC) for identity; only hashes/status anchored on Hedera.
- Clean integration: Projects keep using Hedera-native threshold keys; KeyRing Protocol certifies signers, not transactions.

### How It Works
1) Verifier onboarding (Entrust)
   - OIDC sign-in and KYC with Entrust → signed JWT result.
   - KeyRing bridge verifies JWT via Entrust JWKS, derives privacy-preserving `uniqueId`.
   - Anchor `attestationHash` on Hedera Consensus Service (HCS); register in on-chain `VerifierRegistry`.
2) Threshold list creation
   - Project picks threshold (e.g., 3-of-5) and selects verifiers from registry.
   - KeyRing issues a certified list ID with member public keys and metadata.
   - Project applies those keys as admin KeyList on Hedera (HTS/HAS as applicable).
3) Transparency & verification
   - `isCertified(listId)` and public metadata available for explorers/wallets to show "KeyRing Certified".
4) Incentives & fees
   - Projects pay in Lynx: upfront certification + optional per-admin-event fee; majority flows to verifiers.

### Identity & Sybil Resistance (v0)
- Vendor: Entrust (primary). Backup: Sumsub supported.
- Privacy: No PII on-chain. Only:
  - `attestationHash = sha256(canonicalized Entrust JWT payload without PII)`
  - `uniqueId = blake2b(tenantId || entrustSub || serverPepper)`
- On-chain footprint:
  - HCS topics: VerifierAttestations, VerifierRevocations
  - Contract: VerifierRegistry `{uniqueId, accountId, attestationHash, status, createdAt, reputation}`
- Lifecycle: Approve → anchor → register; rebind with 7-day cooldown; revoke on webhook signal.
- Later: optional non-transferable Verifier NFT for UX (not needed v0).

#### Sumsub integration (backup)
- Flow mirrors Entrust: create applicant → upload docs → request check → receive `applicantReviewed` webhook with `reviewAnswer` (GREEN/RED) → verify → derive `uniqueId` → anchor `attestationHash` on HCS → register/revoke in `VerifierRegistry`.
- Reference: Sumsub API (applicants, checks, webhooks) — see "Get started with API".


### Product
- Registry & Search: Look up any key or list ID; confirm certification and abstract metadata.
- Project Console: Create/renew lists, manage billing, export member keys for thresholds.
- Read-only API/Badge/SDK: Easy checks for explorers/wallets/dapps; JS/TS helper for badges and list verification.

### Public Verifier Metadata (privacy-minimal)
- Code name, verification status, lists joined, start date/tenure, activity-based reputation.
- Aggregate list insights: threshold size, unique members, avg tenure, reliability.

### Economics & Pricing (Lynx)
- Fees: one-time list certification + per-admin-event micro-fee.
- Tiered by list size (health tiers):
  - Starter (e.g., 3–10 verifiers): baseline health; core registry + notifications.
  - Standard (e.g., 10–20 verifiers): stronger health; adds agentic checks and richer dashboards.
  - DAO (e.g., 20–30+ verifiers): highest health; unlocks DAO SaaS features and priority support.
- Health signal: Publicly display list size, avg tenure, and reliability to indicate governance robustness.
- Revenue split: 85% to verifiers / 15% to protocol.
- Payments: Lynx primary; HBAR accepted as fallback.

### DAO SaaS (optional add-ons for larger lists)
- Proposal portal for admin actions with agentic pre-flight analysis and diffs.
- Vote-to-sign bridge: off-chain snapshot-style signaling mapped to threshold signing windows.
- Policy templates: emergency pause, mint/burn limits, upgrade guardrails, quorum/timeout presets.
- Treasury tooling: spend limits, multi-step approvals, real-time alerts and audit feed exports.
- Analytics: verifier reliability, MTTA/MTTR for approvals, anomaly detection reports.
- Support: prioritized incident response and integration assistance.

### Why Projects Adopt KeyRing Protocol
- Instant trust signal: Independent, verified admin signers.
- No protocol lock-in: Continue Hedera-native operations.
- Better UX: Visible "KeyRing Certified" without exposing identities.
- Compliance-friendly: Vendor-backed identity; no PII on-chain.
 - DAO offload path: Larger lists + DAO SaaS features let projects externalize governance overhead to KeyRing Protocol.

### Dapp Integration
- No changes to transaction flow; you still call HTS/HAS directly.
- Apply threshold keys from certified list members.
- Simple checks via read-only API/contract.

### Governance & Enforcement (v0)
- Automated suspension on Entrust revocation and activity-based rules.
- Manual override by core team initially; appeals supported.
- No staking/slashing; penalties are suspension and reputation reduction.

### Architecture (v0)
- Off-chain: KeyRing bridge (Entrust OIDC/webhooks or Sumsub webhooks), webhook handler, indexer/API.
- On-chain: HCS for attestation logs; VerifierRegistry contract for status/queries.
- Keys: ED25519 public keys; thresholds via Hedera KeyList.

### Protocol Guarantees
- Public, versioned spec: HCS message schemas, `VerifierRegistry` ABI, and a clear state machine (register → active → rebind → revoke).
- Permissionless integration: any project, wallet, or explorer can read/verify; any vendor can plug in via an attestation adapter.
- On-chain determinism: status, 7-day rebind cooldowns, and revocations are enforced by contract; attestations anchored on HCS.
- Vendor-agnostic: Entrust primary, Sumsub backup; adapters normalize webhooks/JWTs to the same on-chain attestation model.
- Open SDKs: JS/TS helpers for list checks and badges make integration trivial.
### Example Scenarios
#### Scenario A — Change token supply key to a new contract
- Trigger: Project submits a Hedera Scheduled Transaction proposing to change the token’s supply key to a new contract.
- Notifications: Verifiers receive a scheduled transaction in-wallet plus email/KeyRing notification.
- Dashboard context:
  - Current admin/supply key and proposed new contract address.
  - Parsed contract ABI and a human-readable diff vs. current implementation.
  - Risk checks (automated): ownership, pausability/mint/burn permissions, upgrade hooks.
- Agent feedback: KeyRing agent posts an assessment (approve/flag) with rationale and red flags if any.
- Verifier action:
  - Approve or Reject within KeyRing; rejection can include agent feedback and/or verifier note to project owners.
  - Sign the scheduled transaction in-wallet to count toward threshold.
- Outcome:
  - If threshold met: change is executed on-chain; registry records event timestamp and list participation.
  - If rejected by any verifier: their anonymized account publishes the reason on the public audit feed.

#### Scenario B — Upgrade a proxy contract implementation
- Trigger: Project submits a Scheduled Transaction to point a proxy to a new implementation.
- Notifications: Same flow as Scenario A (wallet + email/KeyRing).
- Dashboard context:
  - Proxy address, current implementation, proposed implementation.
  - ABI diff, storage layout compatibility checks, initializer/constructor risks.
  - Agent feedback highlighting upgrade safety and permission surface changes.
- Verifier action: Approve/Reject with optional note; sign scheduled transaction in-wallet.
- Outcome: Threshold reached → upgrade executes; all decisions and agentic feedback are published to the public audit feed under anonymized verifier identities.

### Roadmap
- v0: Entrust verification, HCS anchoring, VerifierRegistry, search/API, Lynx billing.
- v1: Verifier badge (HTS), explorer/wallet badges, activity-based reputation.
- v2: Agent-based governance (auto-suspension, anomaly detection, cooldown policies).
- v3: Cross-chain verifier registry adapters (ETH/Solana).

### Go-To-Market
- Focus: Hedera-native projects (tokens, NFTs, upgradeable contracts).
- Motion: Direct outreach; explorer/wallet partnerships for certifications surfacing.
- Lighthouse: 3–5 early projects; publish public lists; push wallet/explorer badges.
 - Founder Verifier Cohort to seed initial certified lists.

### Metrics (post-MVP)
- Certified lists, verified signers, approval reliability, Lynx volume, integrations.

### CTA
- Design partners to certify admin lists.
- Feedback on pricing tiers and revenue split.
- Integrations: explorers/wallets for "KeyRing Certified" badges.
