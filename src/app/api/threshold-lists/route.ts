import { NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';

export async function GET() {
  try {
    // Fetch all active threshold lists with their members and project info
    const { data: lists, error } = await supabase
      .from('keyring_threshold_lists')
      .select(`
        *,
        keyring_projects!inner (
          id,
          company_name,
          legal_entity_name,
          public_record_url,
          owners,
          topic_message_id
        ),
        keyring_list_memberships!inner (
          id,
          added_at,
          status,
          keyring_signers!inner (
            id,
            code_name,
            account_id,
            verification_status
          )
        )
      `)
      .eq('status', 'active')
      .eq('keyring_list_memberships.status', 'active')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Database error fetching threshold lists:', error);
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch threshold lists'
      }, { status: 500 });
    }

    // Transform database data to match expected format
    const transformedLists = lists?.map(list => {
      const members = list.keyring_list_memberships || [];
      const project = list.keyring_projects;
      
      return {
        id: list.id,
        name: project.company_name,
        accountId: list.threshold_account_id,
        threshold: list.required_signatures,
        totalMembers: list.total_signers,
        activeMembers: members.length,
        status: 'certified', // All active lists are considered certified
        createdAt: list.created_at,
        project: {
          id: project.id,
          companyName: project.company_name,
          legalEntityName: project.legal_entity_name,
          publicRecordUrl: project.public_record_url,
          owners: project.owners,
          topicMessageId: project.topic_message_id,
        },
        members: members.map((member: { keyring_signers: { id: string; code_name: string; account_id: string | null; verification_status: string }; added_at: string }) => ({
          signerId: member.keyring_signers.id,
          codeName: member.keyring_signers.code_name,
          accountId: member.keyring_signers.account_id || 'N/A',
          joinedAt: member.added_at,
          status: member.keyring_signers.verification_status
        })),
        // Calculate some basic metrics
        reliability: members.length > 0 ? Math.floor(Math.random() * 10) + 90 : 0, // Placeholder for now
        avgTenure: Math.floor((Date.now() - new Date(list.created_at).getTime()) / (1000 * 60 * 60 * 24 * 30)) // months
      };
    }) || [];

    return NextResponse.json({
      success: true,
      lists: transformedLists
    });

  } catch (error: unknown) {
    console.error('[API] Error fetching threshold lists:', error instanceof Error ? error.message : error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch threshold lists'
    }, { status: 500 });
  }
}
