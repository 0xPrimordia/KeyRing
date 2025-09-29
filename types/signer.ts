import { z } from 'zod';

export const SignerSchema = z.object({
    public_key: z.string().describe('ED25519 public key in DER format - primary identifier'),
    verification_status: z.enum(['pending', 'verified', 'suspended', 'revoked']).describe('Current verification status'),
    verification_provider: z.enum(['entrust', 'sumsub']).describe('Identity verification provider used'),
    attestation_hash: z.string().describe('SHA256 hash of the verification attestation (for audit trail)'),
    verified_date: z.string().describe('ISO date when verification was completed'),
    join_date: z.string().describe('ISO date when signer joined KeyRing Protocol')
});

export type Signer = z.infer<typeof SignerSchema>;
