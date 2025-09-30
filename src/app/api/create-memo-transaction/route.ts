import { NextRequest, NextResponse } from 'next/server';
import { HCS11Client } from '@hashgraphonline/standards-sdk';
import { AccountUpdateTransaction, AccountId } from '@hashgraph/sdk';

export async function POST(request: NextRequest) {
  try {
    const { accountId, profileTopicId } = await request.json();

    if (!accountId || !profileTopicId) {
      return NextResponse.json({ 
        success: false,
        error: 'Account ID and Profile Topic ID are required' 
      }, { status: 400 });
    }

    console.log('[API] Creating memo update transaction for:', { accountId, profileTopicId });

    // Initialize HCS-11 client
    const hcs11Client = new HCS11Client({
      network: process.env.NEXT_PUBLIC_HEDERA_NETWORK === 'mainnet' ? 'mainnet' : 'testnet',
      auth: {
        operatorId: process.env.HEDERA_TESTNET_ACCOUNT_ID!,
        privateKey: process.env.HEDERA_TESTNET_PRIVATE_KEY!,
      },
      logLevel: 'info',
    });

    // Generate the HCS-11 memo format
    const hcs11Memo = hcs11Client.setProfileForAccountMemo(profileTopicId, 1); // 1 = HCS-11 standard

    // Create the account update transaction (unsigned)
    const accountUpdateTx = new AccountUpdateTransaction()
      .setAccountId(AccountId.fromString(accountId))
      .setAccountMemo(hcs11Memo);

    // Serialize the transaction for the wallet to sign
    const transactionBytes = accountUpdateTx.toBytes();
    const transactionBase64 = Buffer.from(transactionBytes).toString('base64');

    console.log('[API] Created memo update transaction:', {
      memo: hcs11Memo,
      transactionSize: transactionBytes.length
    });

    return NextResponse.json({
      success: true,
      transaction: transactionBase64,
      memo: hcs11Memo,
      profileTopicId
    });

  } catch (error: any) {
    console.error('[API] Error creating memo transaction:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'Failed to create memo update transaction' 
    }, { status: 500 });
  }
}
