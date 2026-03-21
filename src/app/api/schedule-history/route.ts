import { NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';
import { fetchScheduleFromMirrorNode } from '../../../../lib/mirror-node';

/**
 * GET /api/schedule-history
 * Returns all schedule history entries, refreshing execution status from Mirror Node.
 */
export async function GET() {
  try {
    const { data: schedules, error } = await supabase
      .from('keyring_schedule_history')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[API] Error fetching schedule history:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch schedule history' },
        { status: 500 }
      );
    }

    const pendingSchedules = (schedules || []).filter(
      (s) => s.status === 'pending'
    );

    const refreshed = await Promise.all(
      pendingSchedules.map(async (schedule) => {
        const mirrorData = await fetchScheduleFromMirrorNode(
          schedule.schedule_id
        );
        if (!mirrorData) return schedule;

        const sigCount = mirrorData.signatures?.length ?? 0;
        let newStatus: 'pending' | 'executed' | 'expired' | 'deleted' =
          'pending';
        let executedAt: string | null = null;

        if (mirrorData.executed_timestamp) {
          newStatus = 'executed';
          const ts = parseFloat(mirrorData.executed_timestamp);
          executedAt = new Date(ts * 1000).toISOString();
        } else if (mirrorData.deleted) {
          newStatus = 'deleted';
        } else if (mirrorData.expiration_time) {
          const expSec = parseFloat(mirrorData.expiration_time);
          if (!isNaN(expSec) && Date.now() > expSec * 1000) {
            newStatus = 'expired';
          }
        }

        if (
          newStatus !== schedule.status ||
          sigCount !== schedule.signature_count
        ) {
          await supabase
            .from('keyring_schedule_history')
            .update({
              status: newStatus,
              signature_count: sigCount,
              executed_at: executedAt,
            })
            .eq('id', schedule.id);

          return {
            ...schedule,
            status: newStatus,
            signature_count: sigCount,
            executed_at: executedAt,
          };
        }

        return schedule;
      })
    );

    const refreshedMap = new Map(
      refreshed.map((s) => [s.id, s])
    );
    const finalSchedules = (schedules || []).map(
      (s) => refreshedMap.get(s.id) ?? s
    );

    return NextResponse.json({ success: true, schedules: finalSchedules });
  } catch (error) {
    console.error('[API] Error in schedule history:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch schedule history' },
      { status: 500 }
    );
  }
}
