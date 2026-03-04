import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface ScheduleInput {
  schedule_id: string;
  payer_account_id: string;
}

/**
 * POST /api/rejections/by-signer
 * Returns schedule IDs that the given account has rejected (posted HCS rejection message).
 * Queries threshold list rejection topics (HCS-2 indexed) for messages where
 * signer or reviewer matches accountId.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { accountId, schedules } = body as {
      accountId: string;
      schedules: ScheduleInput[];
    };

    if (!accountId || !Array.isArray(schedules) || schedules.length === 0) {
      return NextResponse.json(
        { success: true, rejectedIds: [] as string[] },
        { headers: { 'Cache-Control': 'no-store' } }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SECRET;
    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { success: true, rejectedIds: [] as string[] },
        { headers: { 'Cache-Control': 'no-store' } }
      );
    }

    const network = process.env.NEXT_PUBLIC_HEDERA_NETWORK || 'testnet';
    const mirrorNodeUrl =
      network === 'mainnet'
        ? 'https://mainnet.mirrornode.hedera.com'
        : 'https://testnet.mirrornode.hedera.com';

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Unique payer accounts (threshold lists)
    const payerIds = [...new Set(schedules.map((s) => s.payer_account_id))];

    // Fetch threshold list -> hcs_topic_id for each payer
    const topicByPayer: Record<string, string> = {};
    for (const payerId of payerIds) {
      const { data } = await supabase
        .from('keyring_threshold_lists')
        .select('hcs_topic_id')
        .eq('threshold_account_id', payerId)
        .single();
      if (data?.hcs_topic_id) {
        topicByPayer[payerId] = data.hcs_topic_id;
      }
    }

    const rejectedIds = new Set<string>();

    // Fetch messages from each topic in parallel
    await Promise.all(
      Object.entries(topicByPayer).map(async ([payerId, topicId]) => {
        const url = `${mirrorNodeUrl}/api/v1/topics/${topicId}/messages?limit=100&order=desc`;
        const res = await fetch(url);
        if (!res.ok) return;

        const data = await res.json();
        const messages = data.messages || [];

        for (const msg of messages) {
          try {
            const decoded = Buffer.from(msg.message, 'base64').toString('utf-8');
            const parsed = JSON.parse(decoded);

            const scheduleId =
              parsed.scheduleId ?? parsed.metadata?.schedule_id ?? parsed.schedule_id ?? parsed.t_id;
            if (!scheduleId) continue;

            const signer = parsed.signer ?? parsed.reviewer ?? parsed.metadata?.signer ?? parsed.metadata?.reviewer;
            if (signer !== accountId) continue;

            // Human format: type === 'rejection'; agent format: reviewer field
            rejectedIds.add(String(scheduleId));
          } catch {
            // Skip malformed messages
          }
        }
      })
    );

    return NextResponse.json(
      { success: true, rejectedIds: [...rejectedIds] },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          Pragma: 'no-cache',
          Expires: '0',
        },
      }
    );
  } catch (error) {
    console.error('[API] Error fetching rejections by signer:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch rejections',
        rejectedIds: [] as string[],
      },
      { status: 500 }
    );
  }
}
