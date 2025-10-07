import { NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';

export async function GET() {
  try {
    // Fetch all verified signers from the database
    const { data: signers, error } = await supabase
      .from('keyring_signers')
      .select('*')
      .eq('verification_status', 'verified')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Database error fetching signers:', error);
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch signers'
      }, { status: 500 });
    }

    // Transform database data to match expected format
    const transformedSigners = signers?.map(signer => ({
      id: signer.id,
      codeName: signer.code_name,
      status: signer.verification_status, // Use actual verification status
      verifiedAt: signer.verification_date || signer.created_at,
      reputation: 'Not yet determined',
      totalLists: 0, // Will be calculated when lists are implemented
      totalTransactions: 0, // Will be calculated when transaction reviews are implemented
      totalEarnings: '0 LYNX', // Will be calculated from rewards table
      responseRate: 'Not yet determined',
      avgResponseTime: 'Not yet determined',
      profileTopicId: signer.profile_topic_id,
      verificationProvider: signer.verification_provider,
      createdAt: signer.created_at,
      accountType: signer.account_type, // hedera or ethereum
      walletAddress: signer.wallet_address, // Ethereum address (0x...)
      accountId: signer.account_id, // Hedera account ID (0.0.xxxxx)
      // Mock data for fields that will be implemented later
      listsJoined: [],
      recentActivity: [],
      metadata: {
        transactionCount: 0,
        contractInteractions: 'None yet',
        mostActiveHours: 'Not determined'
      }
    })) || [];

    return NextResponse.json({
      success: true,
      signers: transformedSigners
    });

  } catch (error: unknown) {
    console.error('[API] Error fetching signers:', error instanceof Error ? error.message : error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch signers'
    }, { status: 500 });
  }
}
