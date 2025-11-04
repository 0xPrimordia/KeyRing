import { NextRequest, NextResponse } from 'next/server';
import { generateDemoThresholdList } from '../../../../utils/generateDemoThresholdList';
import { generateDemoTopic } from '../../../../utils/generateDemoTopic';
import { generateDemoTransactions } from '../../../../utils/generateDemoTransactions';
import { createClient } from '@supabase/supabase-js';
import { setProgress, setComplete, setError, clearProgress } from './progress';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SECRET!;

/**
 * API endpoint to generate a complete demo threshold list with transactions
 * POST /api/generate-demo
 * Body: { connectedAccountId: string }
 * 
 * This endpoint orchestrates a 3-step process:
 * 1. Create threshold list with connected account + existing keys
 * 2. Create HCS-2 topic for the threshold list
 * 3. Generate educational boost transactions for the threshold list
 */
export async function POST(request: NextRequest) {
  let connectedAccountId: string | undefined;

  try {
    const body = await request.json();
    connectedAccountId = body.connectedAccountId;

    if (!connectedAccountId) {
      return NextResponse.json(
        { error: 'Connected account ID is required' },
        { status: 400 }
      );
    }

    // Validate account ID format
    if (!/^0\.0\.\d+$/.test(connectedAccountId)) {
      return NextResponse.json(
        { error: 'Invalid account ID format. Expected format: 0.0.XXXXX' },
        { status: 400 }
      );
    }

    console.log('\n🚀 Starting Demo Generation Flow');
    console.log('═══════════════════════════════════════════\n');

    // Clear any existing progress
    clearProgress(connectedAccountId);

    // Step 1: Create threshold list
    console.log('Step 1/4: Creating threshold list...');
    setProgress(connectedAccountId, 'Creating threshold list...');
    const thresholdListId = await generateDemoThresholdList(connectedAccountId);

    // Step 2: Create HCS-2 topic
    console.log('\nStep 2/4: Creating HCS-2 topic...');
    setProgress(connectedAccountId, 'Creating HCS-2 topic...');
    const topicId = await generateDemoTopic(thresholdListId, connectedAccountId);

    // Step 3: Save to database
    console.log('\nStep 3/4: Saving to database...');
    setProgress(connectedAccountId, 'Saving to database...');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const { data: thresholdListData, error: dbError } = await supabase
      .from('keyring_threshold_lists')
      .insert({
        project_id: null, // Demo threshold list, no project
        hcs_topic_id: topicId,
        threshold_account_id: thresholdListId,
        status: 'active'
      })
      .select()
      .single();

    if (dbError) {
      console.error('❌ Database error:', dbError);
      throw new Error(`Failed to save threshold list to database: ${dbError.message}`);
    }

    console.log('✅ Saved to database:', thresholdListData.id);

    // Step 4: Generate transactions
    console.log('\nStep 4/4: Generating demo transactions...');
    setProgress(connectedAccountId, 'Generating demo transactions...');
    const scheduleIds = await generateDemoTransactions(thresholdListId);

    console.log('\n═══════════════════════════════════════════');
    console.log('✅ Demo Generation Complete!\n');
    
    // Mark as complete
    setComplete(connectedAccountId);

    return NextResponse.json({
      success: true,
      data: {
        thresholdListId,
        topicId,
        scheduleIds,
        databaseId: thresholdListData.id,
        message: `Successfully created demo threshold list with ${scheduleIds.length} transactions`,
      },
    });

  } catch (error: any) {
    console.error('❌ Error generating demo:', error);
    
    // Store error in progress if we have the account ID
    if (connectedAccountId) {
      setError(connectedAccountId, error.message || 'Unknown error occurred');
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to generate demo',
        details: error.message || 'Unknown error occurred'
      },
      { status: 500 }
    );
  }
}

