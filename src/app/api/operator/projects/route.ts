import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../../../lib/supabase';

interface HCS2ProjectMessage {
  p: string;
  op: string;
  t_id: string;
  metadata: {
    company_name?: string;
    legal_entity_name?: string;
    public_record_url?: string;
    owners?: string[];
    description?: string;
    website?: string;
    hederaAccountId?: string;
    [key: string]: unknown;
  };
  m?: string;
}

export const dynamic = 'force-dynamic';

/**
 * GET /api/operator/projects?accountId=0.0.xxxxx
 * Fetches projects from HCS project registry topic where t_id matches the operator account.
 * Merges with DB data for threshold lists.
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const accountId = searchParams.get('accountId');

    if (!accountId || !accountId.match(/^\d+\.\d+\.\d+$/)) {
      return NextResponse.json(
        { success: false, error: 'Valid accountId (0.0.xxxxx) is required' },
        { status: 400 }
      );
    }

    const network = process.env.NEXT_PUBLIC_HEDERA_NETWORK || 'testnet';
    const mirrorNodeUrl =
      network === 'mainnet'
        ? 'https://mainnet.mirrornode.hedera.com'
        : 'https://testnet.mirrornode.hedera.com';

    const topicEnvVar =
      network === 'mainnet'
        ? 'PROJECT_REGISTRY_TOPIC_MAINNET'
        : 'PROJECT_REGISTRY_TOPIC_TESTNET';
    const topicId = process.env[topicEnvVar];

    if (!topicId || topicId === '0.0.0') {
      return NextResponse.json({
        success: true,
        projects: [],
        message: 'Project registry topic not configured',
      });
    }

    // Fetch messages from HCS project registry topic
    const url = `${mirrorNodeUrl}/api/v1/topics/${topicId}/messages?limit=100&order=desc`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Mirror node request failed: ${response.status}`);
    }

    const data = await response.json();
    const messages = data.messages || [];

    // Parse HCS-2 messages and filter for this operator's projects (t_id matches)
    const hcsProjects: Array<{
      transactionId: string;
      consensusTimestamp: string;
      companyName: string;
      legalEntityName: string;
      publicRecordUrl?: string;
      owners?: string[];
      metadata: Record<string, unknown>;
    }> = [];

    for (const msg of messages) {
      try {
        const decoded = Buffer.from(msg.message, 'base64').toString('utf-8');
        const parsed = JSON.parse(decoded) as HCS2ProjectMessage;

        if (parsed.p !== 'hcs-2' || parsed.op !== 'register') continue;
        if (parsed.t_id !== accountId) continue;

        const meta = parsed.metadata || {};
        hcsProjects.push({
          transactionId: msg.transaction_id || '',
          consensusTimestamp: msg.consensus_timestamp || '',
          companyName: meta.company_name || 'Unknown',
          legalEntityName: meta.legal_entity_name || meta.company_name || 'Unknown',
          publicRecordUrl: meta.public_record_url,
          owners: meta.owners,
          metadata: meta,
        });
      } catch {
        // Skip malformed messages
      }
    }

    // Fetch DB projects and threshold lists for matching
    const { data: dbProjects } = await supabase
      .from('keyring_projects')
      .select(
        `
        id,
        company_name,
        legal_entity_name,
        public_record_url,
        owners,
        topic_message_id,
        admin_threshold_account_id,
        migration_threshold_account_id,
        migration_schedule_id,
        contracts,
        keyring_threshold_lists (
          id,
          hcs_topic_id,
          threshold_account_id,
          status,
          created_at
        )
      `
      )
      .order('created_at', { ascending: false });

    // Build project list: prefer HCS data, enrich with DB threshold lists where company matches
    const projectMap = new Map<
      string,
      {
        id: string;
        companyName: string;
        legalEntityName: string;
        publicRecordUrl?: string;
        owners?: string[];
        transactionId: string;
        consensusTimestamp: string;
        metadata: Record<string, unknown>;
        contractId?: string;
        contractHashscanUrl?: string;
        contracts?: string[];
        adminThresholdAccountId?: string;
        migrationThresholdAccountId?: string;
        migrationScheduleId?: string;
        thresholdLists: Array<{
          id: string;
          hcsTopicId: string;
          thresholdAccountId: string;
          status: string;
          createdAt: string;
          threshold?: number;
          totalKeys?: number;
          adminDisplay?: string;
          isCurrentAdmin?: boolean;
        }>;
      }
    >();

    const normalize = (s: string | undefined) =>
      (s ?? '').trim().toLowerCase();

    for (const hcs of hcsProjects) {
      const key = `${hcs.companyName}-${hcs.legalEntityName}`;
      const dbMatch = dbProjects?.find(
        (p) =>
          normalize(p.company_name) === normalize(hcs.companyName) &&
          normalize(p.legal_entity_name) === normalize(hcs.legalEntityName)
      );

      const lists = (dbMatch?.keyring_threshold_lists as Array<{
        id: string;
        hcs_topic_id: string;
        threshold_account_id: string;
        status: string;
        created_at: string;
      }>) || [];

      const dbContracts = (dbMatch as { contracts?: string[] | null } | undefined)?.contracts;
      const contractId = dbContracts && dbContracts.length > 0 ? dbContracts[0] : undefined;
      const hashscanUrl = contractId
        ? `${network === 'mainnet' ? 'https://hashscan.io/mainnet' : 'https://hashscan.io/testnet'}/contract/${contractId}`
        : undefined;

      const adminThresholdAccountId = (dbMatch as { admin_threshold_account_id?: string } | undefined)?.admin_threshold_account_id;
      const migrationThresholdAccountId = (dbMatch as { migration_threshold_account_id?: string } | undefined)?.migration_threshold_account_id;
      const migrationScheduleId = (dbMatch as { migration_schedule_id?: string } | undefined)?.migration_schedule_id;

      projectMap.set(key, {
        id: dbMatch?.id || hcs.transactionId,
        companyName: hcs.companyName,
        legalEntityName: hcs.legalEntityName,
        publicRecordUrl: hcs.publicRecordUrl,
        owners: hcs.owners,
        transactionId: hcs.transactionId,
        consensusTimestamp: hcs.consensusTimestamp,
        metadata: hcs.metadata,
        contractId: contractId || undefined,
        contractHashscanUrl: hashscanUrl || undefined,
        contracts: dbContracts && dbContracts.length > 0 ? dbContracts : undefined,
        adminThresholdAccountId: adminThresholdAccountId ?? undefined,
        migrationThresholdAccountId: migrationThresholdAccountId ?? undefined,
        migrationScheduleId: migrationScheduleId ?? undefined,
        thresholdLists: lists.map((l) => ({
          id: l.id,
          hcsTopicId: l.hcs_topic_id,
          thresholdAccountId: l.threshold_account_id,
          status: l.status,
          createdAt: l.created_at,
        })),
      });
    }

    // Include env-configured threshold list (e.g. THRESHOLD_LIST_ACCOUNT_TESTNET) for operator
    const configListEnvVar =
      network === 'mainnet'
        ? 'THRESHOLD_LIST_ACCOUNT_MAINNET'
        : 'THRESHOLD_LIST_ACCOUNT_TESTNET';
    const configThresholdAccountId = process.env[configListEnvVar];

    if (
      configThresholdAccountId &&
      configThresholdAccountId.match(/^\d+\.\d+\.\d+$/)
    ) {
      const configList = {
        id: `config-${configThresholdAccountId}`,
        hcsTopicId: '', // May not have HCS topic if created via CLI
        thresholdAccountId: configThresholdAccountId,
        status: 'active',
        createdAt: new Date().toISOString(),
      };

      // Add to first project, or create synthetic project if none
      const projectsArray = Array.from(projectMap.values());
      if (projectsArray.length > 0) {
        const first = projectsArray[0];
        const alreadyIncluded = first.thresholdLists.some(
          (l) => l.thresholdAccountId === configThresholdAccountId
        );
        if (!alreadyIncluded) {
          first.thresholdLists.unshift(configList);
        }
      } else {
        projectMap.set('config', {
          id: 'config',
          companyName: 'Operator',
          legalEntityName: 'Configured threshold list',
          publicRecordUrl: undefined,
          owners: undefined,
          transactionId: '',
          consensusTimestamp: '',
          metadata: {},
          contractId: undefined,
          contractHashscanUrl: undefined,
          thresholdLists: [configList],
        });
      }
    }

    // Fetch threshold key details and contract admin from Mirror Node for each list
    const projects = Array.from(projectMap.values());
    for (const project of projects) {
      for (const list of project.thresholdLists) {
        try {
          const accRes = await fetch(
            `${mirrorNodeUrl}/api/v1/accounts/${list.thresholdAccountId}`
          );
          if (accRes.ok) {
            const accData = await accRes.json();
            if (accData.key?._type === 'KeyList') {
              const keys = accData.key.keys || [];
              list.threshold = accData.key.threshold ?? keys.length;
              list.totalKeys = keys.length;
            }
          }
          // If list has no hcsTopicId, check DB for it (in case it was registered)
          if (!list.hcsTopicId) {
            const { data: dbList } = await supabase
              .from('keyring_threshold_lists')
              .select('hcs_topic_id')
              .eq('threshold_account_id', list.thresholdAccountId)
              .single();
            if (dbList?.hcs_topic_id) {
              list.hcsTopicId = dbList.hcs_topic_id;
            }
          }
          // Admin from DB (project.admin_threshold_account_id)
          list.isCurrentAdmin = list.thresholdAccountId === project.adminThresholdAccountId;
          list.adminDisplay = list.isCurrentAdmin
            ? 'This list'
            : (project.adminThresholdAccountId ?? '—');
        } catch {
          // Keep defaults if fetch fails
        }
      }
    }

    return NextResponse.json({
      success: true,
      projects,
    });
  } catch (error) {
    console.error(
      '[API] Error fetching operator projects:',
      error instanceof Error ? error.message : error
    );
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to fetch projects',
      },
      { status: 500 }
    );
  }
}
