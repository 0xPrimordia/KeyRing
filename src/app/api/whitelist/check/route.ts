import { NextRequest, NextResponse } from 'next/server';
import { KeyRingDB } from '../../../../../lib/keyring-db';

export async function POST(request: NextRequest) {
  try {
    const { accountId } = await request.json();

    if (!accountId) {
      return NextResponse.json({
        success: false,
        error: 'Account ID is required'
      }, { status: 400 });
    }

    const isWhitelisted = await KeyRingDB.isAccountWhitelisted(accountId);

    return NextResponse.json({
      success: true,
      isWhitelisted
    });

  } catch (error: any) {
    console.error('[API] Error checking whitelist:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to check whitelist status'
    }, { status: 500 });
  }
}

export async function GET() {
  try {
    // Get all whitelisted accounts (for admin purposes)
    const whitelistedAccounts = await KeyRingDB.getWhitelistedAccounts();
    
    return NextResponse.json({
      success: true,
      accounts: whitelistedAccounts
    });
  } catch (error: any) {
    console.error('[API] Error getting whitelist:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to get whitelist'
    }, { status: 500 });
  }
}
