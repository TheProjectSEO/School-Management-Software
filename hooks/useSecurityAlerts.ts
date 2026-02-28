'use client';

import { useEffect, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { RealtimeChannel, RealtimePostgresInsertPayload } from '@supabase/supabase-js';

export interface SecurityAlert {
  id: string;
  user_id: string;
  attacker_ip: string | null;
  attacker_ua: string | null;
  is_read: boolean;
  created_at: string;
}

interface UseSecurityAlertsOptions {
  onAlert: (alert: SecurityAlert) => void;
}

/**
 * Subscribes to user_security_alerts via Supabase Realtime.
 * Fires onAlert whenever a new blocked-login event is recorded for this user.
 */
export function useSecurityAlerts(userId: string | null, { onAlert }: UseSecurityAlertsOptions) {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const supabaseRef = useRef(createClient());
  const onAlertRef = useRef(onAlert);

  // Keep callback ref up-to-date without re-subscribing
  useEffect(() => {
    onAlertRef.current = onAlert;
  }, [onAlert]);

  const markRead = useCallback(async (alertId: string) => {
    await supabaseRef.current
      .from('user_security_alerts')
      .update({ is_read: true })
      .eq('id', alertId);
  }, []);

  useEffect(() => {
    if (!userId) return;

    const supabase = supabaseRef.current;

    const channel = supabase
      .channel(`security-alerts:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'user_security_alerts',
          filter: `user_id=eq.${userId}`,
        },
        (payload: RealtimePostgresInsertPayload<SecurityAlert>) => {
          onAlertRef.current(payload.new as SecurityAlert);
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [userId]);

  return { markRead };
}
