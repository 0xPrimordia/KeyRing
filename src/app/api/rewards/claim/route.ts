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

    const pendingRewards = rewardsResult.rewards.filter((r: { status?: string }) => r.status === 'pending');
    
    if (pendingRewards.length === 0) {
      return NextResponse.json({
        error: 'No pending rewards to claim'
      }, { status: 400 });
    }

    const byCurrency = (currency: string) =>
      pendingRewards.filter((r: { currency?: string }) => (r.currency || 'KYRNG') === currency);
    const keyringRewards = byCurrency('KYRNG');
    const lynxRewards = byCurrency('LYNX');
    const keyringAmount = keyringRewards.reduce((s: number, r: { amount?: number }) => s + parseFloat(String(r.amount || 0)), 0);
    const lynxAmount = lynxRewards.reduce((s: number, r: { amount?: number }) => s + parseFloat(String(r.amount || 0)), 0);

    console.log('[API] Pending rewards:', { keyring: keyringAmount, lynx: lynxAmount });

    const network = process.env.NEXT_PUBLIC_HEDERA_NETWORK === 'mainnet' ? 'mainnet' : 'testnet';
    const operatorAccountId = network === 'mainnet'
      ? process.env.HEDERA_MAINNET_ACCOUNT_ID!
      : process.env.HEDERA_TESTNET_ACCOUNT_ID!;
    const operatorPrivateKey = network === 'mainnet'
      ? process.env.HEDERA_MAINNET_PRIVATE_KEY!
      : process.env.HEDERA_TESTNET_PRIVATE_KEY!;
    const kyrngTokenId = network === 'mainnet'
      ? process.env.NEXT_PUBLIC_MAINNET_KYRNG
      : process.env.NEXT_PUBLIC_TESTNET_KYRNG;
    const lynxTokenId = network === 'mainnet'
      ? process.env.NEXT_PUBLIC_MAINNET_LYNX
      : process.env.NEXT_PUBLIC_TESTNET_LYNX;

    if (!operatorAccountId || !operatorPrivateKey) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    if (keyringAmount > 0 && !kyrngTokenId) {
      return NextResponse.json({ error: 'Keyring token not configured' }, { status: 500 });
    }
    if (lynxAmount > 0 && !lynxTokenId) {
      return NextResponse.json({ error: 'LYNX token not configured' }, { status: 500 });
    }

    const client = network === 'mainnet' ? Client.forMainnet() : Client.forTestnet();
    client.setOperator(operatorAccountId, operatorPrivateKey);

    const transactionIds: string[] = [];
    const decimals = 100000000;

    if (keyringAmount > 0 && kyrngTokenId) {
      const amountInSmallestUnit = Math.floor(keyringAmount * decimals);
      const transferTx = await new TransferTransaction()
        .addTokenTransfer(TokenId.fromString(kyrngTokenId), AccountId.fromString(operatorAccountId), -amountInSmallestUnit)
        .addTokenTransfer(TokenId.fromString(kyrngTokenId), AccountId.fromString(accountId), amountInSmallestUnit)
        .execute(client);
      const receipt = await transferTx.getReceipt(client);
      if (receipt.status.toString() !== 'SUCCESS') throw new Error('Keyring transfer failed');
      transactionIds.push(transferTx.transactionId.toString());
      console.log('[API] Keyring transfer successful:', transferTx.transactionId.toString());
    }

    if (lynxAmount > 0 && lynxTokenId) {
      const amountInSmallestUnit = Math.floor(lynxAmount * decimals);
      const transferTx = await new TransferTransaction()
        .addTokenTransfer(TokenId.fromString(lynxTokenId), AccountId.fromString(operatorAccountId), -amountInSmallestUnit)
        .addTokenTransfer(TokenId.fromString(lynxTokenId), AccountId.fromString(accountId), amountInSmallestUnit)
        .execute(client);
      const receipt = await transferTx.getReceipt(client);
      if (receipt.status.toString() !== 'SUCCESS') throw new Error('LYNX transfer failed');
      transactionIds.push(transferTx.transactionId.toString());
      console.log('[API] LYNX transfer successful:', transferTx.transactionId.toString());
    }

    const rewardIds = pendingRewards.map((r: { id?: string }) => r.id);
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
      amount: keyringAmount + lynxAmount,
      keyring: keyringAmount,
      lynx: lynxAmount,
      transactionId: transactionIds[0] ?? '',
      transactionIds,
      rewardsPaid: rewardIds.length
    });

  } catch (error: any) {
    console.error('[API] Failed to claim rewards:', error);
    return NextResponse.json({
      error: error.message || 'Failed to claim rewards'
    }, { status: 500 });
  }
}

