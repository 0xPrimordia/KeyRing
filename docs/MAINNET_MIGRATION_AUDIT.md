# Mainnet Migration Audit

This document audits KeyRing's readiness for mainnet deployment when `NEXT_PUBLIC_HEDERA_NETWORK=mainnet` is set.

## Summary

| Area | Status | Notes |
|------|--------|------|
| UI (HashScan/Mirror URLs) | ✅ Fixed | All dashboards use `NEXT_PUBLIC_HEDERA_NETWORK` |
| API routes | ✅ Ready | All use network var for Mirror Node, keys, topics |
| WalletProvider | ✅ Ready | Uses `NEXT_PUBLIC_HEDERA_NETWORK` for LedgerId |
| createMainnetTopics | ✅ Ready | Requires mainnet, uses HEDERA_MAINNET_* |
| createMainnetThresholdList | ✅ New | `npm run hedera:threshold:mainnet` |
| createScheduledTransaction | ✅ Fixed | Respects network var, THRESHOLD_LIST_ACCOUNT_* |
| createConfigurableThresholdList | ✅ Ready | Used by API, respects network |
| createThresholdListAccount | ✅ Ready | Respects network |
| createThresholdListTopic | ✅ Ready | Respects network |
| Other utils (deploy, demo, etc.) | ⚠️ Testnet-only | Boost/demo scripts; not needed for production |

---

## 1. UI Adherence to Network Var

All UI components that display Hedera links now use `NEXT_PUBLIC_HEDERA_NETWORK`:

- **Project Dashboard** (`src/app/project-dashboard/page.tsx`) – `explorerBase` from network
- **Signer Dashboard** (`src/app/signer-dashboard/page.tsx`) – `explorerBase` from network
- **Schedule Detail** (`src/app/signer-dashboard/schedule/[id]/page.tsx`) – `explorerBase` from network
- **Project Page** (`src/app/project/[id]/page.tsx`) – uses network for HashScan

---

## 2. Environment Variables for Mainnet

When migrating to mainnet, set:

```bash
NEXT_PUBLIC_HEDERA_NETWORK=mainnet
NEXT_PUBLIC_LYNX_OPERATOR_ACCOUNT_ID=0.0.YOUR_MAINNET_ACCOUNT

# Mainnet operator (API operations)
HEDERA_MAINNET_ACCOUNT_ID=0.0.YOUR_MAINNET_ACCOUNT
HEDERA_MAINNET_PRIVATE_KEY=302e020100...

# Topics (create via npm run mainnet:topics)
PROJECT_REGISTRY_TOPIC_MAINNET=0.0.xxxxx
OPERATOR_INBOUND_TOPIC_ID=0.0.xxxxx
PROJECT_REJECTION_TOPIC=0.0.xxxxx
PROJECT_VALIDATOR_TOPIC=0.0.xxxxx

# Threshold list (create via npm run hedera:threshold:mainnet)
THRESHOLD_LIST_ACCOUNT_MAINNET=0.0.xxxxx
```

**Note:** `OPERATOR_INBOUND_TOPIC_ID`, `PROJECT_REJECTION_TOPIC`, and `PROJECT_VALIDATOR_TOPIC` are shared (no _TESTNET/_MAINNET suffix). When on mainnet, set them to the mainnet topic IDs created by `mainnet:topics`.

---

## 3. Scripts and Network Var

### Ready for Mainnet (respect `NEXT_PUBLIC_HEDERA_NETWORK`)

| Script | Command | Mainnet Keys |
|--------|---------|--------------|
| createMainnetTopics | `npm run mainnet:topics` | HEDERA_MAINNET_* |
| createMainnetThresholdList | `npm run hedera:threshold:mainnet` | HEDERA_MAINNET_* |
| createScheduledTransaction | `npm run boost:create` | Uses network var |
| createConfigurableThresholdList | (API) | Uses network var |
| createThresholdListAccount | (API) | Uses network var |
| createThresholdListTopic | (API) | Uses network var |
| send-test-project | `npm run hedera:project` | Uses network var |

### Mainnet Topics Setup

```bash
NEXT_PUBLIC_HEDERA_NETWORK=mainnet npm run mainnet:topics
```

Requires:

- `HEDERA_MAINNET_ACCOUNT_ID`, `HEDERA_MAINNET_PRIVATE_KEY`
- `ADMIN_THRESHOLD_ACCOUNT_ID` (or `ADMIN_THRESHOLD_PUBLIC_KEYS`) for OPERATOR_INBOUND
- `PASSIVE_AGENT_1_PUBLIC_KEY`, `PASSIVE_AGENT_2_PUBLIC_KEY` for PROJECT_REJECTION
- `VALIDATION_AGENT_PUBLIC_KEY` for PROJECT_VALIDATOR

### Mainnet Threshold List Setup

```bash
npm run hedera:threshold:mainnet
```

Requires:

- `NEXT_PUBLIC_HEDERA_NETWORK=mainnet`
- `HEDERA_MAINNET_ACCOUNT_ID`, `HEDERA_MAINNET_PRIVATE_KEY`
- Mainnet signers in DB (`is_testnet=false`) with `public_key`
- Optional: `VALIDATION_AGENT_PUBLIC_KEY`

---

## 4. Testnet-Only Scripts (Not for Production)

These remain testnet-only and are used for demos/development:

- `utils/createThresholdList.ts` – hardcoded keys, testnet
- `utils/createTestnetThresholdList.ts` – testnet signers
- `utils/deployBoostProject.ts` – Boost contract deploy
- `utils/createAndExecuteBoostTransaction.ts` – demo
- `utils/generateDemoTransactions.ts` – demo
- `utils/interactBoostProject.ts` – demo
- `utils/testThresholdListTransaction.ts` – test
- `scripts/deploy.ts` – Boost deploy

---

## 5. API Routes Using Network Var

All relevant API routes branch on `NEXT_PUBLIC_HEDERA_NETWORK`:

- `set-admin` – HEDERA_MAINNET_* / HEDERA_TESTNET_*
- `register-signer` – mainnet/testnet keys
- `create-memo-transaction` – mainnet/testnet keys
- `rewards/claim` – mainnet/testnet keys
- `operator/projects` – PROJECT_REGISTRY_TOPIC_MAINNET/TESTNET, THRESHOLD_LIST_ACCOUNT_*
- `contracts/[id]/admin` – Mirror Node, HashScan
- `schedules/*` – Mirror Node URL
- `rejections`, `validator-reviews` – Mirror Node URL
- `get-public-key` – Mirror Node URL
- `sumsub/store-verification` – mainnet/testnet

---

## 6. Pre-Mainnet Checklist

1. [ ] Set `NEXT_PUBLIC_HEDERA_NETWORK=mainnet` in production env
2. [ ] Set `HEDERA_MAINNET_ACCOUNT_ID` and `HEDERA_MAINNET_PRIVATE_KEY`
3. [ ] Run `npm run mainnet:topics` and add topic IDs to env
4. [ ] Create mainnet threshold list: `npm run hedera:threshold:mainnet`
5. [ ] Add `THRESHOLD_LIST_ACCOUNT_MAINNET` to env
6. [ ] Ensure mainnet signers exist in DB (`is_testnet=false`)
7. [ ] Set `OPERATOR_INBOUND_TOPIC_ID` to mainnet topic (from mainnet:topics)
8. [ ] Set `PROJECT_REJECTION_TOPIC`, `PROJECT_VALIDATOR_TOPIC` to mainnet topics
9. [ ] Verify `NEXT_PUBLIC_LYNX_OPERATOR_ACCOUNT_ID` matches mainnet operator
