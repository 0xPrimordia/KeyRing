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
    const network = process.env.NEXT_PUBLIC_HEDERA_NETWORK === 'mainnet' ? 'mainnet' : 'testnet';
    const operatorAccountId = network === 'mainnet' 
      ? process.env.HEDERA_MAINNET_ACCOUNT_ID!
      : process.env.HEDERA_TESTNET_ACCOUNT_ID!;
    const operatorPrivateKey = network === 'mainnet'
      ? process.env.HEDERA_MAINNET_PRIVATE_KEY!
      : process.env.HEDERA_TESTNET_PRIVATE_KEY!;

    const hcs11Client = new HCS11Client({
      network,
      auth: {
        operatorId: operatorAccountId,
        privateKey: operatorPrivateKey,
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

  } catch (error: unknown) {
    console.error('[API] Error creating memo transaction:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to create memo update transaction' 
    }, { status: 500 });
  }
}
