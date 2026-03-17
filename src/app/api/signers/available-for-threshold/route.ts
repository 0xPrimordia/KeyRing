/**
 * GET /api/signers/available-for-threshold
 * Returns the count of Hedera signers with public_key for the current network
 * (mainnet: is_testnet=false, testnet: is_testnet=true).
 * Used by Create Threshold List form to set max signers input.
 */

import { NextResponse } from 'next/server';
import { supabase } from '../../../../../lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const network = process.env.NEXT_PUBLIC_HEDERA_NETWORK || 'testnet';
    const isTestnet = network === 'testnet';

    const { count, error } = await supabase
      .from('keyring_signers')
      .select('*', { count: 'exact', head: true })
      .eq('account_type', 'hedera')
      .eq('is_testnet', isTestnet)
      .not('account_id', 'is', null)
      .in('verification_status', ['verified', 'pending']);

    if (error) {
      console.error('[available-for-threshold]', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      count: count ?? 0,
      network,
    });
  } catch (err) {
    console.error('[available-for-threshold]', err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to fetch signer count',
      },
      { status: 500 }
    );
  }
}
