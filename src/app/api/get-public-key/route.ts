import { NextRequest, NextResponse } from 'next/server';
import { Client, AccountInfoQuery, AccountId, PrivateKey } from '@hashgraph/sdk';

export async function POST(request: NextRequest) {
  try {
    const { accountId } = await request.json();

    if (!accountId) {
      return NextResponse.json({ error: 'Account ID is required' }, { status: 400 });
    }

    console.log('[API] Getting public key for account:', accountId);

    // Create Hedera client with operator credentials (server-side only)
    const network = process.env.NEXT_PUBLIC_HEDERA_NETWORK === 'mainnet' ? 'mainnet' : 'testnet';
    const client = network === 'mainnet' ? Client.forMainnet() : Client.forTestnet();

    // Set operator using server-side environment variables based on network
    const operatorAccountId = network === 'mainnet' 
      ? process.env.HEDERA_MAINNET_ACCOUNT_ID!
      : process.env.HEDERA_TESTNET_ACCOUNT_ID!;
    const operatorPrivateKey = network === 'mainnet'
      ? process.env.HEDERA_MAINNET_PRIVATE_KEY!
      : process.env.HEDERA_TESTNET_PRIVATE_KEY!;
      
    const operatorId = AccountId.fromString(operatorAccountId);
    const operatorKey = PrivateKey.fromStringDer(operatorPrivateKey);
    client.setOperator(operatorId, operatorKey);

    // Query account info to get the public key
    const accountInfo = await new AccountInfoQuery()
      .setAccountId(accountId)
      .execute(client);

    const publicKeyDer = accountInfo.key?.toString() || '';
    
    console.log('[API] Public key obtained:', publicKeyDer.substring(0, 20) + '...');

    return NextResponse.json({ 
      success: true, 
      publicKey: publicKeyDer 
    });

  } catch (error) {
    console.error('[API] Failed to get public key:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to get public key from Hedera network' 
      }, 
      { status: 500 }
    );
  }
}
