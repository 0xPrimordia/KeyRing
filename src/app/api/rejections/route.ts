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

    // Group chunked messages by initial_transaction_id for reassembly
    const chunkedByTx = new Map<string, typeof messages>();
    const standaloneMessages: typeof messages = [];

    for (const message of messages) {
      const chunkInfo = message.chunk_info;
      if (chunkInfo?.total > 1) {
        const init = chunkInfo.initial_transaction_id;
        const txKey = init
          ? `${init.account_id}@${init.transaction_valid_start}.${init.nonce ?? 0}`
          : String(chunkInfo.number);
        if (!chunkedByTx.has(txKey)) {
          chunkedByTx.set(txKey, []);
        }
        chunkedByTx.get(txKey)!.push(message);
      } else {
        standaloneMessages.push(message);
      }
    }

    function parseAndAddRejection(payload: string, consensusTimestamp: string) {
      try {
        const parsed = JSON.parse(payload);
        const scheduleId =
          parsed.scheduleId ||
          parsed.metadata?.schedule_id ||
          parsed.t_id;
        if (!scheduleId) return;

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
          consensusTimestamp,
        };
      } catch {
        // Skip malformed messages
      }
    }

    // Process reassembled chunked messages
    for (const chunks of chunkedByTx.values()) {
      chunks.sort(
        (a: { chunk_info: { number: number } }, b: { chunk_info: { number: number } }) =>
          (a.chunk_info?.number ?? 1) - (b.chunk_info?.number ?? 1)
      );
      const combined = chunks
        .map((m: { message: string }) =>
          Buffer.from(m.message, 'base64').toString('utf-8')
        )
        .join('');
      const lastChunk = chunks[chunks.length - 1];
      parseAndAddRejection(combined, lastChunk.consensus_timestamp);
    }

    // Process non-chunked messages
    for (const message of standaloneMessages) {
      const decoded = Buffer.from(message.message, 'base64').toString('utf-8');
      parseAndAddRejection(decoded, message.consensus_timestamp);
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
