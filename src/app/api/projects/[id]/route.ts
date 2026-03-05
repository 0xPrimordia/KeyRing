import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../../../lib/supabase';

const getMirrorNodeUrl = () => {
  const network = process.env.NEXT_PUBLIC_HEDERA_NETWORK || 'testnet';
  return network === 'mainnet'
    ? 'https://mainnet.mirrornode.hedera.com'
    : 'https://testnet.mirrornode.hedera.com';
};

async function getThresholdFromMirrorNode(
  accountId: string
): Promise<{ threshold: number; totalKeys: number }> {
  try {
    const res = await fetch(
      `${getMirrorNodeUrl()}/api/v1/accounts/${accountId}`
    );
    if (!res.ok) return { threshold: 0, totalKeys: 0 };
    const data = await res.json();
    if (data.key?._type === 'KeyList') {
      const keys = data.key.keys || [];
      return {
        threshold: data.key.threshold ?? keys.length,
        totalKeys: keys.length,
      };
    }
    return { threshold: 0, totalKeys: 0 };
  } catch {
    return { threshold: 0, totalKeys: 0 };
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Fetch project by ID with related threshold lists
    const { data: project, error } = await supabase
      .from('keyring_projects')
      .select(`
        *,
        keyring_threshold_lists (
          id,
          hcs_topic_id,
          threshold_account_id,
          status,
          created_at
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({
          success: false,
          error: 'Project not found'
        }, { status: 404 });
      }

      console.error('Database error fetching project:', error);
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch project'
      }, { status: 500 });
    }

    // Enrich threshold lists with on-chain key structure from Mirror Node
    const lists = project?.keyring_threshold_lists || [];
    const enrichedLists = await Promise.all(
      lists.map(async (list: { threshold_account_id: string }) => {
        const { threshold, totalKeys } = await getThresholdFromMirrorNode(
          list.threshold_account_id
        );
        return { ...list, threshold, total_keys: totalKeys };
      })
    );

    return NextResponse.json({
      success: true,
      project: {
        ...project,
        keyring_threshold_lists: enrichedLists,
      },
    });

  } catch (error: unknown) {
    console.error('[API] Error fetching project:', error instanceof Error ? error.message : error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch project'
    }, { status: 500 });
  }
}

