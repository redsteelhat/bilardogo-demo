'use client';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { useEffect, useRef } from 'react';
import { getSupabaseBrowser } from './supabase/client';

/**
 * Supabase Realtime yayınını dinler. Veritabanı trigger'ları yalnız "değişti" sinyali yollar;
 * bileşen sinyal gelince ilgili tRPC sorgusunu yeniler (invalidate).
 *
 * Kanallar: `venue:<id>` (herkese açık), `city:<plate>` (açık), `user:<id>`, `conv:<id>`, `order:<id>`,
 * `venue:<id>:staff` (özel; RLS ile yetkilendirilir).
 */
export function useRealtime(
  topic: string | null | undefined,
  events: string[],
  onSignal: (event: string, payload: Record<string, unknown>) => void,
  opts: { private?: boolean } = {},
) {
  const handler = useRef(onSignal);
  handler.current = onSignal;
  const eventsKey = events.join(',');
  useEffect(() => {
    if (!topic || !process.env.NEXT_PUBLIC_SUPABASE_URL) return;
    const supabase = getSupabaseBrowser();
    let channel: RealtimeChannel | null = null;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    // Aynı anda gelen çok sayıda sinyali tek yenilemeye indir
    const pending = new Map<string, Record<string, unknown>>();
    const flush = () => {
      timer = null;
      for (const [ev, payload] of pending) handler.current(ev, payload);
      pending.clear();
    };
    (async () => {
      if (opts.private) await supabase.realtime.setAuth();
      if (cancelled) return;
      channel = supabase.channel(topic, { config: { private: !!opts.private } });
      for (const ev of eventsKey.split(',')) {
        channel.on('broadcast', { event: ev }, (msg) => {
          pending.set(ev, (msg.payload ?? {}) as Record<string, unknown>);
          if (!timer) timer = setTimeout(flush, 250);
        });
      }
      channel.subscribe();
    })();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      if (channel) void supabase.removeChannel(channel);
    };
  }, [topic, eventsKey, opts.private]);
}
