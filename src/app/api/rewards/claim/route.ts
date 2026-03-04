import { NextRequest, NextResponse } from 'next/server';
import { Client, AccountId, TransferTransaction, TokenId } from '@hashgraph/sdk';
import { KeyRingDB } from '../../../../../lib/keyring-db';

export async function POST(request: NextRequest) {
  try {
    const { accountId } = await request.json();

    if (!accountId) {
      return NextResponse.json({ 
        error: 'Account ID is required' 
      }, { status: 400 });
    }

    console.log('[API] Processing reward claim for:', accountId);

    // Get signer's pending rewards
    const signer = await KeyRingDB.getSignerByAccountId(accountId);
    if (!signer) {
      return NextResponse.json({
        error: 'Signer not found'
      }, { status: 404 });
    }

    const rewardsResult = await KeyRingDB.getSignerRewards(signer.id);
    if (!rewardsResult.success || !rewardsResult.rewards) {
      return NextResponse.json({
        error: 'Failed to fetch rewards'
      }, { status: 500 });
    }

    const pendingRewards = rewardsResult.rewards.filter((r: any) => r.status === 'pending');
    
    if (pendingRewards.length === 0) {
      return NextResponse.json({
        error: 'No pending rewards to claim'
      }, { status: 400 });
    }

    const totalAmount = pendingRewards.reduce((sum: number, r: any) => sum + parseFloat(r.amount), 0);

    console.log('[API] Total pending rewards:', totalAmount, 'LYNX');

    // Determine network and credentials
    const network = process.env.NEXT_PUBLIC_HEDERA_NETWORK === 'mainnet' ? 'mainnet' : 'testnet';
    const operatorAccountId = network === 'mainnet' 
      ? process.env.HEDERA_MAINNET_ACCOUNT_ID!
      : process.env.HEDERA_TESTNET_ACCOUNT_ID!;
    const operatorPrivateKey = network === 'mainnet'
      ? process.env.HEDERA_MAINNET_PRIVATE_KEY!
      : process.env.HEDERA_TESTNET_PRIVATE_KEY!;
    const kyrngTokenId = network === 'mainnet'
      ? process.env.NEXT_PUBLIC_MAINNET_KYRNG!
      : process.env.NEXT_PUBLIC_TESTNET_KYRNG!;

    if (!operatorAccountId || !operatorPrivateKey) {
      console.error('[API] Missing operator credentials');
      return NextResponse.json({
        error: 'Server configuration error'
      }, { status: 500 });
    }

    if (!kyrngTokenId) {
      console.error('[API] Missing LYNX token ID');
      return NextResponse.json({
        error: 'LYNX token not configured'
      }, { status: 500 });
    }

    // Initialize Hedera client
    const client = network === 'mainnet' 
      ? Client.forMainnet()
      : Client.forTestnet();
    
    client.setOperator(operatorAccountId, operatorPrivateKey);

    console.log('[API] Transferring', totalAmount, 'LYNX to', accountId);

    // Transfer LYNX tokens
    // Note: Token amounts need to be in the smallest unit (considering decimals)
    // Assuming KYRNG has 8 decimals like most Hedera tokens
    const amountInSmallestUnit = Math.floor(totalAmount * 100000000); // 8 decimals

    let transferTx;
    try {
      transferTx = await new TransferTransaction()
        .addTokenTransfer(TokenId.fromString(kyrngTokenId), AccountId.fromString(operatorAccountId), -amountInSmallestUnit)
        .addTokenTransfer(TokenId.fromString(kyrngTokenId), AccountId.fromString(accountId), amountInSmallestUnit)
        .execute(client);

      const receipt = await transferTx.getReceipt(client);

      if (receipt.status.toString() !== 'SUCCESS') {
        throw new Error('Token transfer failed');
      }
    } catch (transferError: any) {
      // Check if it's a token association error
      if (transferError.message?.includes('TOKEN_NOT_ASSOCIATED')) {
        return NextResponse.json({
          error: 'Token not associated with account. Please associate the LYNX token first.',
          code: 'TOKEN_NOT_ASSOCIATED'
        }, { status: 400 });
      }
      throw transferError;
    }

    console.log('[API] Transfer successful:', transferTx.transactionId.toString());

    // Update all pending rewards to 'paid'
    const rewardIds = pendingRewards.map((r: any) => r.id);
    console.log('[API] Updating rewards to paid status:', rewardIds);
    
    let successCount = 0;
    let failCount = 0;
    
    for (const rewardId of rewardIds) {
      console.log('[API] Updating reward:', rewardId);
      const result = await KeyRingDB.updateRewardStatus(rewardId, 'paid');
      
      if (result.success) {
        successCount++;
        console.log('[API] Successfully updated reward:', rewardId);
      } else {
        failCount++;
        console.error('[API] Failed to update reward:', rewardId, result.error);
      }
    }

    console.log('[API] Updated', successCount, 'rewards to paid status,', failCount, 'failed');

    return NextResponse.json({
      success: true,
      amount: totalAmount,
      transactionId: transferTx.transactionId.toString(),
      rewardsPaid: rewardIds.length
    });

  } catch (error: any) {
    console.error('[API] Failed to claim rewards:', error);
    return NextResponse.json({
      error: error.message || 'Failed to claim rewards'
    }, { status: 500 });
  }
}

