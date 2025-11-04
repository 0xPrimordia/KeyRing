import { NextRequest, NextResponse } from 'next/server';
import { KeyRingDB } from '../../../../../../lib/keyring-db';

/**
 * GET /api/signers/[id]/rewards
 * Get all rewards for a signer by account ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: accountId } = await params;

    if (!accountId) {
      return NextResponse.json({ 
        error: 'Account ID is required' 
      }, { status: 400 });
    }

    console.log('[API] Fetching rewards for account:', accountId);

    // Get signer by account ID
    const signer = await KeyRingDB.getSignerByAccountId(accountId);
    
    if (!signer) {
      console.log('[API] Signer not registered, returning empty rewards');
      // Return empty rewards if not registered instead of 404
      return NextResponse.json({
        success: true,
        rewards: [],
        message: 'Account not registered as signer'
      });
    }

    // Get all rewards for this signer
    const { supabase } = await import('../../../../../../lib/supabase');
    const { data: rewards, error } = await supabase
      .from('keyring_rewards')
      .select('*')
      .eq('signer_id', signer.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[API] Error fetching rewards:', error);
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch rewards'
      }, { status: 500 });
    }

    console.log('[API] Found', rewards?.length || 0, 'rewards for signer');

    return NextResponse.json({
      success: true,
      rewards: rewards || []
    });

  } catch (error) {
    console.error('[API] Failed to fetch rewards:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch rewards'
    }, { status: 500 });
  }
}

