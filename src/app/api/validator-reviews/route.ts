import { NextRequest, NextResponse } from 'next/server';
import { reassembleHcsMessages } from '../../../../lib/hcs-messages';

export const dynamic = 'force-dynamic';

/**
 * GET /api/validator-reviews?scheduleId=0.0.xxxxx
 * Fetches validator agent reviews from PROJECT_VALIDATOR_TOPIC via Mirror Node.
 * Handles chunked HCS messages by reassembling them before parsing.
 */
export async function GET(request: NextRequest) {
  try {
    const scheduleId = request.nextUrl.searchParams.get('scheduleId');
    const validatorTopicId = process.env.PROJECT_VALIDATOR_TOPIC;

    if (!validatorTopicId || validatorTopicId.trim() === '') {
      return NextResponse.json({ success: true, review: null });
    }

    const network = process.env.NEXT_PUBLIC_HEDERA_NETWORK || 'testnet';
    const mirrorNodeUrl = network === 'mainnet'
      ? 'https://mainnet.mirrornode.hedera.com'
      : 'https://testnet.mirrornode.hedera.com';

    const res = await fetch(
      `${mirrorNodeUrl}/api/v1/topics/${validatorTopicId}/messages?limit=100&order=desc`
    );

    if (!res.ok) {
      throw new Error(`Mirror Node request failed: ${res.status}`);
    }

    const data = await res.json();
    const reassembled = reassembleHcsMessages(data.messages || []);

    for (const msg of reassembled) {
      const payload = msg.payload;
      try {
        if (scheduleId && !payload.includes(scheduleId)) continue;

        const parsed = JSON.parse(payload);

        if (!parsed.reviewDescription) continue;

        const matchedScheduleId = parsed.scheduleId || scheduleId;
        if (scheduleId && matchedScheduleId !== scheduleId) continue;

        let riskLevel = parsed.riskLevel;
        if (!riskLevel) {
          const match = parsed.reviewDescription.match(/RiskLevel:\s*(low|medium|high|critical)/i);
          if (match) riskLevel = match[1].toLowerCase();
        }

        return NextResponse.json({
          success: true,
          review: {
            scheduleId: matchedScheduleId,
            reviewer: parsed.reviewer || 'Validator Agent',
            functionName: parsed.functionName,
            recommendation: parsed.reviewDescription,
            riskLevel,
            timestamp: parsed.timestamp,
          },
        });
      } catch {
        // skip unparseable
      }
    }

    return NextResponse.json({ success: true, review: null });
  } catch (error) {
    console.error('[API] Error fetching validator reviews:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to fetch' },
      { status: 500 }
    );
  }
}
