import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export interface RejectionInfo {
  scheduleId: string;
  reviewer: string;
  functionName?: string;
  reason: string;
  riskLevel?: string;
  timestamp?: string;
  consensusTimestamp?: string;
}

/**
 * GET /api/rejections
 * Fetches agent rejections from PROJECT_REJECTION_TOPIC (HCS).
 * Returns a map of scheduleId -> rejection for merging with transaction lists.
 */
export async function GET() {
  try {
    const rejectionTopicId = process.env.PROJECT_REJECTION_TOPIC;
    if (!rejectionTopicId || rejectionTopicId.trim() === '') {
      return NextResponse.json({
        success: true,
        data: {} as Record<string, RejectionInfo>,
      });
    }

    const network = process.env.NEXT_PUBLIC_HEDERA_NETWORK || 'testnet';
    const mirrorNodeUrl =
      network === 'mainnet'
        ? 'https://mainnet.mirrornode.hedera.com'
        : 'https://testnet.mirrornode.hedera.com';

    const url = `${mirrorNodeUrl}/api/v1/topics/${rejectionTopicId}/messages?limit=100&order=desc`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Mirror node request failed: ${response.status}`);
    }

    const data = await response.json();
    const messages = data.messages || [];

    const rejections: Record<string, RejectionInfo> = {};

    for (const message of messages) {
      try {
        const decoded = Buffer.from(message.message, 'base64').toString('utf-8');
        const parsed = JSON.parse(decoded);

        const scheduleId =
          parsed.scheduleId ||
          parsed.metadata?.schedule_id ||
          parsed.t_id;
        if (!scheduleId) continue;

        const metadata = parsed.metadata || parsed;
        rejections[scheduleId] = {
          scheduleId,
          reviewer: metadata.reviewer || metadata.signer || parsed.reviewer || 'Unknown',
          functionName: metadata.functionName || metadata.function_name,
          reason:
            metadata.reason ||
            metadata.feedback ||
            metadata.reviewDescription ||
            metadata.review_description ||
            parsed.reason ||
            'Rejected',
          riskLevel: metadata.riskLevel || metadata.risk_level,
          timestamp: metadata.timestamp || parsed.timestamp,
          consensusTimestamp: message.consensus_timestamp,
        };
      } catch {
        // Skip malformed messages
      }
    }

    return NextResponse.json(
      { success: true, data: rejections },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          Pragma: 'no-cache',
          Expires: '0',
        },
      }
    );
  } catch (error) {
    console.error('[API] Error fetching rejections:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch rejections',
      },
      { status: 500 }
    );
  }
}
