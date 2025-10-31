import { NextRequest, NextResponse } from 'next/server';
import { getProgress } from '../progress';

export const dynamic = 'force-dynamic';

/**
 * GET /api/generate-demo/status?accountId=0.0.xxxxx
 * Returns the current progress of demo generation
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const accountId = searchParams.get('accountId');

  if (!accountId) {
    return NextResponse.json(
      { error: 'Account ID is required' },
      { status: 400 }
    );
  }

  const progress = getProgress(accountId);
  
  return NextResponse.json({
    step: progress.step,
    completed: progress.completed,
    error: progress.error
  });
}

