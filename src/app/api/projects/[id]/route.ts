import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../../../lib/supabase';

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
          list_topic_id,
          threshold_account_id,
          required_signatures,
          total_signers,
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

    return NextResponse.json({
      success: true,
      project
    });

  } catch (error: unknown) {
    console.error('[API] Error fetching project:', error instanceof Error ? error.message : error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch project'
    }, { status: 500 });
  }
}

