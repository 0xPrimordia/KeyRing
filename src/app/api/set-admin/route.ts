/**
 * POST /api/set-admin
 * Creates a scheduled transaction to call setAdmin(newAdmin) on the contract.
 * Payer = current admin threshold. Sends HCS message to OPERATOR_INBOUND_TOPIC_ID.
 * Returns immediately after creating the schedule. Threshold signers must sign
 * via the signer dashboard for the schedule to execute.
 *
 * Body: { contractId, newAdminThresholdAccountId, currentAdminThresholdAccountId, projectId? }
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  Client,
  PrivateKey,
  AccountId,
  ContractId,
  ContractExecuteTransaction,
  ContractFunctionParameters,
  ScheduleCreateTransaction,
  TopicMessageSubmitTransaction,
  Timestamp,
} from '@hashgraph/sdk';
import { KeyRingDB } from '../../../../lib/keyring-db';

function getOperatorCredentials(): { accountId: string; privateKey: string } {
  const network = process.env.NEXT_PUBLIC_HEDERA_NETWORK || 'testnet';
  const accountId =
    network === 'mainnet'
      ? process.env.HEDERA_MAINNET_ACCOUNT_ID
      : process.env.HEDERA_TESTNET_ACCOUNT_ID;
  const privateKey =
    network === 'mainnet'
      ? process.env.HEDERA_MAINNET_PRIVATE_KEY
      : process.env.HEDERA_TESTNET_PRIVATE_KEY;
  if (!accountId || !privateKey) {
    throw new Error(
      'HEDERA_TESTNET_ACCOUNT_ID/HEDERA_TESTNET_PRIVATE_KEY (or mainnet equivalents) required'
    );
  }
  return { accountId, privateKey };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const contractId = body?.contractId as string | undefined;
    const newAdminThresholdAccountId =
      body?.newAdminThresholdAccountId as string | undefined;
    const currentAdminThresholdAccountId =
      body?.currentAdminThresholdAccountId as string | undefined;
    const projectId = body?.projectId as string | undefined;

    if (
      !contractId ||
      !newAdminThresholdAccountId ||
      !currentAdminThresholdAccountId
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            'contractId, newAdminThresholdAccountId, and currentAdminThresholdAccountId are required',
        },
        { status: 400 }
      );
    }

    if (
      !contractId.match(/^\d+\.\d+\.\d+$/) ||
      !newAdminThresholdAccountId.match(/^\d+\.\d+\.\d+$/) ||
      !currentAdminThresholdAccountId.match(/^\d+\.\d+\.\d+$/)
    ) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid format (expected 0.0.xxxxx for all IDs)',
        },
        { status: 400 }
      );
    }

    const topicId = process.env.OPERATOR_INBOUND_TOPIC_ID;
    if (!topicId || !topicId.match(/^\d+\.\d+\.\d+$/)) {
      return NextResponse.json(
        { success: false, error: 'OPERATOR_INBOUND_TOPIC_ID not configured' },
        { status: 500 }
      );
    }

    const { accountId, privateKey } = getOperatorCredentials();
    const network =
      process.env.NEXT_PUBLIC_HEDERA_NETWORK || 'testnet';
    const client =
      network === 'mainnet'
        ? Client.forMainnet()
        : Client.forTestnet();
    client.setOperator(accountId, PrivateKey.fromString(privateKey));

    const newAdminAddress = `0x${AccountId.fromString(
      newAdminThresholdAccountId
    ).toSolidityAddress()}`;

    const contractCall = new ContractExecuteTransaction()
      .setContractId(ContractId.fromString(contractId))
      .setGas(200000)
      .setFunction(
        'setAdmin',
        new ContractFunctionParameters().addAddress(newAdminAddress)
      );

    const scheduleTx = new ScheduleCreateTransaction()
      .setScheduledTransaction(contractCall)
      .setPayerAccountId(
        AccountId.fromString(currentAdminThresholdAccountId)
      )
      .setScheduleMemo(`SetAdmin: ${newAdminThresholdAccountId}`)
      .setExpirationTime(
        Timestamp.fromDate(new Date(Date.now() + 24 * 60 * 60 * 1000))
      )
      .setWaitForExpiry(false);

    const scheduleTxSigned = await scheduleTx.execute(client);
    const scheduleReceipt = await scheduleTxSigned.getReceipt(client);
    const scheduleId = scheduleReceipt.scheduleId;
    if (!scheduleId) {
      throw new Error('Schedule creation failed - no schedule ID');
    }

    const hcs2Message = {
      p: 'hcs-2',
      op: 'setAdmin',
      scheduleId: scheduleId.toString(),
      contractId,
      newAdmin: newAdminThresholdAccountId,
      currentAdmin: currentAdminThresholdAccountId,
      m: `Set admin schedule ${scheduleId} for contract ${contractId}`,
    };

    const topicMsg = new TopicMessageSubmitTransaction()
      .setTopicId(topicId)
      .setMessage(JSON.stringify(hcs2Message));

    const topicTxResponse = await topicMsg.execute(client);
    await topicTxResponse.getReceipt(client);
    client.close();

    // When projectId is provided, record the pending migration so the UI can show status
    if (projectId && /^[0-9a-f-]{36}$/i.test(projectId)) {
      await KeyRingDB.updateProject(projectId, {
        migrationThresholdAccountId: newAdminThresholdAccountId,
        migrationScheduleId: scheduleId.toString(),
      });
    }

    return NextResponse.json({
      success: true,
      scheduleId: scheduleId.toString(),
      hcsTransactionId: topicTxResponse.transactionId.toString(),
      executed: false,
      message:
        'Schedule created and HCS message sent. Threshold signers must sign via the signer dashboard to execute.',
    });
  } catch (error) {
    console.error('[set-admin] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to create setAdmin schedule',
      },
      { status: 500 }
    );
  }
}
