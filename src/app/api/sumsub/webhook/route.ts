import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { KeyRingDB } from '../../../../../lib/keyring-db';

// Sumsub webhook types
interface SumsubWebhookData {
  type: string;
  applicantId: string;
  externalUserId: string;
  reviewResult?: {
    reviewAnswer: 'GREEN' | 'RED' | 'YELLOW';
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

interface SumsubApplicantData {
  fixedInfo?: {
    firstName?: string;
    lastName?: string;
    [key: string]: unknown;
  };
  info?: {
    firstName?: string;
    lastName?: string;
    [key: string]: unknown;
  };
  requiredIdDocs?: {
    docSets?: Array<{
      idDocSetType?: string;
      [key: string]: unknown;
    }>;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

interface SumsubReviewResult {
  reviewAnswer?: 'GREEN' | 'RED' | 'YELLOW';
  [key: string]: unknown;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('x-payload-digest');

    // Verify webhook signature
    const sumsubSecretKey = process.env.SUMSUB_SECRET;
    if (!sumsubSecretKey) {
      console.error('Missing Sumsub secret key');
      return NextResponse.json({ error: 'Configuration error' }, { status: 500 });
    }

    if (!verifyWebhookSignature(body, signature, sumsubSecretKey)) {
      console.error('Invalid webhook signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const webhookData = JSON.parse(body);
    console.log('Received Sumsub webhook:', {
      type: webhookData.type,
      applicantId: webhookData.applicantId,
      externalUserId: webhookData.externalUserId,
    });

    // Handle different webhook types
    switch (webhookData.type) {
      case 'applicantReviewed':
        await handleApplicantReviewed(webhookData);
        break;
      case 'applicantPending':
        await handleApplicantPending(webhookData);
        break;
      case 'applicantCreated':
        console.log('Applicant created:', webhookData.applicantId);
        break;
      default:
        console.log('Unhandled webhook type:', webhookData.type);
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error processing Sumsub webhook:', error);
    return NextResponse.json({ 
      error: 'Webhook processing failed' 
    }, { status: 500 });
  }
}

async function handleApplicantReviewed(webhookData: SumsubWebhookData) {
  const { applicantId, externalUserId, reviewResult } = webhookData;
  const accountId = externalUserId; // We use Hedera account ID as external user ID

  console.log('Processing applicant review:', {
    applicantId,
    accountId,
    reviewAnswer: reviewResult?.reviewAnswer,
  });

  try {
    // Get applicant data from Sumsub to extract verified information
    const applicantData = await fetchApplicantData(applicantId);
    
    if (!applicantData) {
      console.error('Failed to fetch applicant data');
      return;
    }

    // Extract verified name and document type
    const verifiedName = extractVerifiedName(applicantData);
    const documentType = extractDocumentType(applicantData);

    // Generate privacy-preserving identifiers
    const uniqueId = generateUniqueId(applicantId);
    const attestationHash = generateAttestationHash(applicantData, reviewResult || {});

    // Determine verification status
    let verificationStatus: 'verified' | 'suspended' | 'revoked' = 'suspended';
    if (reviewResult?.reviewAnswer === 'GREEN') {
      verificationStatus = 'verified';
    } else if (reviewResult?.reviewAnswer === 'RED') {
      verificationStatus = 'revoked';
    }

    // Update signer in database
    const existingSigner = await KeyRingDB.getSignerByAccountId(accountId);
    
    if (existingSigner) {
      // Update existing signer
      const updateResult = await KeyRingDB.updateSignerVerification(existingSigner.id, {
        verificationStatus,
        verificationProvider: 'sumsub',
        verificationDate: new Date().toISOString(),
        uniqueId,
        attestationHash,
        sumsubApplicantId: applicantId,
        verifiedName: verifiedName || undefined,
        documentType: documentType || undefined,
      });

      if (updateResult.success) {
        console.log('Updated signer verification:', {
          signerId: existingSigner.id,
          status: verificationStatus,
          verifiedName,
        });
        if (verificationStatus === 'verified') {
          await KeyRingDB.addVerificationRewardIfNew(existingSigner.id, 10);
        }
      } else {
        console.error('Failed to update signer verification:', updateResult.error);
      }
    } else {
      console.log('No existing signer found for account:', accountId);
      // Could create a new signer record here if needed
    }

    // TODO: Anchor attestation hash on Hedera Consensus Service (HCS)
    // This would be done in a separate function that creates HCS messages

  } catch (error) {
    console.error('Error handling applicant review:', error);
  }
}

async function handleApplicantPending(webhookData: SumsubWebhookData) {
  const { applicantId, externalUserId } = webhookData;
  const accountId = externalUserId;

  console.log('Applicant pending review:', { applicantId, accountId });

  // Update signer status to pending if exists
  try {
    const existingSigner = await KeyRingDB.getSignerByAccountId(accountId);
    if (existingSigner) {
      await KeyRingDB.updateSignerVerification(existingSigner.id, {
        verificationStatus: 'pending',
        sumsubApplicantId: applicantId,
      });
    }
  } catch (error) {
    console.error('Error updating pending status:', error);
  }
}

async function fetchApplicantData(applicantId: string) {
  try {
    const sumsubAppToken = process.env.SUMSUB_TOKEN;
    const sumsubSecretKey = process.env.SUMSUB_SECRET;
    const sumsubBaseUrl = process.env.SUMSUB_BASE_URL || 'https://api.sumsub.com';

    if (!sumsubAppToken || !sumsubSecretKey) {
      throw new Error('Missing Sumsub credentials');
    }

    const path = `/resources/applicants/${applicantId}/one`;
    const method = 'GET';
    const timestamp = Math.floor(Date.now() / 1000);

    const signature = createSignature(method, path, '', timestamp, sumsubSecretKey);

    const response = await fetch(`${sumsubBaseUrl}${path}`, {
      method,
      headers: {
        'X-App-Token': sumsubAppToken,
        'X-App-Access-Sig': signature,
        'X-App-Access-Ts': timestamp.toString(),
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch applicant data: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching applicant data:', error);
    return null;
  }
}

function extractVerifiedName(applicantData: SumsubApplicantData): string | null {
  try {
    // Extract name from fixed info (verified data)
    const fixedInfo = applicantData.fixedInfo;
    if (fixedInfo?.firstName && fixedInfo?.lastName) {
      return `${fixedInfo.firstName} ${fixedInfo.lastName}`.trim();
    }

    // Fallback to provided info
    const info = applicantData.info;
    if (info?.firstName && info?.lastName) {
      return `${info.firstName} ${info.lastName}`.trim();
    }

    return null;
  } catch (error) {
    console.error('Error extracting verified name:', error);
    return null;
  }
}

function extractDocumentType(applicantData: SumsubApplicantData): string | null {
  try {
    // Look for document type in required documents
    const requiredIdDocs = applicantData.requiredIdDocs?.docSets;
    if (requiredIdDocs && requiredIdDocs.length > 0) {
      const docSet = requiredIdDocs[0];
      if (docSet.idDocSetType) {
        return docSet.idDocSetType;
      }
    }

    return 'ID_DOCUMENT'; // Default fallback
  } catch (error) {
    console.error('Error extracting document type:', error);
    return null;
  }
}

function generateUniqueId(applicantId: string): string {
  // Generate privacy-preserving unique ID
  const tenantId = process.env.KEYRING_TENANT_ID || 'keyring-protocol';
  const serverPepper = process.env.KEYRING_SERVER_PEPPER || 'default-pepper';
  
  const data = `${tenantId}||${applicantId}||${serverPepper}`;
  return crypto.createHash('blake2b512').update(data).digest('hex').substring(0, 32);
}

function generateAttestationHash(applicantData: SumsubApplicantData, reviewResult: SumsubReviewResult): string {
  // Create privacy-preserving attestation hash
  const attestationData = {
    verificationStatus: reviewResult?.reviewAnswer || 'UNKNOWN',
    timestamp: new Date().toISOString(),
    documentType: extractDocumentType(applicantData),
    // Don't include PII in the hash
  };

  const canonicalData = JSON.stringify(attestationData, Object.keys(attestationData).sort());
  return crypto.createHash('sha256').update(canonicalData).digest('hex');
}

function verifyWebhookSignature(body: string, signature: string | null, secretKey: string): boolean {
  if (!signature) {
    return false;
  }

  try {
    // Sumsub webhook signature format: sha256=<hash>
    const expectedSignature = `sha256=${crypto
      .createHmac('sha256', secretKey)
      .update(body)
      .digest('hex')}`;

    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch (error) {
    console.error('Error verifying webhook signature:', error);
    return false;
  }
}

function createSignature(
  method: string,
  path: string,
  body: string,
  timestamp: number,
  secretKey: string
): string {
  const data = timestamp + method.toUpperCase() + path + body;
  return crypto
    .createHmac('sha256', secretKey)
    .update(data)
    .digest('hex');
}
