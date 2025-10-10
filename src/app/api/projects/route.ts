import { NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';

export async function GET() {
  try {
    // Fetch all projects with count of their threshold lists
    const { data: projects, error } = await supabase
      .from('keyring_projects')
      .select(`
        *,
        keyring_threshold_lists (count)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Database error fetching projects:', error);
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch projects'
      }, { status: 500 });
    }

    // Transform the data to include the count
    const transformedProjects = projects?.map(project => ({
      ...project,
      threshold_lists_count: project.keyring_threshold_lists?.[0]?.count || 0
    })) || [];

    return NextResponse.json({
      success: true,
      projects: transformedProjects
    });

  } catch (error: unknown) {
    console.error('[API] Error fetching projects:', error instanceof Error ? error.message : error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch projects'
    }, { status: 500 });
  }
}

