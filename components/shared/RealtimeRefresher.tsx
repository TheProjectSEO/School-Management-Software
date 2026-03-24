"use client";

/**
 * RealtimeRefresher — zero-UI client component
 *
 * Subscribes to one or more Supabase tables and calls `router.refresh()`
 * whenever a row is inserted, updated or deleted.
 *
 * Drop it inside any server-rendered page to make it "live" without
 * converting the whole page to a client component.
 *
 * Usage:
 *   <RealtimeRefresher tables={['submissions', 'assessments']} />
 *   <RealtimeRefresher tables={['grades']} debounceMs={2000} />
 */

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

interface Props {
  /** Table names to watch (public schema). */
  tables: string[];
  /**
   * Milliseconds to debounce rapid bursts of changes before refreshing.
   * Default: 800ms — prevents hammering the server on bulk inserts.
   */
  debounceMs?: number;
}

export function RealtimeRefresher({ tables, debounceMs = 800 }: Props) {
  const router = useRouter();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!tables.length) return;

    const supabase = createClient();
    const channels: RealtimeChannel[] = [];

    function scheduleRefresh() {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        router.refresh();
      }, debounceMs);
    }

    tables.forEach((table) => {
      const ch = supabase
        .channel(`realtime-refresh:${table}:${Math.random().toString(36).slice(2)}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table },
          scheduleRefresh
        )
        .subscribe();
      channels.push(ch);
    });

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      channels.forEach((c) => supabase.removeChannel(c));
    };
  }, [debounceMs, router]); // tables is stable at mount time

  return null;
}
