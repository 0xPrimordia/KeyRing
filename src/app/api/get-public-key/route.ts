import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { accountId } = await request.json();

    if (!accountId) {
      return NextResponse.json({ error: 'Account ID is required' }, { status: 400 });
    }

    console.log('[API] Getting public key for account:', accountId);

    // Use Mirror Node API instead of Hedera SDK to avoid operator credentials
    const network = process.env.NEXT_PUBLIC_HEDERA_NETWORK === 'mainnet' ? 'mainnet' : 'testnet';
    const mirrorNodeUrl = network === 'mainnet' 
      ? 'https://mainnet-public.mirrornode.hedera.com'
      : 'https://testnet.mirrornode.hedera.com';

    const response = await fetch(`${mirrorNodeUrl}/api/v1/accounts/${accountId}`);
    
    if (!response.ok) {
      throw new Error(`Mirror Node API error: ${response.status} ${response.statusText}`);
    }

    const accountData = await response.json();
    
    if (!accountData.key || !accountData.key.key) {
      throw new Error('No public key found in account data');
    }

    const publicKey = accountData.key.key;
    console.log('[API] Public key obtained from Mirror Node:', publicKey.substring(0, 20) + '...');

    return NextResponse.json({ 
      success: true, 
      publicKey: publicKey 
    });

  } catch (error) {
    console.error('[API] Failed to get public key:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to get public key from Hedera Mirror Node' 
      }, 
      { status: 500 }
    );
  }
}
