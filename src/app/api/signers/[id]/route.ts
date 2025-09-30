import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../../../lib/supabase';
import { getComprehensiveAccountData } from '../../../../../utils/fetchAccountData';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const signerId = resolvedParams.id;

    // Fetch signer from the database
    const { data: signer, error } = await supabase
      .from('keyring_signers')
      .select('*')
      .eq('id', signerId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({
          success: false,
          error: 'Signer not found'
        }, { status: 404 });
      }
      
      console.error('Database error fetching signer:', error);
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch signer'
      }, { status: 500 });
    }

    // Transform database data to match expected format
    // Parse and truncate public key for security (don't expose full key to client)
    const publicKeyDisplay = signer.public_key 
      ? `${signer.public_key.slice(0, 10)}...${signer.public_key.slice(-6)}`
      : 'Not available';

    // Fetch real account data from Mirror Node
    const mirrorNodeData = await getComprehensiveAccountData(signer.account_id);
    const accountInfo = mirrorNodeData.accountInfo;
    const transactionData = mirrorNodeData.transactionData;

    const transformedSigner = {
      id: signer.id,
      codeName: signer.code_name,
      accountId: signer.account_id,
      publicKey: publicKeyDisplay,
      status: signer.verification_status === 'verified' ? 'active' : 'inactive',
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
      // Mock data for fields that will be implemented later
      listsJoined: [],
      recentActivity: [],
      metadata: {
        verificationMethod: signer.verification_provider || 'Unknown',
        networkTenure: accountInfo?.createdTimestamp 
          ? `${Math.floor((Date.now() - new Date(accountInfo.createdTimestamp).getTime()) / (1000 * 60 * 60 * 24))} days`
          : 'Not determined',
        accountCreated: accountInfo?.createdTimestamp || signer.created_at,
        transactionCount: transactionData.totalCount,
        lastTransactionDate: transactionData.transactions.length > 0 
          ? new Date(parseFloat(transactionData.transactions[0].consensusTimestamp) * 1000).toISOString()
          : null,
        transactionTypes: transactionData.transactions.length > 0
          ? [...new Set(transactionData.transactions.map(tx => tx.type))].join(', ')
          : 'None yet',
        recentTransactions: transactionData.transactions
      }
    };

    return NextResponse.json({
      success: true,
      signer: transformedSigner
    });

  } catch (error: unknown) {
    console.error('[API] Error fetching signer:', error instanceof Error ? error.message : error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch signer'
    }, { status: 500 });
  }
}
