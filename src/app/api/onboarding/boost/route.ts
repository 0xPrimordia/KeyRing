import { NextRequest, NextResponse } from 'next/server';
import {
  Client,
  PrivateKey,
  PublicKey,
  AccountCreateTransaction,
  AccountId,
  KeyList,
  Hbar,
  ScheduleCreateTransaction,
  TransferTransaction,
  Timestamp,
} from '@hashgraph/sdk';
import { supabase } from '../../../../../lib/supabase';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const BOOST_DESCRIPTIONS = [
  'Boost: Verify your signing capabilities',
  'Boost: Confirm threshold key participation',
  'Boost: Complete onboarding multi-sig exercise',
];

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  try {
    const { accountId, publicKey } = await request.json();

    if (!accountId || !publicKey) {
      return NextResponse.json(
        { success: false, error: 'accountId and publicKey are required' },
        { status: 400 }
      );
    }

    console.log('[BOOST] Starting onboarding boost for:', accountId);

    const operatorId = process.env.HEDERA_MAINNET_ACCOUNT_ID;
    const operatorKey = process.env.HEDERA_MAINNET_PRIVATE_KEY;

    if (!operatorId || !operatorKey) {
      console.error('[BOOST] Missing mainnet operator credentials');
      return NextResponse.json(
        { success: false, error: 'Server configuration error' },
        { status: 500 }
      );
    }

    const client = Client.forMainnet();
    const privateKey = PrivateKey.fromStringED25519(operatorKey);
    client.setOperator(operatorId, privateKey);
    client.setDefaultMaxTransactionFee(new Hbar(5));

    const userPublicKey = PublicKey.fromStringED25519(publicKey);

    // 1. Create 1-of-1 threshold account with user's key
    console.log('[BOOST] Creating threshold account...');
    const thresholdKey = new KeyList([userPublicKey], 1);

    const createTx = new AccountCreateTransaction()
      .setKey(thresholdKey)
      .setInitialBalance(new Hbar(1))
      .setAccountMemo(`KeyRing Boost - ${accountId}`);

    const createResponse = await createTx.execute(client);
    const createReceipt = await createResponse.getReceipt(client);
    const thresholdAccountId = createReceipt.accountId;

    if (!thresholdAccountId) {
      throw new Error('Failed to create threshold account');
    }

    console.log('[BOOST] Threshold account created:', thresholdAccountId.toString());

    // 2. Register threshold list + membership in DB
    const signerId = await getSignerId(accountId);

    const { data: listRecord, error: listError } = await supabase
      .from('keyring_threshold_lists')
      .insert({
        hcs_topic_id: `boost-${accountId}`,
        threshold_account_id: thresholdAccountId.toString(),
        status: 'active',
      })
      .select()
      .single();

    if (listError) {
      console.error('[BOOST] Failed to register threshold list:', listError);
    } else if (signerId && listRecord) {
      const { error: memberError } = await supabase
        .from('keyring_list_memberships')
        .insert({
          signer_id: signerId,
          list_id: listRecord.id,
          status: 'active',
        });

      if (memberError) {
        console.error('[BOOST] Failed to add membership:', memberError);
      }
    }

    // 3. Create 3 scheduled transfer transactions
    const scheduleIds: string[] = [];
    const operatorAccountId = AccountId.fromString(operatorId);

    for (let i = 0; i < 3; i++) {
      try {
        const innerTx = new TransferTransaction()
          .addHbarTransfer(thresholdAccountId, new Hbar(-0.01))
          .addHbarTransfer(operatorAccountId, new Hbar(0.01))
          .setTransactionMemo(BOOST_DESCRIPTIONS[i]);

        const expirationTime = Timestamp.fromDate(
          new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
        );

        const scheduleTx = new ScheduleCreateTransaction()
          .setScheduledTransaction(innerTx)
          .setPayerAccountId(thresholdAccountId)
          .setAdminKey(privateKey)
          .setExpirationTime(expirationTime)
          .setScheduleMemo(BOOST_DESCRIPTIONS[i])
          .setWaitForExpiry(false);

        const scheduleResponse = await scheduleTx.execute(client);
        const scheduleReceipt = await scheduleResponse.getReceipt(client);
        const scheduleId = scheduleReceipt.scheduleId;

        if (scheduleId) {
          scheduleIds.push(scheduleId.toString());
          console.log(`[BOOST] Schedule ${i + 1}/3 created:`, scheduleId.toString());

          await supabase.from('keyring_schedule_history').upsert(
            {
              schedule_id: scheduleId.toString(),
              project_name: 'KeyRing Boost',
              memo: BOOST_DESCRIPTIONS[i],
              payer_account_id: thresholdAccountId.toString(),
              creator_account_id: operatorId,
              threshold_account_id: thresholdAccountId.toString(),
              status: 'pending' as const,
              signature_count: 0,
              threshold_required: 1,
            },
            { onConflict: 'schedule_id' }
          );
        }
      } catch (scheduleError) {
        console.error(`[BOOST] Failed to create schedule ${i + 1}:`, scheduleError);
      }
    }

    client.close();

    const elapsed = Date.now() - startTime;
    console.log(`[BOOST] Onboarding complete in ${elapsed}ms:`, {
      thresholdAccount: thresholdAccountId.toString(),
      schedules: scheduleIds.length,
    });

    return NextResponse.json({
      success: true,
      thresholdAccountId: thresholdAccountId.toString(),
      scheduleIds,
    });
  } catch (error) {
    console.error('[BOOST] Onboarding boost failed:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

async function getSignerId(accountId: string): Promise<string | null> {
  const { data } = await supabase
    .from('keyring_signers')
    .select('id')
    .eq('account_id', accountId)
    .eq('account_type', 'hedera')
    .single();
  return data?.id ?? null;
}
