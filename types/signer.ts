import { z } from 'zod';

export const SignerSchema = z.object({
    account_type: z.enum(['hedera', 'ethereum']).describe('Type of blockchain account'),
    account_id: z.string().optional().describe('Hedera account ID (0.0.xxxxx) - required for hedera accounts'),
    wallet_address: z.string().optional().describe('Ethereum wallet address (0x...) - required for ethereum accounts'),
    public_key: z.string().optional().describe('ED25519 public key in DER format - required for hedera accounts'),
    sumsub_applicant_id: z.string().optional().describe('Sumsub applicant ID for KYC verification'),
    verification_status: z.enum(['pending', 'verified', 'suspended', 'revoked']).describe('Current verification status'),
    verification_provider: z.enum(['entrust', 'sumsub']).describe('Identity verification provider used'),
    attestation_hash: z.string().optional().describe('SHA256 hash of the verification attestation (for audit trail)'),
    verified_date: z.string().optional().describe('ISO date when verification was completed'),
    join_date: z.string().describe('ISO date when signer joined KeyRing Protocol')
});

export type Signer = z.infer<typeof SignerSchema>;

// Helper schemas for validation
export const HederaSignerSchema = SignerSchema.extend({
    account_type: z.literal('hedera'),
    account_id: z.string().min(1),
    public_key: z.string().min(1)
});

export const EthereumSignerSchema = SignerSchema.extend({
    account_type: z.literal('ethereum'),
    wallet_address: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address format'),
    sumsub_applicant_id: z.string().optional(),
    sumsub_review_result: z.enum(['GREEN', 'RED', 'YELLOW']).optional()
});

export type HederaSigner = z.infer<typeof HederaSignerSchema>;
export type EthereumSigner = z.infer<typeof EthereumSignerSchema>;
