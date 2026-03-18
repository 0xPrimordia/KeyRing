/**
 * GET /api/signers/threshold-lists-for-account?accountId=0.0.xxxxx
 * Returns Hedera threshold list account IDs the given signer belongs to,
 * by joining keyring_signers -> keyring_list_memberships -> keyring_threshold_lists.
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../../../lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const accountId = request.nextUrl.searchParams.get('accountId');

    if (!accountId || !/^0\.0\.\d+$/.test(accountId)) {
      return NextResponse.json(
        { success: false, error: 'Valid Hedera accountId required (0.0.xxxxx)' },
        { status: 400 }
      );
    }

    const { data: signer, error: signerErr } = await supabase
      .from('keyring_signers')
      .select('id')
      .eq('account_id', accountId)
      .eq('account_type', 'hedera')
      .single();

    if (signerErr || !signer) {
      return NextResponse.json({ success: true, thresholdAccountIds: [] });
    }

    const { data: memberships, error: memErr } = await supabase
      .from('keyring_list_memberships')
      .select('list_id')
      .eq('signer_id', signer.id)
      .eq('status', 'active');

    if (memErr || !memberships || memberships.length === 0) {
      return NextResponse.json({ success: true, thresholdAccountIds: [] });
    }

    const listIds = memberships.map((m) => m.list_id);

    const { data: lists, error: listErr } = await supabase
      .from('keyring_threshold_lists')
      .select('threshold_account_id')
      .in('id', listIds)
      .eq('status', 'active');

    if (listErr) {
      console.error('[threshold-lists-for-account]', listErr);
      return NextResponse.json(
        { success: false, error: listErr.message },
        { status: 500 }
      );
    }

    const thresholdAccountIds = (lists || []).map((l) => l.threshold_account_id);

    return NextResponse.json({ success: true, thresholdAccountIds });
  } catch (err) {
    console.error('[threshold-lists-for-account]', err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 }
    );
  }
}
