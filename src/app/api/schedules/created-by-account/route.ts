/**
 * GET /api/schedules/created-by-account?accountId=0.0.xxxxx
 * Returns pending schedules created by this account (operator).
 * Used to show schedules with "Trigger Review" button on project dashboard.
 */

import { NextRequest, NextResponse } from 'next/server';

function getMirrorNodeUrl(): string {
  const network = process.env.NEXT_PUBLIC_HEDERA_NETWORK || 'testnet';
  return network === 'mainnet'
    ? 'https://mainnet.mirrornode.hedera.com'
    : 'https://testnet.mirrornode.hedera.com';
}

export async function GET(request: NextRequest) {
  try {
    const accountId = request.nextUrl.searchParams.get('accountId');
    if (!accountId || !accountId.match(/^\d+\.\d+\.\d+$/)) {
      return NextResponse.json(
        { success: false, error: 'Valid accountId required' },
        { status: 400 }
      );
    }

    const mirrorNodeUrl = getMirrorNodeUrl();

    // Query schedules where this account is the creator
    const schedRes = await fetch(
      `${mirrorNodeUrl}/api/v1/schedules?account.id=${accountId}&order=desc&limit=50`
    );
    if (!schedRes.ok) {
      return NextResponse.json({ success: true, schedules: [] });
    }
    const schedData = await schedRes.json();
    const schedules = schedData.schedules || [];

    const now = Date.now() / 1000;
    const pending = schedules
      .filter((s: { creator_account_id?: string; executed_timestamp?: string; deleted?: boolean; expiration_time?: string }) => {
        if (s.creator_account_id !== accountId) return false;
        if (s.executed_timestamp || s.deleted) return false;
        const exp = s.expiration_time;
        if (exp == null || exp === '') return true;
        const expSec = typeof exp === 'string' ? parseFloat(exp) : Number(exp);
        return !Number.isNaN(expSec) && expSec > now;
      })
      .map((s: { schedule_id: string; memo?: string; payer_account_id?: string; expiration_time?: string }) => ({
        schedule_id: s.schedule_id,
        memo: s.memo || 'Scheduled Transaction',
        payer_account_id: s.payer_account_id,
        expiration_time: s.expiration_time,
      }));

    return NextResponse.json({ success: true, schedules: pending });
  } catch (error) {
    console.error('[API] schedules/created-by-account:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch schedules' },
      { status: 500 }
    );
  }
}
