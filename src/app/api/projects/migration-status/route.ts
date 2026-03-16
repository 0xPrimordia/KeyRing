/**
 * GET /api/projects/migration-status?projectId=uuid
 *
 * Polls migration status for a project that has migration_threshold_account_id and
 * migration_schedule_id set. When the schedule has executed and the underlying
 * transaction succeeded (no revert), updates admin_threshold_account_id and clears
 * migration fields.
 *
 * Call this when migration fields are present. Polling should not be aggressive
 * (e.g. every 60-90 seconds) since the switch takes several minutes.
 */

import { NextRequest, NextResponse } from 'next/server';
import { KeyRingDB } from '../../../../../lib/keyring-db';

function getMirrorNodeUrl(): string {
  const network = process.env.NEXT_PUBLIC_HEDERA_NETWORK || 'testnet';
  return network === 'mainnet'
    ? 'https://mainnet.mirrornode.hedera.com'
    : 'https://testnet.mirrornode.hedera.com';
}

interface MirrorSchedule {
  schedule_id: string;
  creator_account_id: string;
  payer_account_id: string;
  executed_timestamp: string | null;
  memo?: string;
}

interface MirrorTransaction {
  transactions?: Array<{
    transaction_id: string;
    result: string;
    consensus_timestamp: string;
    scheduled?: boolean;
  }>;
}

export async function GET(request: NextRequest) {
  try {
    const projectId = request.nextUrl.searchParams.get('projectId');
    if (!projectId || !/^[0-9a-f-]{36}$/i.test(projectId)) {
      return NextResponse.json(
        { success: false, error: 'Valid projectId (UUID) is required' },
        { status: 400 }
      );
    }

    const project = await KeyRingDB.getProjectById(projectId);
    if (!project) {
      return NextResponse.json(
        { success: false, error: 'Project not found' },
        { status: 404 }
      );
    }

    const migrationScheduleId = (project as { migration_schedule_id?: string | null }).migration_schedule_id;
    const migrationThresholdAccountId = (project as { migration_threshold_account_id?: string | null }).migration_threshold_account_id;

    if (!migrationScheduleId || !migrationThresholdAccountId) {
      return NextResponse.json({
        success: true,
        pending: false,
        message: 'No migration pending',
      });
    }

    const mirrorNodeUrl = getMirrorNodeUrl();
    const scheduleRes = await fetch(`${mirrorNodeUrl}/api/v1/schedules/${migrationScheduleId}`);
    if (!scheduleRes.ok) {
      return NextResponse.json(
        { success: false, error: `Failed to fetch schedule: ${scheduleRes.status}` },
        { status: 502 }
      );
    }

    const schedule = (await scheduleRes.json()) as MirrorSchedule;
    if (!schedule.executed_timestamp) {
      return NextResponse.json({
        success: true,
        pending: true,
        scheduleId: migrationScheduleId,
        migrationThresholdAccountId,
        message: 'Schedule pending execution',
      });
    }

    // Schedule has executed - verify the child transaction did not revert
    // Child tx ID format: payer-seconds-nanos (Mirror Node uses dashes)
    const [seconds, nanos = '0'] = schedule.executed_timestamp.split('.');
    const nanosPadded = nanos.padEnd(9, '0').slice(0, 9);
    const childTxId = `${schedule.payer_account_id}-${seconds}-${nanosPadded}`;

    const txRes = await fetch(
      `${mirrorNodeUrl}/api/v1/transactions/${encodeURIComponent(childTxId)}?scheduled=true`
    );
    if (!txRes.ok) {
      // Child tx might not be indexed yet - treat as still pending
      return NextResponse.json({
        success: true,
        pending: true,
        scheduleId: migrationScheduleId,
        migrationThresholdAccountId,
        executedTimestamp: schedule.executed_timestamp,
        message: 'Schedule executed, verifying transaction...',
      });
    }

    const txData = (await txRes.json()) as MirrorTransaction;
    const tx = txData.transactions?.[0];
    const result = tx?.result;

    if (result !== 'SUCCESS') {
      // Schedule executed but transaction reverted - clear migration fields, do not update admin
      await KeyRingDB.updateProject(projectId, {
        migrationThresholdAccountId: null,
        migrationScheduleId: null,
      });
      return NextResponse.json({
        success: true,
        pending: false,
        completed: false,
        reverted: true,
        scheduleId: migrationScheduleId,
        message: 'Schedule executed but transaction reverted. Migration fields cleared.',
      });
    }

    // Success - update admin and clear migration fields
    await KeyRingDB.updateProject(projectId, {
      adminThresholdAccountId: migrationThresholdAccountId,
      migrationThresholdAccountId: null,
      migrationScheduleId: null,
    });

    return NextResponse.json({
      success: true,
      pending: false,
      completed: true,
      scheduleId: migrationScheduleId,
      migrationThresholdAccountId,
      newAdminThresholdAccountId: migrationThresholdAccountId,
      message: 'Migration completed. Admin threshold updated.',
    });
  } catch (error) {
    console.error('[migration-status] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to check migration status',
      },
      { status: 500 }
    );
  }
}
